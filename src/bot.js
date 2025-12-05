const { Telegraf, Markup } = require('telegraf');
const { UserModel, TopicModel, MaterialModel, AccessModel, ProgressModel, AnswerModel } = require('./database/models');
const config = require('../config.json');

class TelegramBot {
  constructor(token) {
    this.bot = new Telegraf(token);
    this.userStates = new Map(); // Хранение состояния пользователей
    this.setupMiddleware();
    this.setupHandlers();
  }

  setupMiddleware() {
    // Регистрация пользователя при любом взаимодействии
    this.bot.use(async (ctx, next) => {
      if (ctx.from) {
        const user = await UserModel.createUser(
          ctx.from.id,
          ctx.from.username || null,
          null,
          ctx.from.first_name || null,
          ctx.from.last_name || null
        );
        ctx.state.user = user;
      }
      return next();
    });
  }

  setupHandlers() {
    // Команда /start
    this.bot.command('start', async (ctx) => {
      await this.showMainMenu(ctx);
    });

    // Обработка callback запросов
    this.bot.action(/^topic_(\d+)$/, async (ctx) => {
      const topicId = parseInt(ctx.match[1]);
      await this.handleTopicSelection(ctx, topicId);
    });

    this.bot.action('main_menu', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showMainMenu(ctx);
    });

    this.bot.action(/^answer_(\d+)$/, async (ctx) => {
      const materialId = parseInt(ctx.match[1]);
      await ctx.answerCbQuery();
      
      // Устанавливаем состояние ожидания ответа
      this.userStates.set(ctx.from.id, {
        state: 'awaiting_answer',
        materialId: materialId
      });

      await ctx.reply(
        '✍️ Напишите ваш ответ на практическое задание:',
        Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Вернуться в меню', 'main_menu')]
        ])
      );
    });

    // Обработка текстовых сообщений (ответы на задания)
    this.bot.on('text', async (ctx) => {
      const userState = this.userStates.get(ctx.from.id);
      
      if (userState && userState.state === 'awaiting_answer') {
        await this.handleAnswerSubmission(ctx, userState.materialId);
      }
    });

    // Обработка ошибок
    this.bot.catch((err, ctx) => {
      console.error('❌ Bot error:', err);
      ctx.reply('Произошла ошибка. Попробуйте позже или обратитесь к администратору.');
    });
  }

  async showMainMenu(ctx) {
    const user = ctx.state.user;
    const accessibleTopics = await AccessModel.getUserAccessibleTopics(user.id);
    
    if (accessibleTopics.length === 0) {
      const adminList = config.administrators
        .map(admin => `${admin.name} - ${admin.username}`)
        .join('\n');

      await ctx.reply(
        '❌ У вас пока нет доступа к курсам.\n\n' +
        'Для получения доступа обратитесь к одному из администраторов:\n\n' +
        adminList
      );
      return;
    }

    // Проверяем завершенность каждой темы
    const topicsWithStatus = await Promise.all(
      accessibleTopics.map(async (topic) => {
        const isCompleted = await ProgressModel.isTopicCompleted(user.id, topic.id);
        return {
          ...topic,
          isCompleted
        };
      })
    );

    const keyboard = topicsWithStatus.map(topic => {
      const emoji = topic.isCompleted ? '✅ ' : '📚 ';
      return [Markup.button.callback(`${emoji}${topic.title}`, `topic_${topic.id}`)];
    });

    await ctx.reply(
      config.bot.welcome_message,
      Markup.inlineKeyboard(keyboard)
    );
  }

  async handleTopicSelection(ctx, topicId) {
    await ctx.answerCbQuery();
    
    const user = ctx.state.user;
    
    // Проверяем доступ
    const hasAccess = await AccessModel.hasAccess(user.id, topicId);
    if (!hasAccess) {
      await ctx.reply('❌ У вас нет доступа к этой теме.');
      return;
    }

    // Получаем текущий материал для пользователя
    const currentMaterial = await ProgressModel.getCurrentMaterial(user.id, topicId);
    
    if (!currentMaterial) {
      await ctx.reply(
        '🎉 Поздравляем! Вы завершили все материалы в этой теме!',
        Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Вернуться в меню', 'main_menu')]
        ])
      );
      return;
    }

    // Создаем или получаем прогресс
    await ProgressModel.getOrCreateProgress(user.id, topicId, currentMaterial.id);

    // Отправляем материал
    await this.sendMaterial(ctx, currentMaterial, topicId);
  }

  async sendMaterial(ctx, material, topicId) {
    try {
      // Отправляем медиа-файл, если есть
      if (material.type === 'video' && material.file_id) {
        await ctx.replyWithVideo(material.file_id);
      } else if (material.type === 'audio' && material.file_id) {
        await ctx.replyWithAudio(material.file_id);
      }

      // Отправляем текстовый контент, если есть
      if (material.content) {
        await ctx.reply(material.content);
      }

      // Отправляем практическое задание
      if (material.task_text) {
        const keyboard = [
          [Markup.button.callback('✍️ Написать ответ', `answer_${material.id}`)],
          [Markup.button.callback('⬅️ Вернуться в меню', 'main_menu')]
        ];

        await ctx.reply(
          `📝 Практическое задание:\n\n${material.task_text}`,
          Markup.inlineKeyboard(keyboard)
        );
      } else {
        // Если нет задания, сразу помечаем как выполненное
        await ProgressModel.markCompleted(ctx.state.user.id, topicId, material.id);
        
        await ctx.reply(
          '✅ Материал просмотрен!',
          Markup.inlineKeyboard([
            [Markup.button.callback('➡️ Следующий материал', `topic_${topicId}`)],
            [Markup.button.callback('⬅️ Вернуться в меню', 'main_menu')]
          ])
        );
      }
    } catch (error) {
      console.error('Error sending material:', error);
      await ctx.reply('❌ Ошибка при отправке материала.');
    }
  }

  async handleAnswerSubmission(ctx, materialId) {
    const user = ctx.state.user;
    const answerText = ctx.message.text;

    // Сохраняем ответ
    await AnswerModel.saveAnswer(user.id, materialId, answerText);

    // Получаем материал для определения темы
    const material = await MaterialModel.getMaterialById(materialId);

    // Помечаем материал как завершенный
    await ProgressModel.markCompleted(user.id, material.topic_id, materialId);

    // Очищаем состояние пользователя
    this.userStates.delete(ctx.from.id);

    await ctx.reply(
      '✅ Ваш ответ отправлен на проверку!\n\n' +
      'Администратор проверит его в ближайшее время.',
      Markup.inlineKeyboard([
        [Markup.button.callback('➡️ Следующий материал', `topic_${material.topic_id}`)],
        [Markup.button.callback('⬅️ Вернуться в меню', 'main_menu')]
      ])
    );
  }

  async launch() {
    try {
      await this.bot.launch();
      console.log('✅ Telegram bot started successfully');
    } catch (error) {
      console.error('❌ Error launching bot:', error);
      throw error;
    }
  }

  async stop(signal) {
    console.log(`Received ${signal}, stopping bot...`);
    this.bot.stop(signal);
  }
}

module.exports = TelegramBot;

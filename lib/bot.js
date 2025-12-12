import { Telegraf, Markup } from 'telegraf';
import { UserModel, TopicModel, MaterialModel, AccessModel, ProgressModel, AnswerModel } from './models.js';

// Получаем список администраторов из переменной окружения
// Формат: BOT_ADMINS=123456789,987654321
function getAdminIds() {
  const adminsEnv = process.env.BOT_ADMINS || '';
  if (!adminsEnv.trim()) {
    console.warn('⚠️  BOT_ADMINS not configured. Answers will not be sent to admins.');
    return [];
  }
  return adminsEnv.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
}

// Приветственное сообщение из env или дефолтное
const WELCOME_MESSAGE = process.env.BOT_WELCOME_MESSAGE || 
  'Добро пожаловать в систему обучения! Выберите тему из меню ниже.';

class TelegramBot {
  constructor(token) {
    this.bot = new Telegraf(token);
    this.userStates = new Map(); // Хранение состояния пользователей
    this.lastMessages = new Map(); // Хранение ID последних сообщений для удаления
    this.setupMiddleware();
    this.setupHandlers();
  }

  async deleteLastMessage(ctx) {
    const userId = ctx.from.id;
    const lastMessageId = this.lastMessages.get(userId);
    if (lastMessageId) {
      try {
        await ctx.deleteMessage(lastMessageId);
      } catch (error) {
        // Игнорируем ошибки удаления (сообщение уже удалено или слишком старое)
      }
    }
  }

  async saveMessageId(ctx, message) {
    if (message && message.message_id) {
      this.lastMessages.set(ctx.from.id, message.message_id);
    }
  }

  // Вспомогательная функция для отправки сообщений с retry
  async sendMessageWithRetry(ctx, text, extra = {}, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await ctx.reply(text, extra);
      } catch (error) {
        console.error(`❌ Error sending message (attempt ${attempt}/${retries}):`, error.message);
        
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('❌ All retry attempts failed, throwing error');
          throw error;
        }
      }
    }
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
      console.log(`✅ /start from ${ctx.from.id}`);
      await this.showMainMenu(ctx);
      console.log(`End start`)
    });

    // Обработка callback запросов
    this.bot.action(/^topic_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const topicId = parseInt(ctx.match[1]);
      await this.handleTopicSelection(ctx, topicId);
    });

    this.bot.action('main_menu', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showMainMenu(ctx);
    });

    this.bot.action('refresh_menu', async (ctx) => {
      await ctx.answerCbQuery('Обновление...');
      await this.showMainMenu(ctx);
    });

    // Обработчик запроса кода подтверждения
    this.bot.on('text', async (ctx, next) => {
      const text = ctx.message.text;
      if (text === '/code') {
        await this.sendVerificationCode(ctx);
        return;
      }
      return next();
    });

    this.bot.action(/^answer_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const materialId = parseInt(ctx.match[1]);
      await this.deleteLastMessage(ctx);
      // Устанавливаем состояние ожидания ответа
      this.userStates.set(ctx.from.id, {
        state: 'awaiting_answer',
        materialId: materialId
      });
      const msg = await ctx.reply(
        '✍️ Напишите ваш ответ на практическое задание:',
        Markup.inlineKeyboard([
          [Markup.button.callback('🏠 Меню', 'main_menu')]
        ])
      );
      await this.saveMessageId(ctx, msg);
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
      ctx.reply(
        'Произошла ошибка. Попробуйте позже или обратитесь к администратору.',
        Markup.inlineKeyboard([
          [Markup.button.callback('🏠 Меню', 'main_menu')]
        ])
      );
    });
  }

  async showMainMenu(ctx) {
    console.log(`Showing main menu to user ${ctx.from.id}`);
    await this.deleteLastMessage(ctx);
    console.log(`Deleted last message for user ${ctx.from.id}`);

    const user = ctx.state.user;
    const allTopics = await TopicModel.getAllTopics();
    console.log(`Fetched ${allTopics.length} topics from DB`);
    const accessibleTopicIds = (await AccessModel.getTopicAccessForUser(user.id)).map(a => a.topic_id);
    console.log(`User has access to topics:`, accessibleTopicIds);

    if (allTopics.length === 0) {
      const msg = await ctx.reply('📚 Темы курса еще не созданы. Обратитесь к администратору.');
      await this.saveMessageId(ctx, msg);
      return;
    }

    // Проверяем завершенность и доступность каждой темы
    const topicsWithStatus = await Promise.all(
      allTopics.map(async (topic) => {
        const hasAccess = accessibleTopicIds.includes(topic.id);
        const isCompleted = hasAccess ? await ProgressModel.isTopicCompleted(user.id, topic.id) : false;
        return {
          ...topic,
          hasAccess,
          isCompleted
        };
      })
    );

    const keyboard = topicsWithStatus.map(topic => {
      let emoji = '📚 ';
      if (topic.isCompleted) {
        emoji = '✅ ';
      } else if (!topic.hasAccess) {
        emoji = '🔒 ';
      }
      return [Markup.button.callback(`${emoji}${topic.title}`, `topic_${topic.id}`)];
    });

    // Добавляем кнопки внизу
    const webAppUrl = process.env.WEB_APP_URL || process.env.VERCEL_URL;
    
    // Добавляем кнопку сайта только если есть публичный URL (не localhost)
    if (webAppUrl && !webAppUrl.includes('localhost')) {
      keyboard.push([
        Markup.button.url('🌐 Перейти на сайт', `${webAppUrl}/${user.token}`)
      ]);
    }
    
    keyboard.push([Markup.button.callback('🔄 Обновить', 'refresh_menu')]);

    const msg = await ctx.reply(
      WELCOME_MESSAGE,
      Markup.inlineKeyboard(keyboard)
    );
    await this.saveMessageId(ctx, msg);
  }

  async handleTopicSelection(ctx, topicId) {
    await this.deleteLastMessage(ctx);
    
    const user = ctx.state.user;
    
    // Проверяем доступ
    const hasAccess = await AccessModel.hasAccess(user.id, topicId);
    if (!hasAccess) {
      const msg = await ctx.reply(
        '🔒 У вас нет доступа к этой теме.\n\n' +
        'Для получения доступа обратитесь к администратору.',
        Markup.inlineKeyboard([
          [Markup.button.callback('🏠 Меню', 'main_menu')]
        ])
      );
      await this.saveMessageId(ctx, msg);
      return;
    }

    // Получаем текущий материал для пользователя
    const currentMaterial = await ProgressModel.getCurrentMaterial(user.id, topicId);
    
    if (!currentMaterial) {
      const msg = await ctx.reply(
        '🎉 Поздравляем! Вы завершили все материалы в этой теме!',
        Markup.inlineKeyboard([
          [Markup.button.callback('🏠 Меню', 'main_menu')]
        ])
      );
      await this.saveMessageId(ctx, msg);
      return;
    }

    // Создаем или получаем прогресс
    await ProgressModel.getOrCreateProgress(user.id, topicId, currentMaterial.id);

    // Отправляем материал
    await this.sendMaterial(ctx, currentMaterial, topicId);
  }

  async sendMaterial(ctx, material, topicId) {
    await this.deleteLastMessage(ctx);
    
    try {
      // Отправляем медиа-файл, если есть
      if (material.type === 'video' && material.file_id) {
        // Проверяем, является ли file_id URL-ом
        if (material.file_id.startsWith('http://') || material.file_id.startsWith('https://')) {
          await ctx.replyWithVideo({ url: material.file_id });
        } else {
          await ctx.replyWithVideo(material.file_id);
        }
      } else if (material.type === 'audio' && material.file_id) {
        // Проверяем, является ли file_id URL-ом
        if (material.file_id.startsWith('http://') || material.file_id.startsWith('https://')) {
          await ctx.replyWithAudio({ url: material.file_id });
        } else {
          await ctx.replyWithAudio(material.file_id);
        }
      }

      // Отправляем текстовый контент, если есть
      if (material.content) {
        await ctx.reply(material.content);
      }

      // Отправляем практическое задание
      if (material.task_text) {
        const keyboard = [
          [Markup.button.callback('✍️ Написать ответ', `answer_${material.id}`)],
          [Markup.button.callback('🏠 Меню', 'main_menu')]
        ];

        const msg = await ctx.reply(
          `📝 Практическое задание:\n\n${material.task_text}`,
          Markup.inlineKeyboard(keyboard)
        );
        await this.saveMessageId(ctx, msg);
      } else {
        // Если нет задания, сразу помечаем как выполненное
        await ProgressModel.markCompleted(ctx.state.user.id, topicId, material.id);
        
        const msg = await ctx.reply(
          '✅ Материал просмотрен!',
          Markup.inlineKeyboard([
            [Markup.button.callback('➡️ Следующий материал', `topic_${topicId}`)],
            [Markup.button.callback('🏠 Меню', 'main_menu')]
          ])
        );
        await this.saveMessageId(ctx, msg);
      }
    } catch (error) {
      console.error('Error sending material:', error);
      const msg = await ctx.reply(
        '❌ Ошибка при отправке материала.',
        Markup.inlineKeyboard([
          [Markup.button.callback('🏠 Меню', 'main_menu')]
        ])
      );
      await this.saveMessageId(ctx, msg);
    }
  }

  async handleAnswerSubmission(ctx, materialId) {
    await this.deleteLastMessage(ctx);
    
    const user = ctx.state.user;
    const answerText = ctx.message.text;

    // Сохраняем ответ
    await AnswerModel.saveAnswer(user.id, materialId, answerText);

    // Получаем материал для определения темы
    const material = await MaterialModel.getMaterialById(materialId);
    const topic = await TopicModel.getTopicById(material.topic_id);

    // Помечаем материал как завершенный
    await ProgressModel.markCompleted(user.id, material.topic_id, materialId);

    // Формируем сообщение для администраторов
    const username = user.username ? `@${user.username}` : `ID: ${user.telegram_id}`;
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Без имени';
    
    const adminMessage = 
      `📝 *Новый ответ на задание*\n\n` +
      `👤 *Пользователь:* ${fullName} (${username})\n` +
      `📚 *Тема:* ${topic.title}\n` +
      `📄 *Задание:* ${material.task_text || 'Не указано'}\n\n` +
      `💬 *Ответ:*\n${answerText}`;

    // Отправляем уведомления всем администраторам
    const adminIds = getAdminIds();
    for (const adminId of adminIds) {
      try {
        await this.bot.telegram.sendMessage(adminId, adminMessage, {
          parse_mode: 'Markdown'
        });
        console.log(`✅ Answer sent to admin ${adminId}`);
      } catch (error) {
        console.error(`❌ Failed to send answer to admin ${adminId}:`, error.message);
      }
    }

    // Очищаем состояние пользователя
    this.userStates.delete(ctx.from.id);

    const msg = await ctx.reply(
      '✅ Ваш ответ отправлен на проверку!\n\n' +
      'Администратор проверит его в ближайшее время.',
      Markup.inlineKeyboard([
        [Markup.button.callback('➡️ Следующий материал', `topic_${material.topic_id}`)],
        [Markup.button.callback('🏠 Меню', 'main_menu')]
      ])
    );
    await this.saveMessageId(ctx, msg);
  }

  launch() {
    // Запускаем бота (long polling работает в фоне)
    this.bot.launch();
    console.log('✅ Telegram bot started successfully');
  }

  async sendVerificationCode(ctx) {
    const user = ctx.state.user;
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    
    await UserModel.setVerificationCode(user.id, code);
    
    await this.sendMessageWithRetry(
      ctx,
      `🔐 Ваш код подтверждения:\n\n*${code}*\n\nКод действителен 10 минут.`,
      { parse_mode: 'Markdown' }
    );
  }

  // Публичный метод для вызова из API
  async sendVerificationCodeToUser(telegramId, retries = 3) {
    console.log('🔐 Generating verification code for telegram_id:', telegramId);
    
    const user = await UserModel.getUserByTelegramId(telegramId);
    if (!user) {
      console.log('❌ User not found for telegram_id:', telegramId);
      return null;
    }
    
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    console.log('✅ Generated code:', code);
    
    await UserModel.setVerificationCode(user.id, code);
    console.log('✅ Code saved to database');
    
    // Retry логика с экспоненциальной задержкой
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.bot.telegram.sendMessage(
          String(telegramId),
          `🔐 Ваш код подтверждения для входа на сайт:\n\n*${code}*\n\nКод действителен 10 минут.`,
          { parse_mode: 'Markdown' }
        );
        console.log('✅ Code sent to Telegram user:', telegramId);
        return code;
      } catch (error) {
        console.error(`❌ Error sending code (attempt ${attempt}/${retries}):`, error.message);
        
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('❌ All retry attempts failed');
          return null;
        }
      }
    }
    
    return null;
  }

  async stop(signal) {
    console.log(`Received ${signal}, stopping bot...`);
    this.bot.stop(signal);
  }

  // Обработка обновления в webhook режиме
  async handleUpdate(update) {
    return this.bot.handleUpdate(update);
  }
}

// Экспорт класса и функции создания бота
export default TelegramBot;

export function createBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN not set');
  }
  return new TelegramBot(token);
}

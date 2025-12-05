require('dotenv').config();
const db = require('./database/db');
const TelegramBot = require('./bot');
const AdminPanel = require('./admin');

let bot;
let admin;

async function start() {
  try {
    // Инициализация базы данных
    console.log('🔄 Initializing database...');
    await db.init();

    // Запуск Telegram бота
    console.log('🔄 Starting Telegram bot...');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set in .env file');
    }
    bot = new TelegramBot(botToken);
    await bot.launch();

    // Запуск админ-панели
    console.log('🔄 Starting admin panel...');
    const adminPort = process.env.ADMIN_PORT || 3000;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
    admin = new AdminPanel(adminPort, adminPassword);
    await admin.start();

    console.log('');
    console.log('✅ ========================================');
    console.log('✅ All services started successfully!');
    console.log('✅ ========================================');
    console.log(`📱 Telegram bot: Active`);
    console.log(`🌐 Admin panel: http://localhost:${adminPort}`);
    console.log('✅ ========================================');
    console.log('');

  } catch (error) {
    console.error('❌ Error starting application:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n⚠️  ${signal} received, shutting down gracefully...`);
  
  try {
    // Остановка бота
    if (bot) {
      await bot.stop(signal);
    }

    // Остановка админ-панели
    if (admin) {
      await admin.stop();
    }

    // Закрытие базы данных
    await db.close();

    console.log('✅ Shutdown completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Обработка сигналов завершения
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

// Запуск приложения
start();

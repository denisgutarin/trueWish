import TelegramBot from'./lib/bot/bot.js'
// Указываем что instrumentation работает только в Node.js runtime
export const register = async () => {
  // Импорты только для Node.js runtime
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }


  console.log('🔄 Initializing Telegram Bot...');
  
  try {

    
    // Настройка webhook для Telegram бота
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const webAppUrl = process.env.WEB_APP_URL || process.env.VERCEL_URL;
    
    if (!botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN is not set');
      return;
    }
    
    // В production устанавливаем webhook
    if (process.env.NODE_ENV === 'production' && webAppUrl) {
      const webhookUrl = `https://${webAppUrl}/api/webhook`;
      console.log('🔄 Setting webhook:', webhookUrl);
      
      const botInstance = new TelegramBot(botToken);
      await botInstance.bot.telegram.setWebhook(webhookUrl);
      
      console.log('✅ Telegram webhook set successfully');
      console.log('✅ ========================================');
      console.log('📱 Telegram bot: Webhook mode');
      console.log('🔗 Webhook URL:', webhookUrl);
      console.log('✅ ========================================');
    } else {
      // В development используем long polling
      console.log('🔄 Starting bot in polling mode (development)...');
      const botInstance = new TelegramBot(botToken);
      botInstance.launch();
      
      // Делаем экземпляр бота доступным глобально
      global.telegramBot = botInstance;
      
      console.log('✅ Telegram bot started successfully');
      console.log('✅ ========================================');
      console.log('📱 Telegram bot: Polling mode (development)');
      console.log('✅ ========================================');
      
      
    }
    
  } catch (error) {
    console.error('❌ Error starting Telegram bot:', error);
  }
};


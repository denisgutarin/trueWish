import TelegramBot from'./lib/bot.js'
// Указываем что instrumentation работает только в Node.js runtime
export const register = async () => {
  // Импорты только для Node.js runtime
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  if (process.env.VERCEL_URL) {
    // web hooks, no bot launch
    return 
  }


  console.log('🔄 Initializing Telegram Bot...');
  
  try {

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
      if (!botToken) {
        console.error('❌ TELEGRAM_BOT_TOKEN is not set');
        return;
      }   
     
      const botInstance = new TelegramBot(botToken);
      botInstance.launch();
      
      global.telegramBot = botInstance;
      
      console.log('✅ Telegram bot started successfully');
  
  } catch (error) {
    console.error('❌ Error starting Telegram bot:', error);
  }
};


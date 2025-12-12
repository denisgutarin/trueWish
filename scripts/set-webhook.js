
import 'dotenv/config';

async function setWebhook() {
  const appUrl = process.argv[2];
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN not set in environment');
    process.exit(1);
  }

  if (!appUrl) {
    console.error('❌ Usage: node scripts/set-webhook.js <VERCEL_APP_URL>');
    console.error('   Example: node scripts/set-webhook.js https://true-wish-xyz.vercel.app');
    process.exit(1);
  }

  const webhookUrl = `${appUrl}/api/webhook`;
  const apiUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

  console.log('🔄 Setting Telegram webhook...');
  console.log('📍 Webhook URL:', webhookUrl);

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      if (data.ok) {
        console.log('✅ Webhook set successfully!');
        console.log('📝 Description:', data.description);
        // Check webhook info
        const infoUrl = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;
        const infoResponse = await fetch(infoUrl);
        const infoData = await infoResponse.json();
        if (infoData.ok) {
          console.log('\n📊 Webhook Info:');
          console.log('   URL:', infoData.result.url);
          console.log('   Pending updates:', infoData.result.pending_update_count);
          if (infoData.result.last_error_message) {
            console.log('   ⚠️  Last error:', infoData.result.last_error_message);
          }
        }
        return;
      } else {
        console.error(`❌ Failed to set webhook (attempt ${attempt}/${maxRetries}):`, data.description);
        if (attempt === maxRetries) process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Error setting webhook (attempt ${attempt}/${maxRetries}):`, error);
      if (attempt === maxRetries) process.exit(1);
    }
    const delay = 1000 * attempt;
    console.log(`⏳ Retrying in ${delay}ms...`);
    await new Promise(res => setTimeout(res, delay));
  }
  process.exit(1);
}

setWebhook().catch((error) => {
  console.error('❌ Unexpected error:', error);
  if (error) {
    process.exit(1);
  } 
})



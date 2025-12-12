#!/usr/bin/env node

/**
 * Set Telegram webhook for the bot
 * 
 * Usage: node scripts/set-webhook.js <VERCEL_APP_URL>
 * Example: node scripts/set-webhook.js https://true-wish-bnpcki707-denisgutarin-2458s-projects.vercel.app
 */

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
    } else {
      console.error('❌ Failed to set webhook:', data.description);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error.message);
    process.exit(1);
  }
}

setWebhook().catch(console.error);

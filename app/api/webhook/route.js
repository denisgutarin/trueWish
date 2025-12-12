import { NextResponse } from 'next/server';
import { createBot  } from '@/lib/bot'; 


export async function POST(request) {
  try {
    // Получаем обновление от Telegram
    const update = await request.json();
    const bot = createBot();
    // Fire-and-forget, but log errors if any
    await bot.handleUpdate(update).catch((err) => {
      console.error('❌ handleUpdate error:', err);
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// Опциональная проверка GET запроса (для диагностики)
export async function GET() {
  return NextResponse.json({ 
    status: 'Telegram webhook endpoint',
    message: 'Use POST to send updates'
  });
}

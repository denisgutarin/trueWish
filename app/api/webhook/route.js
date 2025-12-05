import { NextResponse } from 'next/server';

// Импортируем бота (будет создан позже)
let bot;

export async function POST(request) {
  try {
    // Получаем обновление от Telegram
    const update = await request.json();
    
    // Загружаем бота если еще не загружен
    if (!bot) {
      const { createBot } = await import('@/lib/bot/bot');
      bot = createBot();
    }
    
    // Обрабатываем обновление
    await bot.handleUpdate(update);
    
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

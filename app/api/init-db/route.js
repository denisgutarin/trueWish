import { NextResponse } from 'next/server';

/**
 * GET /api/init-db
 * Initialize database tables (one-time setup)
 * Protected by admin password
 */
export async function GET(request) {
  try {
    // Проверка admin пароля
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Динамический импорт для серверной части
    const db = await import('@/lib/bot/database/db');
    
    // Инициализация БД
    await db.default.init();
    
    return NextResponse.json({ 
      success: true,
      message: 'Database initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json({ 
      error: 'Database initialization failed',
      message: error.message 
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { UserModel } from '@/lib/models';
import { createBot } from '@/lib/bot';

/**
 * POST /api/auth/request-code
 * Запрос кода подтверждения
 */
export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const user = await UserModel.getUserByToken(token);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    
    const bot = createBot()   

    console.log('🔐 Requesting code for user:', user.telegram_id);
    const code = await bot.sendVerificationCodeToUser(user.telegram_id);
    
    if (!code) {
      return NextResponse.json({ error: 'Failed to send code' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error requesting code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

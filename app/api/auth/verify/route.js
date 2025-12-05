import { NextResponse } from 'next/server';
import { verifyCode } from '@/lib/queries';

/**
 * POST /api/auth/verify
 * Проверка кода подтверждения
 */
export async function POST(request) {
  try {
    const { token, code } = await request.json();

    if (!token || !code) {
      return NextResponse.json({ error: 'Token and code required' }, { status: 400 });
    }

    const user = await verifyCode(token, code);

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

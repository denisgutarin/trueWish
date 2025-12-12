import { createBot } from '@/lib/bot';
import { UserModel } from '@/lib/models';

export async function POST(request) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    const user = await UserModel.getUserByToken(token);
    
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Получаем экземпляр бота из глобальной переменной
    const bot = createBot()

    console.log('🔐 Requesting code for user:', user.telegram_id);
    const code = await bot.sendVerificationCodeToUser(user.telegram_id);
    
    if (code) {
      console.log('✅ Code sent successfully');
      return Response.json({ success: true });
    } else {
      console.error('❌ Failed to send code');
      return Response.json({ error: 'Failed to send code' }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Error in /api/send-code:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

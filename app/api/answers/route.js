import { NextResponse } from 'next/server';
import { saveAnswer, markCompleted } from '@/lib/queries';

/**
 * POST /api/answers
 * Сохранить ответ на задание
 */
export async function POST(request) {
  try {
    const { userId, materialId, topicId, answerText } = await request.json();

    if (!userId || !materialId || !topicId || !answerText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Сохраняем ответ
    await saveAnswer(userId, materialId, answerText);

    // Отмечаем материал как завершенный
    await markCompleted(userId, topicId, materialId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving answer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

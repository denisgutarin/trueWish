import db, { sql } from '@/lib/bot/database/db.js';

/**
 * POST /api/admin/materials - Создать новый материал
 */
export async function POST(request) {
  try {
    const { topicId, type, content, fileId, taskText } = await request.json();
    // Получаем максимальный order_index для этой темы
    const maxOrderRows = await sql`SELECT MAX(order_index) as max FROM materials WHERE topic_id = ${topicId}`;
    const orderIndex = (maxOrderRows[0]?.max || 0) + 1;

    await sql`
      INSERT INTO materials (topic_id, type, file_id, content, task_text, order_index)
      VALUES (${topicId}, ${type}, ${fileId}, ${content}, ${taskText}, ${orderIndex})
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error creating material:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

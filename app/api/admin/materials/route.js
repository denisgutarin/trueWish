import db from '@/lib/bot/database/db';

/**
 * POST /api/admin/materials - Создать новый материал
 */
export async function POST(request) {
  try {
    const { topicId, type, content, fileId, taskText } = await request.json();
    // Получаем максимальный order_index для этой темы
    const maxOrder = await db.get(`SELECT MAX(order_index) as max FROM materials WHERE topic_id = $1`, [topicId])
    const orderIndex = (maxOrder?.max || 0) + 1;

    const result = await db.run(`
      INSERT INTO materials (topic_id, type, file_id, content, task_text, order_index)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [topicId, type, fileId, content, taskText, orderIndex])

    return Response.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating material:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

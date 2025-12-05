import { getDb } from '@/lib/db';

/**
 * POST /api/admin/materials - Создать новый материал
 */
export async function POST(request) {
  try {
    const { topicId, type, content, fileId, taskText } = await request.json();
    const db = getDb();

    // Получаем максимальный order_index для этой темы
    const maxOrder = await db.prepare(
      'SELECT MAX(order_index) as max FROM materials WHERE topic_id = ?'
    ).get(topicId);
    const orderIndex = (maxOrder?.max || 0) + 1;

    const result = await db.prepare(`
      INSERT INTO materials (topic_id, type, file_id, content, task_text, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(topicId, type, fileId, content, taskText, orderIndex);

    return Response.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating material:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

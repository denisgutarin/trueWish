import { getDb } from '@/lib/db';

/**
 * PUT /api/admin/topics/[topicId] - Обновить тему
 */
export async function PUT(request, { params }) {
  try {
    const { topicId } = await params;
    const topicIdNum = parseInt(topicId);
    const { title, description } = await request.json();
    const db = getDb();

    await db.prepare(`
      UPDATE topics
      SET title = ?, description = ?
      WHERE id = ?
    `).run(title, description || null, topicIdNum);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating topic:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/topics/[topicId] - Удалить тему
 */
export async function DELETE(request, { params }) {
  try {
    const { topicId } = await params;
    const topicIdNum = parseInt(topicId);
    const db = getDb();

    // Удаляем тему (материалы удалятся каскадно через foreign key)
    await db.prepare('DELETE FROM topics WHERE id = ?').run(topicIdNum);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/topics/[topicId]/materials - Получить материалы темы
 */
export async function GET(request, { params }) {
  try {
    const { topicId } = await params;
    const topicIdNum = parseInt(topicId);
    const db = getDb();

    const materials = await db.prepare(`
      SELECT *
      FROM materials
      WHERE topic_id = ?
      ORDER BY order_index
    `).all(topicIdNum);

    return Response.json({ materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

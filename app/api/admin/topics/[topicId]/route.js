import { sql } from '@/lib/db.js'

/**
 * PUT /api/admin/topics/[topicId] - Обновить тему
 */
export async function PUT(request, { params }) {
  try {
    const { topicId } = await params;
    const topicIdNum = parseInt(topicId);
    const { title, description } = await request.json();
    await sql`
      UPDATE topics
      SET title = ${title}, description = ${description || null}
      WHERE id = ${topicIdNum}
    `;

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
    // Удаляем тему (материалы удалятся каскадно через foreign key)
    await sql`DELETE FROM topics WHERE id = ${topicIdNum}`;

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
    const materials = await db.all(`
      SELECT *
      FROM materials
      WHERE topic_id = $1
      ORDER BY order_index
    `, [topicIdNum])

    return Response.json({ materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

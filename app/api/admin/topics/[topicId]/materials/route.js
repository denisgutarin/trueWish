import { getDb } from '@/lib/db';

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

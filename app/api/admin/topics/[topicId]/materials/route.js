import db from '@/lib/bot/database/db';

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

import { sql } from '@/lib/db.js'

/**
 * GET /api/admin/topics/[topicId]/materials - Получить материалы темы
 */
export async function GET(request, { params }) {
  try {
    const { topicId } = await params;
    const topicIdNum = parseInt(topicId);
    const materials = await sql`
      SELECT *
      FROM materials
      WHERE topic_id = ${topicIdNum}
      ORDER BY order_index
    `;

    return Response.json({ materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

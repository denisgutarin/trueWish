import { sql } from '@/lib/db.js'

/**
 * GET /api/admin/users/[userId]/access - Получить доступы пользователя
 */
export async function GET(request, { params }) {
  try {
    const { userId } = await params;
    const userIdNum = parseInt(userId);
    const access = await sql`
      SELECT uta.*, t.title as topic_title
      FROM user_topic_access uta
      JOIN topics t ON uta.topic_id = t.id
      WHERE uta.user_id = ${userIdNum}
      ORDER BY t.order_index
    `;

    return Response.json({ access });
  } catch (error) {
    console.error('Error fetching access:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users/[userId]/access - Дать доступ к теме
 */
export async function POST(request, { params }) {
  try {
    const { userId } = await params;
    const userIdNum = parseInt(userId);
    const { topicId } = await request.json();
    await sql`
      INSERT INTO user_topic_access (user_id, topic_id)
      VALUES (${userIdNum}, ${topicId})
      ON CONFLICT DO NOTHING
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error granting access:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[userId]/access - Удалить доступ к теме
 */
export async function DELETE(request, { params }) {
  try {
    const { userId } = await params;
    const userIdNum = parseInt(userId);
    const { topicId } = await request.json();
    await sql`
      DELETE FROM user_topic_access
      WHERE user_id = ${userIdNum} AND topic_id = ${topicId}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error revoking access:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import db from '@/lib/bot/database/db';

/**
 * GET /api/admin/users/[userId]/access - Получить доступы пользователя
 */
export async function GET(request, { params }) {
  try {
    const { userId } = await params;
    const userIdNum = parseInt(userId);
    const access = await db.all(`
      SELECT uta.*, t.title as topic_title
      FROM user_topic_access uta
      JOIN topics t ON uta.topic_id = t.id
      WHERE uta.user_id = $1
      ORDER BY t.order_index
    `, [userIdNum])

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
    await db.run(`
      INSERT INTO user_topic_access (user_id, topic_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [userIdNum, topicId])

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
    await db.run(`
      DELETE FROM user_topic_access
      WHERE user_id = $1 AND topic_id = $2
    `, [userIdNum, topicId])

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error revoking access:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

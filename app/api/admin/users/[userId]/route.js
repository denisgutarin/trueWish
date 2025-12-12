import db from '@/lib/bot/database/db';

/**
 * DELETE /api/admin/users/[userId]
 */
export async function DELETE(request, { params }) {
  try {
    const { userId } = await params;
    const userIdNum = parseInt(userId);
    // Удаляем пользователя и все связанные данные (каскадное удаление через foreign keys)
    await db.run(`DELETE FROM users WHERE id = $1`, [userIdNum])

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/users/[userId]/access
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

import { getDb } from '@/lib/db';

/**
 * GET /api/admin/users - Список всех пользователей
 */
export async function GET() {
  try {
    const db = getDb();
    const users = await db.prepare(`
      SELECT id, telegram_id, username, first_name, last_name, phone, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    return Response.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

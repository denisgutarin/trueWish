
import { sql } from '@/lib/db.js'

/**
 * GET /api/admin/users - Список всех пользователей
 */
export async function GET() {
  try {   
    const users = await sql`
      SELECT id, telegram_id, username, first_name, last_name, phone, created_at
      FROM users
      ORDER BY created_at DESC
    `;
    return Response.json({ users: users ?? [] });
  } catch (error) {
    console.error('Error fetching users:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import db from '@/lib/bot/database/db';

/**
 * POST /api/admin/login
 */
export async function POST(request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

    if (password === adminPassword) {
      return Response.json({ success: true });
    } else {
      return Response.json({ error: 'Invalid password' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

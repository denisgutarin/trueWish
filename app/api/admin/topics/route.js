import { getDb } from '@/lib/db';

/**
 * GET /api/admin/topics - Список всех тем с количеством материалов
 */
export async function GET() {
  try {
    const db = getDb();
    const topics = await db.prepare(`
      SELECT 
        t.*,
        COUNT(m.id) as materials_count
      FROM topics t
      LEFT JOIN materials m ON t.id = m.topic_id
      GROUP BY t.id
      ORDER BY t.order_index
    `).all();

    return Response.json({ topics });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/topics - Создать новую тему
 */
export async function POST(request) {
  try {
    const { title, description } = await request.json();
    const db = getDb();

    // Получаем максимальный order_index
    const maxOrder = await db.prepare('SELECT MAX(order_index) as max FROM topics').get();
    const orderIndex = (maxOrder?.max || 0) + 1;

    const result = await db.prepare(`
      INSERT INTO topics (title, description, order_index)
      VALUES (?, ?, ?)
    `).run(title, description || null, orderIndex);

    return Response.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating topic:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

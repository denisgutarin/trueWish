import db from '@/lib/bot/database/db';

/**
 * GET /api/admin/topics - Список всех тем с количеством материалов
 */
export async function GET() {
  try {    const topics = await db.all(`
      SELECT 
        t.*,
        COUNT(m.id) as materials_count
      FROM topics t
      LEFT JOIN materials m ON t.id = m.topic_id
      GROUP BY t.id
      ORDER BY t.order_index
    `, [])

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
    // Получаем максимальный order_index
    const maxOrder = await db.get(`SELECT MAX(order_index) as max FROM topics`, [])
    const orderIndex = (maxOrder?.max || 0) + 1;

    const result = await db.run(`
      INSERT INTO topics (title, description, order_index)
      VALUES ($1, $2, $3)
    `, [title, description || null, orderIndex])

    return Response.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating topic:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

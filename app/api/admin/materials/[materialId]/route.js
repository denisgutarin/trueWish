import { getDb } from '@/lib/db';

/**
 * PUT /api/admin/materials/[materialId] - Обновить материал
 */
export async function PUT(request, { params }) {
  try {
    const { materialId } = await params;
    const materialIdNum = parseInt(materialId);
    const { type, content, fileId, taskText } = await request.json();
    const db = getDb();

    await db.prepare(`
      UPDATE materials
      SET type = ?, file_id = ?, content = ?, task_text = ?
      WHERE id = ?
    `).run(type, fileId, content, taskText, materialIdNum);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating material:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/materials/[materialId] - Удалить материал
 */
export async function DELETE(request, { params }) {
  try {
    const { materialId } = await params;
    const materialIdNum = parseInt(materialId);
    const db = getDb();

    await db.prepare('DELETE FROM materials WHERE id = ?').run(materialIdNum);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting material:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

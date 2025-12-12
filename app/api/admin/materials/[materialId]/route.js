import db from '@/lib/bot/database/db';

/**
 * PUT /api/admin/materials/[materialId] - Обновить материал
 */
export async function PUT(request, { params }) {
  try {
    const { materialId } = await params;
    const materialIdNum = parseInt(materialId);
    const { type, content, fileId, taskText } = await request.json();
    await db.run(`
      UPDATE materials
      SET type = $1, file_id = $2, content = $3, task_text = $4
      WHERE id = $5
    `, [type, fileId, content, taskText, materialIdNum])

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
    await db.run(`DELETE FROM materials WHERE id = $1`, [materialIdNum])

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting material:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

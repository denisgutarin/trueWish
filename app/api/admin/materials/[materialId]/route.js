import db, { sql } from '@/lib/bot/database/db.js';

/**
 * PUT /api/admin/materials/[materialId] - Обновить материал
 */
export async function PUT(request, { params }) {
  try {
    const { materialId } = await params;
    const materialIdNum = parseInt(materialId);
    const { type, content, fileId, taskText } = await request.json();
    await sql`
      UPDATE materials
      SET type = ${type}, file_id = ${fileId}, content = ${content}, task_text = ${taskText}
      WHERE id = ${materialIdNum}
    `;

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
    await sql`DELETE FROM materials WHERE id = ${materialIdNum}`;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting material:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

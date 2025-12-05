import { NextResponse } from 'next/server';
import { 
  getMaterialsByTopicId,
  hasAccess,
  getUserProgressForTopic
} from '@/lib/queries';

/**
 * GET /api/topics/[topicId]/materials?userId=1
 * Получить материалы темы
 */
export async function GET(request, { params }) {
  try {
    const { topicId } = await params;
    const topicIdNum = parseInt(topicId);
    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('userId'));

    if (!userId || !topicId) {
      return NextResponse.json({ error: 'User ID and Topic ID required' }, { status: 400 });
    }

    // Проверяем доступ
    const userHasAccess = await hasAccess(userId, topicIdNum);

    if (!userHasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const materials = await getMaterialsByTopicId(topicIdNum);
    const progress = await getUserProgressForTopic(userId, topicIdNum);

    const materialsWithProgress = materials.map(material => {
      const materialProgress = progress.find(p => p.material_id === material.id);
      return {
        ...material,
        completed: materialProgress?.completed || false
      };
    });

    return NextResponse.json({ materials: materialsWithProgress });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

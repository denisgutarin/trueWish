import { NextResponse } from 'next/server';
import { 
  getAllTopics, 
  getMaterialsByTopicId, 
  hasAccess, 
  getUserProgressForTopic,
  getUserAccessibleTopics
} from '@/lib/queries';

/**
 * GET /api/topics?userId=1
 * Получить список тем с информацией о доступе
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('userId'));

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const allTopics = await getAllTopics();
    const accessibleTopics = await getUserAccessibleTopics(userId);
    const accessibleIds = accessibleTopics.map(t => t.id);

    const topicsWithAccess = allTopics.map(topic => ({
      ...topic,
      hasAccess: accessibleIds.includes(topic.id)
    }));

    return NextResponse.json({ topics: topicsWithAccess });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

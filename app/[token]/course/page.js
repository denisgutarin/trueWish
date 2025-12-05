'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

// Функция для конвертации URL в embed
function getVideoEmbedUrl(url) {
  if (!url) return null;
  
  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.includes('youtu.be') 
      ? url.split('youtu.be/')[1]?.split('?')[0]
      : url.split('v=')[1]?.split('&')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }
  
  // Rutube
  if (url.includes('rutube.ru')) {
    const videoId = url.split('/video/')[1]?.split('/')[0]?.split('?')[0];
    return videoId ? `https://rutube.ru/play/embed/${videoId}` : null;
  }
  
  // VK Video
  if (url.includes('vkvideo.ru') || url.includes('vk.com/video')) {
    const match = url.match(/video(-?\d+_\d+)/);
    if (match) {
      return `https://vk.com/video_ext.php?oid=${match[1].split('_')[0]}&id=${match[1].split('_')[1]}&hd=2`;
    }
  }
  
  return null;
}

export default function CoursePage({ params }) {
  const { token: paramToken } = use(params);
  const router = useRouter();
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const id = localStorage.getItem('userId');
    
    if (!token || token !== paramToken || !id) {
      router.push(`/${paramToken}`);
      return;
    }

    setUserId(parseInt(id));
    loadTopics(id);
  }, [paramToken, router]);

  async function loadTopics(uid) {
    try {
      const response = await fetch(`/api/topics?userId=${uid}`);
      const data = await response.json();
      setTopics(data.topics || []);
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  }

  async function selectTopic(topic) {
    if (!topic.hasAccess) {
      alert('🔒 У вас нет доступа к этой теме');
      return;
    }

    setSelectedTopic(topic);
    setAnswerText('');
    
    try {
      const response = await fetch(`/api/topics/${topic.id}/materials?userId=${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        setMaterials(data.materials || []);
      } else {
        alert('Ошибка загрузки материалов');
      }
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  }

  async function submitAnswer(materialId) {
    if (!answerText.trim()) {
      alert('Введите ответ');
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          materialId,
          topicId: selectedTopic.id,
          answerText: answerText.trim()
        })
      });

      if (response.ok) {
        alert('✅ Ответ отправлен на проверку!');
        setAnswerText('');
        // Перезагружаем материалы для обновления статуса
        selectTopic(selectedTopic);
      } else {
        alert('Ошибка отправки ответа');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Ошибка отправки ответа');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Левая панель навигации */}
      <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">🎓 Курс</h1>
        </div>
        
        <nav className="p-4">
          {topics.map((topic, index) => (
            <button
              key={topic.id}
              onClick={() => selectTopic(topic)}
              className={`w-full text-left p-4 rounded-lg mb-2 transition ${
                selectedTopic?.id === topic.id
                  ? 'bg-blue-50 border-2 border-blue-500'
                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">
                    {index + 1}. {topic.title}
                  </div>
                  {topic.description && (
                    <div className="text-sm text-gray-600 mt-1">
                      {topic.description}
                    </div>
                  )}
                </div>
                {!topic.hasAccess && (
                  <span className="text-2xl ml-2">🔒</span>
                )}
              </div>
            </button>
          ))}
        </nav>
      </aside>

      {/* Правая панель контента */}
      <main className="flex-1 overflow-y-auto p-8">
        {selectedTopic ? (
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {selectedTopic.title}
            </h2>
            {selectedTopic.description && (
              <p className="text-gray-600 mb-8">{selectedTopic.description}</p>
            )}

            <div className="space-y-6">
              {materials.map((material, index) => (
                <div
                  key={material.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {material.type === 'video' && '📹 '}
                      {material.type === 'audio' && '🎵 '}
                      {material.type === 'text' && '📄 '}
                      {material.type === 'task' && '📝 '}
                      Материал {index + 1}
                      {material.completed && (
                        <span className="ml-2 text-green-500">✅</span>
                      )}
                    </h3>
                  </div>

                  {material.type === 'video' && material.file_id && (
                    material.file_id.startsWith('http') ? (
                      (() => {
                        const embedUrl = getVideoEmbedUrl(material.file_id);
                        return embedUrl ? (
                          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                            <iframe
                              src={embedUrl}
                              className="absolute top-0 left-0 w-full h-full rounded-lg mb-4"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <video
                            src={material.file_id}
                            controls
                            className="w-full rounded-lg mb-4"
                          />
                        );
                      })()
                    ) : (
                      <div className="bg-gray-100 p-4 rounded-lg mb-4">
                        <p className="text-gray-600">
                          📹 Видео (Telegram file ID: {material.file_id})
                        </p>
                      </div>
                    )
                  )}

                  {material.type === 'audio' && material.file_id && (
                    material.file_id.startsWith('http') ? (
                      <audio
                        src={material.file_id}
                        controls
                        className="w-full mb-4"
                      />
                    ) : (
                      <div className="bg-gray-100 p-4 rounded-lg mb-4">
                        <p className="text-gray-600">
                          🎵 Аудио (Telegram file ID: {material.file_id})
                        </p>
                      </div>
                    )
                  )}

                  {material.type === 'text' && material.content && (
                    <div className="prose max-w-none mb-4">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {material.content}
                      </p>
                    </div>
                  )}

                  {/* Показываем задание для любого типа материала, если оно есть */}
                  {material.task_text && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                      <p className="font-semibold text-blue-900 mb-2">
                        📝 Задание:
                      </p>
                      <p className="text-blue-800 whitespace-pre-wrap">
                        {material.task_text}
                      </p>
                    </div>
                  )}

                  {material.task_text && !material.completed && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ваш ответ:
                      </label>
                      <textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        rows="4"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                        placeholder="Введите ваш ответ..."
                      />
                      <button
                        onClick={() => submitAnswer(material.id)}
                        disabled={submitting || !answerText.trim()}
                        className="mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-2 px-6 rounded-lg transition"
                      >
                        {submitting ? 'Отправка...' : 'Отправить ответ'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-xl mb-2">👈</p>
              <p>Выберите тему из меню слева</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

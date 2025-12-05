'use client';

import { useState, useEffect } from 'react';

export default function UserModal({ user, onClose, onUpdate }) {
  const [topics, setTopics] = useState([]);
  const [userAccess, setUserAccess] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    try {
      const [topicsRes, accessRes] = await Promise.all([
        fetch('/api/admin/topics'),
        fetch(`/api/admin/users/${user.id}/access`)
      ]);

      const topicsData = await topicsRes.json();
      const accessData = await accessRes.json();

      setTopics(topicsData.topics || []);
      setUserAccess(accessData.access || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAccess(topicId, hasAccess) {
    try {
      if (hasAccess) {
        // Удаляем доступ
        const response = await fetch(`/api/admin/users/${user.id}/access`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topicId })
        });
        
        if (response.ok) {
          await loadData();
          onUpdate();
        } else {
          alert('Ошибка удаления доступа');
        }
      } else {
        // Даем доступ
        const response = await fetch(`/api/admin/users/${user.id}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topicId })
        });
        
        if (response.ok) {
          await loadData();
          onUpdate();
        } else {
          alert('Ошибка предоставления доступа');
        }
      }
    } catch (error) {
      console.error('Error toggling access:', error);
      alert('Ошибка изменения доступа');
    }
  }

  function hasAccess(topicId) {
    return userAccess.some(a => a.topic_id === topicId);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            Управление доступом: {user.first_name} {user.last_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {topics.map((topic) => {
                const access = hasAccess(topic.id);
                return (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-800">{topic.title}</h3>
                      {topic.description && (
                        <p className="text-sm text-gray-600">{topic.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleAccess(topic.id, access)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        access
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {access ? '✓ Доступ открыт' : '🔒 Доступ закрыт'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

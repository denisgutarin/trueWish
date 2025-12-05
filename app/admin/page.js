'use client';

import { useState, useEffect } from 'react';
import UserModal from '@/components/admin/UserModal';
import TopicModal from '@/components/admin/TopicModal';
import MaterialModal from '@/components/admin/MaterialModal';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('adminAuth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      loadData();
    }
  }, [activeTab]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        localStorage.setItem('adminAuth', 'true');
        setIsAuthenticated(true);
        loadData();
      } else {
        alert('Неверный пароль');
      }
    } catch (error) {
      alert('Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        setUsers(data.users || []);
      } else if (activeTab === 'topics') {
        const response = await fetch('/api/admin/topics');
        const data = await response.json();
        setTopics(data.topics || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('adminAuth');
    setIsAuthenticated(false);
    setPassword('');
  }

  async function handleDeleteUser(userId) {
    if (!confirm('Удалить пользователя?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadData();
      } else {
        alert('Ошибка удаления');
      }
    } catch (error) {
      alert('Ошибка удаления');
    }
  }

  async function handleDeleteTopic(topicId) {
    if (!confirm('Удалить тему со всеми материалами?')) return;

    try {
      const response = await fetch(`/api/admin/topics/${topicId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadData();
      } else {
        alert('Ошибка удаления');
      }
    } catch (error) {
      alert('Ошибка удаления');
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🔐 Админ-панель
            </h1>
            <p className="text-gray-600">Введите пароль для доступа</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                placeholder="Пароль"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">📊 Админ-панель</h1>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Выйти
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-2 border-b-2 font-medium transition ${
                activeTab === 'users'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              👥 Пользователи
            </button>
            <button
              onClick={() => setActiveTab('topics')}
              className={`py-4 px-2 border-b-2 font-medium transition ${
                activeTab === 'topics'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              📚 Темы и материалы
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Список пользователей ({users.length})
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Telegram
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Имя
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Дата регистрации
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          @{user.username || user.telegram_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.first_name} {user.last_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                            className="text-purple-600 hover:text-purple-900 mr-4"
                          >
                            Управление доступом
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'topics' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Темы курса ({topics.length})
              </h2>
              <button
                onClick={() => {
                  setSelectedTopic(null);
                  setShowTopicModal(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                + Добавить тему
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {topics.map((topic, index) => (
                  <div
                    key={topic.id}
                    className="bg-white rounded-lg shadow p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {index + 1}. {topic.title}
                        </h3>
                        {topic.description && (
                          <p className="text-gray-600 mb-3">{topic.description}</p>
                        )}
                        <p className="text-sm text-gray-500">
                          Материалов: {topic.materials_count || 0}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedTopic(topic);
                            setShowMaterialModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Материалы
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTopic(topic);
                            setShowTopicModal(true);
                          }}
                          className="text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(topic.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showUserModal && (
        <UserModal
          user={selectedUser}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onUpdate={loadData}
        />
      )}

      {showTopicModal && (
        <TopicModal
          topic={selectedTopic}
          onClose={() => {
            setShowTopicModal(false);
            setSelectedTopic(null);
          }}
          onUpdate={loadData}
        />
      )}

      {showMaterialModal && (
        <MaterialModal
          topic={selectedTopic}
          onClose={() => {
            setShowMaterialModal(false);
            setSelectedTopic(null);
          }}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

export default function MaterialModal({ topic, onClose }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  // Форма материала
  const [type, setType] = useState('text');
  const [content, setContent] = useState('');
  const [fileId, setFileId] = useState('');
  const [taskText, setTaskText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, [topic]);

  async function loadMaterials() {
    try {
      const response = await fetch(`/api/admin/topics/${topic.id}/materials`);
      const data = await response.json();
      setMaterials(data.materials || []);
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setType('text');
    setContent('');
    setFileId('');
    setTaskText('');
    setEditingMaterial(null);
    setShowAddForm(false);
  }

  function handleEdit(material) {
    setType(material.type || 'text');
    setContent(material.content || '');
    setFileId(material.file_id || '');
    setTaskText(material.task_text || '');
    setEditingMaterial(material);
    setShowAddForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingMaterial
        ? `/api/admin/materials/${editingMaterial.id}`
        : '/api/admin/materials';
      const method = editingMaterial ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: topic.id,
          type,
          content: content || null,
          fileId: fileId || null,
          taskText: taskText || null
        })
      });

      if (response.ok) {
        loadMaterials();
        resetForm();
      } else {
        alert('Ошибка сохранения материала');
      }
    } catch (error) {
      alert('Ошибка сохранения материала');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(materialId) {
    if (!confirm('Удалить материал?')) return;

    try {
      const response = await fetch(`/api/admin/materials/${materialId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadMaterials();
      } else {
        alert('Ошибка удаления');
      }
    } catch (error) {
      alert('Ошибка удаления');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            Материалы: {topic.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!showAddForm ? (
            <>
              <div className="mb-4">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  + Добавить материал
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                </div>
              ) : materials.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Материалов пока нет
                </div>
              ) : (
                <div className="space-y-4">
                  {materials.map((material, index) => (
                    <div
                      key={material.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-semibold text-gray-800">
                              #{index + 1}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              material.type === 'video' ? 'bg-red-100 text-red-700' :
                              material.type === 'audio' ? 'bg-green-100 text-green-700' :
                              material.type === 'task' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {material.type === 'video' ? '🎥 Видео' :
                               material.type === 'audio' ? '🎵 Аудио' :
                               material.type === 'task' ? '📝 Задание' :
                               '📄 Текст'}
                            </span>
                          </div>

                          {material.type === 'text' && (
                            <p className="text-gray-700 text-sm line-clamp-2">
                              {material.content}
                            </p>
                          )}
                          {(material.type === 'video' || material.type === 'audio') && (
                            <p className="text-gray-600 text-sm">
                              File ID: {material.file_id}
                            </p>
                          )}
                          {material.type === 'task' && (
                            <p className="text-gray-700 text-sm line-clamp-2">
                              {material.task_text}
                            </p>
                          )}
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleEdit(material)}
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                          >
                            Редактировать
                          </button>
                          <button
                            onClick={() => handleDelete(material.id)}
                            className="text-red-600 hover:text-red-700 font-medium text-sm"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип материала *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900"
                  required
                >
                  <option value="text">📄 Текст</option>
                  <option value="video">🎥 Видео</option>
                  <option value="audio">🎵 Аудио</option>
                  <option value="task">📝 Задание</option>
                </select>
              </div>

              {type === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Текст материала *
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows="6"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900"
                    placeholder="Введите текст"
                    required
                  />
                </div>
              )}

              {(type === 'video' || type === 'audio') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL или Telegram File ID *
                  </label>
                  <input
                    type="text"
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900"
                    placeholder="https://... или file_id"
                    required
                  />
                </div>
              )}

              {type === 'task' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Текст задания *
                  </label>
                  <textarea
                    value={taskText}
                    onChange={(e) => setTaskText(e.target.value)}
                    rows="6"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900"
                    placeholder="Введите задание для пользователя"
                    required
                  />
                </div>
              )}

              {/* Дополнительное задание для любого типа материала */}
              {type !== 'task' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Задание (необязательно)
                  </label>
                  <textarea
                    value={taskText}
                    onChange={(e) => setTaskText(e.target.value)}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-gray-900"
                    placeholder="Добавить задание к этому материалу (опционально)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Если добавите задание, пользователь должен будет ответить на него после просмотра материала
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-2 px-6 rounded-lg transition"
                >
                  {submitting ? 'Сохранение...' : (editingMaterial ? 'Обновить' : 'Добавить')}
                </button>
              </div>
            </form>
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

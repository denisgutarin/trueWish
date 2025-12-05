'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage({ params }) {
  const { token } = use(params);
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(true);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    // Автоматически запрашиваем код при загрузке страницы
    requestCode();
  }, []);

  async function requestCode() {
    setRequesting(true);
    setError('');
    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Неверная ссылка или пользователь не найден');
      }
    } catch (err) {
      console.error('Error requesting code:', err);
      setError('Ошибка отправки кода');
    } finally {
      setRequesting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setAttempted(true);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          code 
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Сохраняем токен в localStorage для дальнейших запросов
        localStorage.setItem('userToken', token);
        localStorage.setItem('userId', data.user.id);
        
        // Переходим на страницу курса
        router.push(`/${token}/course`);
      } else {
        setError(data.error || 'Неверный код');
      }
    } catch (err) {
      console.error('Error verifying code:', err);
      setError('Ошибка проверки кода');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎓 Вход на платформу
          </h1>
          <p className="text-gray-600">
            Введите 4-значный код из Telegram
          </p>
        </div>

        {requesting ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Отправляем код в Telegram...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Код подтверждения
              </label>
              <input
                id="code"
                type="text"
                maxLength="4"
                pattern="[0-9]{4}"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className={`w-full px-4 py-3 text-center text-2xl font-bold border-2 rounded-lg focus:ring-2 outline-none transition text-gray-900 ${
                  attempted && error 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
                placeholder="0000"
                required
                autoFocus
              />
            </div>

            {attempted && error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 4}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? 'Проверка...' : 'Войти'}
            </button>

            <button
              type="button"
              onClick={requestCode}
              className="w-full text-blue-600 hover:text-blue-700 font-medium py-2 transition"
            >
              📱 Отправить код повторно
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

#!/usr/bin/env node

/**
 * Инициализация локальной базы данных Postgres
 * 
 * Использование:
 * 1. Убедитесь что Postgres установлен и запущен локально
 * 2. Создайте пользователя и базу вручную:
 *    psql -U postgres
 *    CREATE DATABASE truewish;
 *    CREATE USER truewish WITH PASSWORD 'truewish123';
 *    GRANT ALL PRIVILEGES ON DATABASE truewish TO truewish;
 * 3. Установите POSTGRES_URL в .env:
 *    POSTGRES_URL=postgresql://truewish:truewish123@localhost:5432/truewish
 * 4. Запустите этот скрипт: node scripts/init-local-db.js
 * 
 * Скрипт создаст все необходимые таблицы.
 */

import 'dotenv/config';

async function initDatabase() {
  console.log('🔄 Инициализация локальной базы данных...\n');

  // Проверка POSTGRES_URL
  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL не установлена в .env файле');
    console.log('\n💡 Добавьте в .env:');
    console.log('   POSTGRES_URL=postgresql://truewish:truewish123@localhost:5432/truewish\n');
    process.exit(1);
  }

  console.log('✅ POSTGRES_URL найдена');
  console.log('🔗 Подключение:', process.env.POSTGRES_URL.replace(/:[^:@]+@/, ':****@'));

  try {
    // Импортируем db и инициализируем
    const db = (await import('../lib/bot/database/db.js')).default;
    
    console.log('\n🔄 Создание таблиц...');
    await db.init();
    
    console.log('\n✅ База данных успешно инициализирована!');
    console.log('\n📋 Созданные таблицы:');
    console.log('   - users');
    console.log('   - topics');
    console.log('   - materials');
    console.log('   - user_topic_access');
    console.log('   - user_progress');
    console.log('   - user_answers');
    
    console.log('\n🚀 Готово! Теперь можно запустить: npm run dev');
    
  } catch (error) {
    console.error('\n❌ Ошибка инициализации:', error.message);
    console.error('Стек ошибки:', error.stack);
    console.log('\n💡 Убедитесь что:');
    console.log('   1. Postgres запущен локально');
    console.log('   2. База данных truewish создана');
    console.log('   3. Пользователь truewish имеет права доступа');
    console.log('   4. POSTGRES_URL правильно указан в .env');
    process.exit(1);
  }
}

initDatabase();

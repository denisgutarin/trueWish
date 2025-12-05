// Используем разные драйверы в зависимости от окружения
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
let sql, pool;

if (isVercel) {
  // Vercel - используем @vercel/postgres
  const vercelPg = require('@vercel/postgres');
  sql = vercelPg.sql;
} else {
  // Локально - используем pg
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  // Создаем функцию sql совместимую с @vercel/postgres
  sql = async (strings, ...values) => {
    const query = strings.reduce((acc, str, i) => {
      return acc + str + (i < values.length ? `$${i + 1}` : '');
    }, '');
    const result = await pool.query(query, values);
    return { rows: result.rows, rowCount: result.rowCount };
  };
  
  // Добавляем метод query для совместимости
  sql.query = async (query, params) => {
    const result = await pool.query(query, params);
    return { rows: result.rows, rowCount: result.rowCount };
  };
}

class DatabaseWrapper {
  constructor() {
    this.initialized = false;
  }

  async connect() {
    console.log('✅ Connected to Postgres database');
    if (!isVercel) {
      console.log('📍 Using local pg driver');
    } else {
      console.log('📍 Using @vercel/postgres driver');
    }
  }

  async init() {
    if (this.initialized) {
      return;
    }
    
    await this.connect();
    await this.createTables();
    this.initialized = true;
  }

  async createTables() {
    // Таблица пользователей
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username TEXT,
        phone TEXT,
        first_name TEXT,
        last_name TEXT,
        token TEXT UNIQUE,
        verification_code TEXT,
        verification_code_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Таблица тем
    await sql`
      CREATE TABLE IF NOT EXISTS topics (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Таблица материалов
    await sql`
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        topic_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        file_id TEXT,
        content TEXT,
        task_text TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
      )
    `;

    // Таблица доступов пользователей к темам
    await sql`
      CREATE TABLE IF NOT EXISTS user_topic_access (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        topic_id INTEGER NOT NULL,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, topic_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
      )
    `;

    // Таблица прогресса пользователей
    await sql`
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        topic_id INTEGER NOT NULL,
        material_id INTEGER NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, topic_id, material_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
      )
    `;

    // Таблица ответов пользователей на задания
    await sql`
      CREATE TABLE IF NOT EXISTS user_answers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        material_id INTEGER NOT NULL,
        answer_text TEXT NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
      )
    `;

    console.log('✅ Database tables created successfully');
  }

  async run(query, params = []) {
    await this.init();
    const result = await sql.query(query, params);
    return { 
      lastID: result.rows[0]?.id || null, 
      changes: result.rowCount 
    };
  }

  async get(query, params = []) {
    await this.init();
    const result = await sql.query(query, params);
    return result.rows[0] || null;
  }

  async all(query, params = []) {
    await this.init();
    const result = await sql.query(query, params);
    return result.rows;
  }

  async close() {
    if (!isVercel && pool) {
      await pool.end();
      console.log('✅ Database connection pool closed');
    } else {
      console.log('✅ Database connection closed');
    }
  }
}

const dbInstance = new DatabaseWrapper();

module.exports = dbInstance;

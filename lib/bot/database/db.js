// Используем разные драйверы в зависимости от окружения
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
let queryExecutor;

if (isVercel) {
  // Vercel - используем Neon serverless driver
  const { neon } = require('@neondatabase/serverless');
  const connectionString = process.env.POSTGRES_URL;
  
  if (!connectionString) {
    throw new Error('POSTGRES_URL is not set');
  }
  
  queryExecutor = neon(connectionString, {
    fetchOptions: {
      cache: 'no-store',
    },
  });
} else {
  // Локально - используем pg
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
  });
  
  queryExecutor = async (query, params = []) => {
    const result = await pool.query(query, params);
    return result.rows;
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
      console.log('📍 Using Neon serverless driver');
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
    await queryExecutor(`
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
    `);

    // Таблица тем
    await queryExecutor(`
      CREATE TABLE IF NOT EXISTS topics (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Таблица материалов
    await queryExecutor(`
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
    `);

    // Таблица доступов пользователей к темам
    await queryExecutor(`
      CREATE TABLE IF NOT EXISTS user_topic_access (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        topic_id INTEGER NOT NULL,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, topic_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
      )
    `);

    // Таблица прогресса пользователей
    await queryExecutor(`
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
    `);

    // Таблица ответов пользователей на задания
    await queryExecutor(`
      CREATE TABLE IF NOT EXISTS user_answers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        material_id INTEGER NOT NULL,
        answer_text TEXT NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database tables created successfully');
  }

  async run(query, params = []) {
    await this.init();
    const rows = await queryExecutor(query, params);
    return { 
      lastID: rows[0]?.id || null, 
      changes: rows.length 
    };
  }

  async get(query, params = []) {
    await this.init();
    const rows = await queryExecutor(query, params);
    return rows[0] || null;
  }

  async all(query, params = []) {
    await this.init();
    const rows = await queryExecutor(query, params);
    return rows;
  }

  async close() {
    console.log('✅ Database connection closed');
  }
}

const dbInstance = new DatabaseWrapper();

module.exports = dbInstance;

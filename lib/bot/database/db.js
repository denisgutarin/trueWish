// Используем разные драйверы в зависимости от окружения
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error('POSTGRES_URL is not set');
}

// sql = isVercel ? neon : slonik.sql (оба уже с tagged template из коробки)
const sql = isVercel 
  ? require('@neondatabase/serverless').neon(connectionString, {
      fetchOptions: { cache: 'no-store' }
    })
  : require('slonik').createPool(connectionString).sql;

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
    // Единый синтаксис для обоих драйверов - tagged templates
    await sql`CREATE TABLE IF NOT EXISTS users (
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
    )`;

    await sql`CREATE TABLE IF NOT EXISTS topics (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    await sql`CREATE TABLE IF NOT EXISTS materials (
      id SERIAL PRIMARY KEY,
      topic_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      file_id TEXT,
      content TEXT,
      task_text TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    )`;

    await sql`CREATE TABLE IF NOT EXISTS user_topic_access (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      topic_id INTEGER NOT NULL,
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, topic_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    )`;

    await sql`CREATE TABLE IF NOT EXISTS user_progress (
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
    )`;

    await sql`CREATE TABLE IF NOT EXISTS user_answers (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      answer_text TEXT NOT NULL,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    )`;

    console.log('✅ Database tables created successfully');
  }

  async close() {
    console.log('✅ Database connection closed');
  }
}

const db = new DatabaseWrapper();

// Экспортируем db и sql
module.exports = db;
module.exports.sql = sql;

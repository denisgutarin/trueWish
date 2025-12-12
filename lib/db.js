// Используем разные драйверы в зависимости от окружения
import { neon } from '@neondatabase/serverless';
import { createPool, createSqlTag, sql as slonikSql } from 'slonik';

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error('POSTGRES_URL is not set');
}

const createSQLTag = () => {
  let sql;

  if (isVercel) {
    // Neon возвращает rows напрямую
    sql = neon(connectionString, {
      fetchOptions: { cache: 'no-store' }
    });
  } else {
    // Slonik pool с обёрткой для единого API
    const pool = createPool(connectionString);
    sql = async (...args) => {
      const query = slonikSql.unsafe(...args);
      const result = await (await pool).connect(async (connection) => {
        return connection.query(query);
      });
      return result.rows.map(it => {
        
        if (typeof it === 'object' && it !== null) {
          for (const key in it) {
            it[key] = typeof it[key] === 'bigint' ? String(it[key]) : it[key];
          }
        }      
        return it      
      });
    };
  }
  return sql
}

export const sql = createSQLTag();

export const createTables = async (retries = 3) => {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
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
        return;
      } catch (err) {
        lastError = err;
        const delay = Math.pow(2, attempt) * 500;
        console.error(`❌ createTables failed (attempt ${attempt}/${retries}):`, err.message);
        if (attempt < retries) {
          console.log(`⏳ Retrying createTables in ${delay}ms...`);
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }
    throw lastError;
  }


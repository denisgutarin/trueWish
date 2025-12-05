// Используем разные драйверы в зависимости от окружения
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

let sql, pool;

async function initSql() {
  if (isVercel) {
    // Vercel - используем @vercel/postgres
    const { sql: vercelSql } = await import('@vercel/postgres');
    sql = vercelSql;
  } else {
    // Локально - используем pg
    const { Pool } = await import('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Создаем функцию sql совместимую с @vercel/postgres
    sql = {
      query: async (query, params) => {
        const result = await pool.query(query, params);
        return { rows: result.rows, rowCount: result.rowCount };
      }
    };
  }
}

/**
 * Wrapper для совместимости с SQLite API
 * Преобразует синхронные вызовы в асинхронные Postgres запросы
 */
class PostgresAdapter {
  constructor() {
    this.initialized = false;
    this.sqlInitialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // Инициализируем sql если еще не сделано
    if (!this.sqlInitialized) {
      await initSql();
      this.sqlInitialized = true;
    }
    
    // Инициализация таблиц при первом обращении
    const db = await import('./bot/database/db.js');
    await db.default.init();
    this.initialized = true;
  }

  /**
   * Подготовить запрос (эмуляция better-sqlite3 API)
   * Возвращает объект с методами .all(), .get(), .run()
   */
  prepare(query) {
    return {
      all: async (...params) => {
        await this.init();
        // Преобразовать ? в $1, $2, ...
        const pgQuery = this.convertPlaceholders(query);
        const result = await sql.query(pgQuery, params);
        return result.rows;
      },
      
      get: async (...params) => {
        await this.init();
        const pgQuery = this.convertPlaceholders(query);
        const result = await sql.query(pgQuery, params);
        return result.rows[0] || null;
      },
      
      run: async (...params) => {
        await this.init();
        const pgQuery = this.convertPlaceholders(query);
        const result = await sql.query(pgQuery, params);
        return { 
          changes: result.rowCount,
          lastInsertRowid: result.rows[0]?.id || null
        };
      }
    };
  }

  /**
   * Преобразовать ? placeholders в $1, $2, ...
   */
  convertPlaceholders(query) {
    let index = 1;
    return query.replace(/\?/g, () => `$${index++}`);
  }

  /**
   * Выполнить запрос напрямую (для совместимости)
   */
  async exec(query) {
    await this.init();
    return sql.query(query);
  }
}

let dbInstance = null;

/**
 * Получить подключение к БД
 * @returns {PostgresAdapter}
 */
export function getDb() {
  if (!dbInstance) {
    dbInstance = new PostgresAdapter();
  }
  return dbInstance;
}

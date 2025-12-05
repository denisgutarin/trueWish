#!/usr/bin/env node

/**
 * Fix PostgreSQL sequences after data migration
 * This resets all SERIAL sequences to continue from the maximum existing ID
 */

require('dotenv').config();
const { Pool } = require('pg');

async function fixSequences() {
  console.log('🔧 Fixing PostgreSQL sequences...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in environment');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to Postgres database\n');

    const tables = [
      { name: 'users', sequence: 'users_id_seq' },
      { name: 'topics', sequence: 'topics_id_seq' },
      { name: 'materials', sequence: 'materials_id_seq' },
      { name: 'user_topic_access', sequence: 'user_topic_access_id_seq' },
      { name: 'user_progress', sequence: 'user_progress_id_seq' },
      { name: 'user_answers', sequence: 'user_answers_id_seq' }
    ];

    for (const table of tables) {
      // Get max id from table
      const result = await pool.query(`SELECT MAX(id) as max_id FROM ${table.name}`);
      const maxId = result.rows[0].max_id || 0;
      
      if (maxId > 0) {
        // Reset sequence to max_id + 1
        await pool.query(`SELECT setval('${table.sequence}', ${maxId}, true)`);
        console.log(`✅ ${table.name}: sequence set to ${maxId + 1}`);
      } else {
        console.log(`⏭️  ${table.name}: no data, skipping`);
      }
    }

    console.log('\n✅ All sequences fixed successfully!');

  } catch (error) {
    console.error('\n❌ Error fixing sequences:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixSequences().catch(console.error);

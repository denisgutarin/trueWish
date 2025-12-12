#!/usr/bin/env node

/**
 * Initialize Vercel Postgres database
 * Run this after deploying to Vercel
 * 
 * Usage: node scripts/init-vercel-db.js
 * Make sure POSTGRES_URL is set in your environment
 */

import db from '../lib/bot/database/db.js';

async function init() {
  console.log('🔄 Initializing Vercel Postgres database...\n');

  try {
    await db.default.init();
    console.log('\n✅ Vercel database initialized successfully!');
    console.log('✅ All tables created');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error initializing database:', error);
    process.exit(1);
  }
}

init();

// Migration script to add new achievement columns to PostgreSQL database
const { Pool } = require('pg');
require('dotenv').config();

async function migrateAchievements() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('railway.app') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Starting achievement table migration...');

    // Check if columns already exist
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'achievement_settings'
      ORDER BY column_name
    `);

    console.log('📋 Current columns:', checkColumns.rows.map(r => r.column_name));

    // Add new columns if they don't exist
    const columnsToAdd = [
      'msg_100_role',
      'msg_5000_role',
      'msg_10000_role',
      'vc_30_role',
      'vc_500_role',
      'vc_1000_role',
      'vc_5000_role',
      'react_50_role',
      'react_250_role',
      'react_1000_role',
      'popular_100_role',
      'popular_500_role'
    ];

    for (const column of columnsToAdd) {
      try {
        await pool.query(`
          ALTER TABLE achievement_settings 
          ADD COLUMN IF NOT EXISTS ${column} TEXT
        `);
        console.log(`✅ Added column: ${column}`);
      } catch (err) {
        console.log(`⚠️  Column ${column} may already exist:`, err.message);
      }
    }

    // Verify all columns now exist
    const verifyColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'achievement_settings'
      ORDER BY column_name
    `);

    console.log('\n✅ Migration complete! Final columns:', verifyColumns.rows.map(r => r.column_name));

    // Expected columns
    const expectedColumns = [
      'guild_id',
      'msg_100_role',
      'msg_500_role',
      'msg_1000_role',
      'msg_5000_role',
      'msg_10000_role',
      'vc_30_role',
      'vc_60_role',
      'vc_500_role',
      'vc_1000_role',
      'vc_5000_role',
      'react_50_role',
      'react_250_role',
      'react_1000_role',
      'popular_100_role',
      'popular_500_role'
    ];

    const currentColumns = verifyColumns.rows.map(r => r.column_name).sort();
    const missing = expectedColumns.filter(col => !currentColumns.includes(col));
    
    if (missing.length > 0) {
      console.log('\n⚠️  Still missing columns:', missing);
    } else {
      console.log('\n✨ All 16 columns are present!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateAchievements();

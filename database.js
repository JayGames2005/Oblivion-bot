const Database = require('better-sqlite3');
const PostgresDatabase = require('./database-postgres');
const path = require('path');
const fs = require('fs');

// Check if we should use PostgreSQL (Railway) or SQLite (local)
const DATABASE_URL = process.env.DATABASE_URL;
const USE_POSTGRES = !!DATABASE_URL;

let db;
let isPostgres = false;
let statements = null;
let initPromise = null;

if (USE_POSTGRES) {
  console.log('🐘 Using PostgreSQL database');
  db = new PostgresDatabase(DATABASE_URL);
  isPostgres = true;
  
  // Initialize PostgreSQL tables
  console.log('⏳ Starting PostgreSQL table initialization...');
  initPromise = db.initialize()
    .then(() => console.log('✅ PostgreSQL tables initialized successfully'))
    .catch(err => {
      console.error('❌ Failed to initialize PostgreSQL:', err);
      process.exit(1);
    });
} else {
  console.log('💾 Using SQLite database');
  // Ensure data directory exists
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  db = new Database(path.join(dataDir, 'oblivion.db'));
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      prefix TEXT DEFAULT '!',
      mod_log_channel TEXT,
      mute_role TEXT,
      oblivion_log_channel TEXT,
      automod_anti_spam INTEGER DEFAULT 0,
      automod_anti_invite INTEGER DEFAULT 0,
      automod_anti_link INTEGER DEFAULT 0,
      automod_banned_words TEXT DEFAULT '[]',
      automod_anti_spam_action TEXT DEFAULT 'delete',
      automod_anti_invite_action TEXT DEFAULT 'delete',
      automod_anti_link_action TEXT DEFAULT 'delete',
      automod_banned_words_action TEXT DEFAULT 'delete',
      level_up_messages INTEGER DEFAULT 1,
      achievement_messages INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS mod_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      case_number INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      user_tag TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      moderator_tag TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(guild_id, case_number)
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mutes (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      expires_at INTEGER,
      reason TEXT,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS user_xp (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      messages INTEGER DEFAULT 0,
      last_message_at INTEGER DEFAULT 0,
      weekly_xp INTEGER DEFAULT 0,
      week_start INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS welcome_settings (
      guild_id TEXT PRIMARY KEY,
      welcome_enabled INTEGER DEFAULT 0,
      welcome_channel TEXT,
      welcome_message TEXT
    );

    CREATE TABLE IF NOT EXISTS achievement_settings (
      guild_id TEXT PRIMARY KEY,
      msg_100_role TEXT,
      msg_500_role TEXT,
      msg_1000_role TEXT,
      msg_5000_role TEXT,
      msg_10000_role TEXT,
      vc_30_role TEXT,
      vc_60_role TEXT,
      vc_500_role TEXT,
      vc_1000_role TEXT,
      vc_5000_role TEXT,
      react_50_role TEXT,
      react_250_role TEXT,
      react_1000_role TEXT,
      popular_100_role TEXT,
      popular_500_role TEXT
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      messages INTEGER DEFAULT 0,
      voice_minutes INTEGER DEFAULT 0,
      voice_joined_at INTEGER,
      reactions_given INTEGER DEFAULT 0,
      reactions_received INTEGER DEFAULT 0,
      achievements TEXT DEFAULT '',
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS user_achievement_roles (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS temp_vc_settings (
      guild_id TEXT PRIMARY KEY,
      creator_channel_id TEXT,
      category_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_mod_cases_guild ON mod_cases(guild_id);
    CREATE INDEX IF NOT EXISTS idx_mod_cases_user ON mod_cases(user_id);
    CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings(guild_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_mutes_expires ON mutes(expires_at);
    CREATE INDEX IF NOT EXISTS idx_user_xp_guild ON user_xp(guild_id);
    CREATE INDEX IF NOT EXISTS idx_user_xp_xp ON user_xp(guild_id, xp DESC);
    CREATE INDEX IF NOT EXISTS idx_user_xp_weekly ON user_xp(guild_id, weekly_xp DESC);
    CREATE INDEX IF NOT EXISTS idx_user_achievements_guild ON user_achievements(guild_id);
    CREATE INDEX IF NOT EXISTS idx_user_achievement_roles_user ON user_achievement_roles(guild_id, user_id);
  `);

  // Add new columns if they don't exist (migration)
  try {
    db.exec(`ALTER TABLE guild_settings ADD COLUMN oblivion_log_channel TEXT`);
  } catch (e) { /* Column already exists */ }
  try {
    db.exec(`ALTER TABLE guild_settings ADD COLUMN automod_anti_spam_action TEXT DEFAULT 'delete'`);
  } catch (e) { /* Column already exists */ }
  try {
    db.exec(`ALTER TABLE guild_settings ADD COLUMN automod_anti_invite_action TEXT DEFAULT 'delete'`);
  } catch (e) { /* Column already exists */ }
  try {
    db.exec(`ALTER TABLE guild_settings ADD COLUMN automod_anti_link_action TEXT DEFAULT 'delete'`);
  } catch (e) { /* Column already exists */ }
  try {
    db.exec(`ALTER TABLE guild_settings ADD COLUMN automod_banned_words_action TEXT DEFAULT 'delete'`);
  } catch (e) { /* Column already exists */ }
  try {
    db.exec(`ALTER TABLE guild_settings ADD COLUMN level_up_messages INTEGER DEFAULT 1`);
  } catch (e) { /* Column already exists */ }
  try {
    db.exec(`ALTER TABLE guild_settings ADD COLUMN achievement_messages INTEGER DEFAULT 1`);
  } catch (e) { /* Column already exists */ }

  // Prepared statements for better performance (SQLite only)
  statements = {
    // Guild Settings
    getGuildSettings: db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?'),
    setGuildSettings: db.prepare(`
      INSERT INTO guild_settings (guild_id, prefix, mod_log_channel, mute_role, automod_anti_spam, automod_anti_invite, automod_anti_link, automod_banned_words)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        prefix = excluded.prefix,
        mod_log_channel = excluded.mod_log_channel,
        mute_role = excluded.mute_role,
        automod_anti_spam = excluded.automod_anti_spam,
        automod_anti_invite = excluded.automod_anti_invite,
        automod_anti_link = excluded.automod_anti_link,
        automod_banned_words = excluded.automod_banned_words
    `),
    updateModLogChannel: db.prepare('UPDATE guild_settings SET mod_log_channel = ? WHERE guild_id = ?'),
    updateOblivionLogChannel: db.prepare('UPDATE guild_settings SET oblivion_log_channel = ? WHERE guild_id = ?'),
    updateAutomodAntiSpam: db.prepare('UPDATE guild_settings SET automod_anti_spam = ? WHERE guild_id = ?'),
    updateAutomodAntiInvite: db.prepare('UPDATE guild_settings SET automod_anti_invite = ? WHERE guild_id = ?'),
    updateAutomodAntiLink: db.prepare('UPDATE guild_settings SET automod_anti_link = ? WHERE guild_id = ?'),
    updateBannedWords: db.prepare('UPDATE guild_settings SET automod_banned_words = ? WHERE guild_id = ?'),
    updateLevelUpMessages: db.prepare('UPDATE guild_settings SET level_up_messages = ? WHERE guild_id = ?'),
    updateAchievementMessages: db.prepare('UPDATE guild_settings SET achievement_messages = ? WHERE guild_id = ?'),

    // Mod Cases
    createModCase: db.prepare(`
      INSERT INTO mod_cases (guild_id, case_number, user_id, user_tag, moderator_id, moderator_tag, action, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    getModCase: db.prepare('SELECT * FROM mod_cases WHERE guild_id = ? AND case_number = ?'),
    getAllModCases: db.prepare('SELECT * FROM mod_cases WHERE guild_id = ? ORDER BY case_number DESC'),
    getUserModCases: db.prepare('SELECT * FROM mod_cases WHERE guild_id = ? AND user_id = ? ORDER BY case_number DESC'),
    getNextCaseNumber: db.prepare('SELECT COALESCE(MAX(case_number), 0) + 1 as next FROM mod_cases WHERE guild_id = ?'),
    deleteCase: db.prepare('DELETE FROM mod_cases WHERE guild_id = ? AND case_number = ?'),

    // Warnings
    addWarning: db.prepare('INSERT INTO warnings (guild_id, user_id, moderator_id, reason, created_at) VALUES (?, ?, ?, ?, ?)'),
    getWarnings: db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC'),
    getWarningCount: db.prepare('SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?'),
    deleteWarning: db.prepare('DELETE FROM warnings WHERE id = ?'),
    clearWarnings: db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?'),

    // Mutes
    addMute: db.prepare('INSERT OR REPLACE INTO mutes (guild_id, user_id, expires_at, reason) VALUES (?, ?, ?, ?)'),
    getMute: db.prepare('SELECT * FROM mutes WHERE guild_id = ? AND user_id = ?'),
    removeMute: db.prepare('DELETE FROM mutes WHERE guild_id = ? AND user_id = ?'),
    getExpiredMutes: db.prepare('SELECT * FROM mutes WHERE expires_at IS NOT NULL AND expires_at <= ?'),
    
    // XP System
    addUserXP: db.prepare(`
      INSERT INTO user_xp (guild_id, user_id, xp, messages, last_message_at, weekly_xp, week_start)
      VALUES (?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        xp = xp + excluded.xp,
        messages = messages + 1,
        last_message_at = excluded.last_message_at,
        weekly_xp = CASE 
          WHEN week_start < excluded.week_start THEN excluded.weekly_xp
          ELSE weekly_xp + excluded.weekly_xp
        END,
        week_start = CASE
          WHEN week_start < excluded.week_start THEN excluded.week_start
          ELSE week_start
        END
    `),
    getUserXP: db.prepare('SELECT * FROM user_xp WHERE guild_id = ? AND user_id = ?'),
    getUserRank: db.prepare('SELECT COUNT(*) + 1 as rank FROM user_xp WHERE guild_id = ? AND xp > (SELECT COALESCE(xp, 0) FROM user_xp WHERE guild_id = ? AND user_id = ?)'),
    getAllTimeLeaderboard: db.prepare('SELECT user_id, xp, messages FROM user_xp WHERE guild_id = ? ORDER BY xp DESC LIMIT ?'),
    getWeeklyLeaderboard: db.prepare('SELECT user_id, weekly_xp as xp, messages FROM user_xp WHERE guild_id = ? AND weekly_xp > 0 ORDER BY weekly_xp DESC LIMIT ?'),
    
    // Welcome Settings
    getWelcomeSettings: db.prepare('SELECT * FROM welcome_settings WHERE guild_id = ?'),
    setWelcomeSettings: db.prepare(`
      INSERT INTO welcome_settings (guild_id, welcome_enabled, welcome_channel, welcome_message)
      VALUES (?, 1, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        welcome_enabled = 1,
        welcome_channel = excluded.welcome_channel,
        welcome_message = excluded.welcome_message
    `),
    disableWelcome: db.prepare('UPDATE welcome_settings SET welcome_enabled = 0 WHERE guild_id = ?'),
    
    // Achievement Settings
    getAchievementSettings: db.prepare('SELECT * FROM achievement_settings WHERE guild_id = ?'),
    setAchievementSettings: db.prepare(`
      INSERT INTO achievement_settings (guild_id, msg_100_role, msg_500_role, msg_1000_role, msg_5000_role, msg_10000_role, vc_30_role, vc_60_role, vc_500_role, vc_1000_role, vc_5000_role, react_50_role, react_250_role, react_1000_role, popular_100_role, popular_500_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        msg_100_role = excluded.msg_100_role,
        msg_500_role = excluded.msg_500_role,
        msg_1000_role = excluded.msg_1000_role,
        msg_5000_role = excluded.msg_5000_role,
        msg_10000_role = excluded.msg_10000_role,
        vc_30_role = excluded.vc_30_role,
        vc_60_role = excluded.vc_60_role,
        vc_500_role = excluded.vc_500_role,
        vc_1000_role = excluded.vc_1000_role,
        vc_5000_role = excluded.vc_5000_role,
        react_50_role = excluded.react_50_role,
        react_250_role = excluded.react_250_role,
        react_1000_role = excluded.react_1000_role,
        popular_100_role = excluded.popular_100_role,
        popular_500_role = excluded.popular_500_role
    `),
    
    // User Achievements
    getUserAchievements: db.prepare('SELECT * FROM user_achievements WHERE guild_id = ? AND user_id = ?'),
    incrementUserMessages: db.prepare(`
      INSERT INTO user_achievements (guild_id, user_id, messages)
      VALUES (?, ?, 1)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        messages = messages + 1
    `),
    setUserVoiceJoined: db.prepare(`
      INSERT INTO user_achievements (guild_id, user_id, voice_joined_at)
      VALUES (?, ?, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        voice_joined_at = excluded.voice_joined_at
    `),
    addUserVoiceTime: db.prepare(`
      INSERT INTO user_achievements (guild_id, user_id, voice_minutes, voice_joined_at)
      VALUES (?, ?, ?, NULL)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        voice_minutes = voice_minutes + excluded.voice_minutes,
        voice_joined_at = NULL
    `),
    incrementReactionsGiven: db.prepare(`
      INSERT INTO user_achievements (guild_id, user_id, reactions_given)
      VALUES (?, ?, 1)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        reactions_given = reactions_given + 1
    `),
    incrementReactionsReceived: db.prepare(`
      INSERT INTO user_achievements (guild_id, user_id, reactions_received)
      VALUES (?, ?, 1)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        reactions_received = reactions_received + 1
    `),

    // Achievement Role Persistence
    addAchievementRole: db.prepare(`
      INSERT INTO user_achievement_roles (guild_id, user_id, role_id)
      VALUES (?, ?, ?)
      ON CONFLICT(guild_id, user_id, role_id) DO NOTHING
    `),
    removeAchievementRole: db.prepare(`
      DELETE FROM user_achievement_roles
      WHERE guild_id = ? AND user_id = ? AND role_id = ?
    `),
    getUserAchievementRoles: db.prepare(`
      SELECT role_id FROM user_achievement_roles
      WHERE guild_id = ? AND user_id = ?
    `),

    // Temporary Voice Channels
    setTempVCChannel: db.prepare(`
      INSERT INTO temp_vc_settings (guild_id, creator_channel_id, category_id)
      VALUES (?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        creator_channel_id = excluded.creator_channel_id,
        category_id = excluded.category_id
    `),
    getTempVCSettings: db.prepare('SELECT * FROM temp_vc_settings WHERE guild_id = ?'),
    removeTempVCChannel: db.prepare('DELETE FROM temp_vc_settings WHERE guild_id = ?'),
    
    db: db
  };
}

module.exports = {
  db,
  statements,
  isPostgres,
  ready: () => initPromise || Promise.resolve()
};

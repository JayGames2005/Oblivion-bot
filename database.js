const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'oblivion.db'));

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
    automod_banned_words_action TEXT DEFAULT 'delete'
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

  CREATE INDEX IF NOT EXISTS idx_mod_cases_guild ON mod_cases(guild_id);
  CREATE INDEX IF NOT EXISTS idx_mod_cases_user ON mod_cases(user_id);
  CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings(guild_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_mutes_expires ON mutes(expires_at);
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

// Prepared statements for better performance
const statements = {
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
  getExpiredMutes: db.prepare('SELECT * FROM mutes WHERE expires_at IS NOT NULL AND expires_at <= ?')
};

module.exports = {
  db,
  statements
};

const { Pool } = require('pg');

class PostgresDatabase {
  constructor(connectionString) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    const client = await this.pool.connect();
    try {
      // Create tables
      await client.query(`
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
          id SERIAL PRIMARY KEY,
          guild_id TEXT NOT NULL,
          case_number INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          user_tag TEXT NOT NULL,
          moderator_id TEXT NOT NULL,
          moderator_tag TEXT NOT NULL,
          action TEXT NOT NULL,
          reason TEXT,
          created_at BIGINT NOT NULL,
          UNIQUE(guild_id, case_number)
        );

        CREATE TABLE IF NOT EXISTS warnings (
          id SERIAL PRIMARY KEY,
          guild_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          moderator_id TEXT NOT NULL,
          reason TEXT,
          created_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS mutes (
          guild_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          expires_at BIGINT,
          reason TEXT,
          PRIMARY KEY (guild_id, user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_mod_cases_guild ON mod_cases(guild_id);
        CREATE INDEX IF NOT EXISTS idx_mod_cases_user ON mod_cases(user_id);
        CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings(guild_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_mutes_expires ON mutes(expires_at);
      `);

      this.initialized = true;
      console.log('✅ PostgreSQL database initialized');
    } finally {
      client.release();
    }
  }

  // Guild Settings
  async getGuildSettings(guildId) {
    const result = await this.pool.query('SELECT * FROM guild_settings WHERE guild_id = $1', [guildId]);
    return result.rows[0];
  }

  async setGuildSettings(guildId, prefix, modLogChannel, muteRole, antiSpam, antiInvite, antiLink, bannedWords) {
    await this.pool.query(`
      INSERT INTO guild_settings (guild_id, prefix, mod_log_channel, mute_role, automod_anti_spam, automod_anti_invite, automod_anti_link, automod_banned_words)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT(guild_id) DO UPDATE SET
        prefix = EXCLUDED.prefix,
        mod_log_channel = EXCLUDED.mod_log_channel,
        mute_role = EXCLUDED.mute_role,
        automod_anti_spam = EXCLUDED.automod_anti_spam,
        automod_anti_invite = EXCLUDED.automod_anti_invite,
        automod_anti_link = EXCLUDED.automod_anti_link,
        automod_banned_words = EXCLUDED.automod_banned_words
    `, [guildId, prefix, modLogChannel, muteRole, antiSpam, antiInvite, antiLink, bannedWords]);
  }

  async updateModLogChannel(guildId, channelId) {
    await this.pool.query('UPDATE guild_settings SET mod_log_channel = $1 WHERE guild_id = $2', [channelId, guildId]);
  }

  async updateOblivionLogChannel(guildId, channelId) {
    await this.pool.query('UPDATE guild_settings SET oblivion_log_channel = $1 WHERE guild_id = $2', [channelId, guildId]);
  }

  async updateAutomodAntiSpam(guildId, enabled) {
    await this.pool.query('UPDATE guild_settings SET automod_anti_spam = $1 WHERE guild_id = $2', [enabled, guildId]);
  }

  async updateAutomodAntiInvite(guildId, enabled) {
    await this.pool.query('UPDATE guild_settings SET automod_anti_invite = $1 WHERE guild_id = $2', [enabled, guildId]);
  }

  async updateAutomodAntiLink(guildId, enabled) {
    await this.pool.query('UPDATE guild_settings SET automod_anti_link = $1 WHERE guild_id = $2', [enabled, guildId]);
  }

  async updateBannedWords(guildId, words) {
    await this.pool.query('UPDATE guild_settings SET automod_banned_words = $1 WHERE guild_id = $2', [words, guildId]);
  }

  // Mod Cases
  async createModCase(guildId, caseNumber, userId, userTag, moderatorId, moderatorTag, action, reason, createdAt) {
    await this.pool.query(`
      INSERT INTO mod_cases (guild_id, case_number, user_id, user_tag, moderator_id, moderator_tag, action, reason, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [guildId, caseNumber, userId, userTag, moderatorId, moderatorTag, action, reason, createdAt]);
  }

  async getModCase(guildId, caseNumber) {
    const result = await this.pool.query('SELECT * FROM mod_cases WHERE guild_id = $1 AND case_number = $2', [guildId, caseNumber]);
    return result.rows[0];
  }

  async getAllModCases(guildId) {
    const result = await this.pool.query('SELECT * FROM mod_cases WHERE guild_id = $1 ORDER BY case_number DESC', [guildId]);
    return result.rows;
  }

  async getUserModCases(guildId, userId) {
    const result = await this.pool.query('SELECT * FROM mod_cases WHERE guild_id = $1 AND user_id = $2 ORDER BY case_number DESC', [guildId, userId]);
    return result.rows;
  }

  async getNextCaseNumber(guildId) {
    const result = await this.pool.query('SELECT COALESCE(MAX(case_number), 0) + 1 as next FROM mod_cases WHERE guild_id = $1', [guildId]);
    return result.rows[0].next;
  }

  async deleteCase(guildId, caseNumber) {
    await this.pool.query('DELETE FROM mod_cases WHERE guild_id = $1 AND case_number = $2', [guildId, caseNumber]);
  }

  // Warnings
  async addWarning(guildId, userId, moderatorId, reason, createdAt) {
    await this.pool.query('INSERT INTO warnings (guild_id, user_id, moderator_id, reason, created_at) VALUES ($1, $2, $3, $4, $5)', 
      [guildId, userId, moderatorId, reason, createdAt]);
  }

  async getWarnings(guildId, userId) {
    const result = await this.pool.query('SELECT * FROM warnings WHERE guild_id = $1 AND user_id = $2 ORDER BY created_at DESC', [guildId, userId]);
    return result.rows;
  }

  async getWarningCount(guildId, userId) {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM warnings WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    return parseInt(result.rows[0].count);
  }

  async deleteWarning(id) {
    await this.pool.query('DELETE FROM warnings WHERE id = $1', [id]);
  }

  async clearWarnings(guildId, userId) {
    await this.pool.query('DELETE FROM warnings WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
  }

  // Mutes
  async addMute(guildId, userId, expiresAt, reason) {
    await this.pool.query('INSERT INTO mutes (guild_id, user_id, expires_at, reason) VALUES ($1, $2, $3, $4) ON CONFLICT (guild_id, user_id) DO UPDATE SET expires_at = EXCLUDED.expires_at, reason = EXCLUDED.reason',
      [guildId, userId, expiresAt, reason]);
  }

  async getMute(guildId, userId) {
    const result = await this.pool.query('SELECT * FROM mutes WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    return result.rows[0];
  }

  async removeMute(guildId, userId) {
    await this.pool.query('DELETE FROM mutes WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
  }

  async getExpiredMutes(timestamp) {
    const result = await this.pool.query('SELECT * FROM mutes WHERE expires_at IS NOT NULL AND expires_at <= $1', [timestamp]);
    return result.rows;
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = PostgresDatabase;

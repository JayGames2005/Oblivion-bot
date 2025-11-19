const { Pool } = require('pg');

class PostgresDatabase {
  constructor(connectionString) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Timeout connection attempts after 2 seconds
      statement_timeout: 2000, // Query timeout: 2 seconds
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
          automod_banned_words_action TEXT DEFAULT 'delete',
          level_up_messages INTEGER DEFAULT 1,
          achievement_messages INTEGER DEFAULT 1
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

        CREATE TABLE IF NOT EXISTS user_xp (
          guild_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          xp BIGINT DEFAULT 0,
          messages INTEGER DEFAULT 0,
          last_message_at BIGINT DEFAULT 0,
          weekly_xp BIGINT DEFAULT 0,
          week_start BIGINT DEFAULT 0,
          PRIMARY KEY (guild_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS welcome_settings (
          guild_id TEXT PRIMARY KEY,
          welcome_enabled BOOLEAN DEFAULT FALSE,
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
          voice_joined_at BIGINT,
          reactions_given INTEGER DEFAULT 0,
          reactions_received INTEGER DEFAULT 0,
          achievements TEXT DEFAULT '',
          PRIMARY KEY (guild_id, user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_mod_cases_guild ON mod_cases(guild_id);
        CREATE INDEX IF NOT EXISTS idx_mod_cases_user ON mod_cases(user_id);
        CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings(guild_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_mutes_expires ON mutes(expires_at);
        CREATE INDEX IF NOT EXISTS idx_user_xp_guild ON user_xp(guild_id);
        CREATE INDEX IF NOT EXISTS idx_user_xp_xp ON user_xp(guild_id, xp DESC);
        CREATE INDEX IF NOT EXISTS idx_user_xp_weekly ON user_xp(guild_id, weekly_xp DESC);
        CREATE INDEX IF NOT EXISTS idx_user_achievements_guild ON user_achievements(guild_id);
      `);

      // Auto-migrate achievement_settings table to add missing columns
      console.log('🔄 Checking achievement_settings schema...');
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
          await client.query(`
            ALTER TABLE achievement_settings 
            ADD COLUMN IF NOT EXISTS ${column} TEXT
          `);
        } catch (err) {
          // Column might already exist, ignore error
        }
      }
      console.log('✅ Achievement settings schema updated');

      // Auto-migrate guild_settings table for level_up_messages and achievement_messages columns
      try {
        await client.query(`
          ALTER TABLE guild_settings 
          ADD COLUMN IF NOT EXISTS level_up_messages INTEGER DEFAULT 1
        `);
        await client.query(`
          ALTER TABLE guild_settings 
          ADD COLUMN IF NOT EXISTS achievement_messages INTEGER DEFAULT 1
        `);
      } catch (err) {
        // Column might already exist, ignore error
      }

      // Auto-migrate user_achievements table to add missing columns
      console.log('🔄 Checking user_achievements schema...');
      const achievementColumns = [
        'messages INTEGER DEFAULT 0',
        'voice_minutes INTEGER DEFAULT 0',
        'voice_joined_at BIGINT',
        'reactions_given INTEGER DEFAULT 0',
        'reactions_received INTEGER DEFAULT 0',
        'achievements TEXT DEFAULT \'\''
      ];

      for (const columnDef of achievementColumns) {
        const columnName = columnDef.split(' ')[0];
        try {
          await client.query(`
            ALTER TABLE user_achievements 
            ADD COLUMN IF NOT EXISTS ${columnDef}
          `);
        } catch (err) {
          // Column might already exist, ignore error
        }
      }
      console.log('✅ User achievements schema updated');

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

  async updateModLogChannel(channelId, guildId) {
    await this.pool.query('UPDATE guild_settings SET mod_log_channel = $1 WHERE guild_id = $2', [channelId, guildId]);
  }

  async updateOblivionLogChannel(channelId, guildId) {
    await this.pool.query('UPDATE guild_settings SET oblivion_log_channel = $1 WHERE guild_id = $2', [channelId, guildId]);
  }

  async updateAutomodAntiSpam(enabled, guildId) {
    await this.pool.query('UPDATE guild_settings SET automod_anti_spam = $1 WHERE guild_id = $2', [enabled, guildId]);
  }

  async updateAutomodAntiInvite(enabled, guildId) {
    await this.pool.query('UPDATE guild_settings SET automod_anti_invite = $1 WHERE guild_id = $2', [enabled, guildId]);
  }

  async updateAutomodAntiLink(enabled, guildId) {
    await this.pool.query('UPDATE guild_settings SET automod_anti_link = $1 WHERE guild_id = $2', [enabled, guildId]);
  }

  async updateLevelUpMessages(enabled, guildId) {
    await this.pool.query('UPDATE guild_settings SET level_up_messages = $1 WHERE guild_id = $2', [enabled, guildId]);
  }

  async updateAchievementMessages(enabled, guildId) {
    await this.pool.query('UPDATE guild_settings SET achievement_messages = $1 WHERE guild_id = $2', [enabled, guildId]);
  }

  async updateBannedWords(words, guildId) {
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

  // XP System
  async addUserXP(guildId, userId, xpToAdd) {
    const now = Date.now();
    const weekStart = now - (now % (7 * 24 * 60 * 60 * 1000)); // Start of current week

    const result = await this.pool.query(`
      INSERT INTO user_xp (guild_id, user_id, xp, messages, last_message_at, weekly_xp, week_start)
      VALUES ($1, $2, $3, 1, $4, $3, $5)
      ON CONFLICT (guild_id, user_id) DO UPDATE SET
        xp = user_xp.xp + $3,
        messages = user_xp.messages + 1,
        last_message_at = $4,
        weekly_xp = CASE 
          WHEN user_xp.week_start < $5 THEN $3
          ELSE user_xp.weekly_xp + $3
        END,
        week_start = CASE
          WHEN user_xp.week_start < $5 THEN $5
          ELSE user_xp.week_start
        END
      RETURNING xp
    `, [guildId, userId, xpToAdd, now, weekStart]);

    return result.rows[0];
  }

  async getUserXP(guildId, userId) {
    const result = await this.pool.query('SELECT * FROM user_xp WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    return result.rows[0];
  }

  async getUserRank(guildId, userId) {
    const result = await this.pool.query(
      'SELECT COUNT(*) + 1 as rank FROM user_xp WHERE guild_id = $1 AND xp > (SELECT COALESCE(xp, 0) FROM user_xp WHERE guild_id = $1 AND user_id = $2)',
      [guildId, userId]
    );
    return parseInt(result.rows[0].rank);
  }

  async getAllTimeLeaderboard(guildId, limit = 100) {
    const result = await this.pool.query('SELECT user_id, xp, messages FROM user_xp WHERE guild_id = $1 ORDER BY xp DESC LIMIT $2', [guildId, limit]);
    return result.rows;
  }

  async getWeeklyLeaderboard(guildId, limit = 100) {
    const weekStart = Date.now() - (Date.now() % (7 * 24 * 60 * 60 * 1000));
    const result = await this.pool.query(
      'SELECT user_id, weekly_xp as xp, messages FROM user_xp WHERE guild_id = $1 AND week_start >= $2 ORDER BY weekly_xp DESC LIMIT $3',
      [guildId, weekStart, limit]
    );
    return result.rows;
  }

  // Welcome Settings
  async getWelcomeSettings(guildId) {
    const result = await this.pool.query('SELECT * FROM welcome_settings WHERE guild_id = $1', [guildId]);
    return result.rows[0];
  }

  async setWelcomeSettings(guildId, channelId, message) {
    await this.pool.query(`
      INSERT INTO welcome_settings (guild_id, welcome_enabled, welcome_channel, welcome_message)
      VALUES ($1, TRUE, $2, $3)
      ON CONFLICT (guild_id) DO UPDATE SET
        welcome_enabled = TRUE,
        welcome_channel = EXCLUDED.welcome_channel,
        welcome_message = EXCLUDED.welcome_message
    `, [guildId, channelId, message]);
  }

  async disableWelcome(guildId) {
    await this.pool.query('UPDATE welcome_settings SET welcome_enabled = FALSE WHERE guild_id = $1', [guildId]);
  }

  // Achievement Settings
  async getAchievementSettings(guildId) {
    const result = await this.pool.query('SELECT * FROM achievement_settings WHERE guild_id = $1', [guildId]);
    return result.rows[0];
  }

  async setAchievementSettings(guildId, msg100, msg500, msg1000, msg5000, msg10000, vc30, vc60, vc500, vc1000, vc5000, react50, react250, react1000, popular100, popular500) {
    await this.pool.query(`
      INSERT INTO achievement_settings (guild_id, msg_100_role, msg_500_role, msg_1000_role, msg_5000_role, msg_10000_role, vc_30_role, vc_60_role, vc_500_role, vc_1000_role, vc_5000_role, react_50_role, react_250_role, react_1000_role, popular_100_role, popular_500_role)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (guild_id) DO UPDATE SET
        msg_100_role = EXCLUDED.msg_100_role,
        msg_500_role = EXCLUDED.msg_500_role,
        msg_1000_role = EXCLUDED.msg_1000_role,
        msg_5000_role = EXCLUDED.msg_5000_role,
        msg_10000_role = EXCLUDED.msg_10000_role,
        vc_30_role = EXCLUDED.vc_30_role,
        vc_60_role = EXCLUDED.vc_60_role,
        vc_500_role = EXCLUDED.vc_500_role,
        vc_1000_role = EXCLUDED.vc_1000_role,
        vc_5000_role = EXCLUDED.vc_5000_role,
        react_50_role = EXCLUDED.react_50_role,
        react_250_role = EXCLUDED.react_250_role,
        react_1000_role = EXCLUDED.react_1000_role,
        popular_100_role = EXCLUDED.popular_100_role,
        popular_500_role = EXCLUDED.popular_500_role
    `, [guildId, msg100, msg500, msg1000, msg5000, msg10000, vc30, vc60, vc500, vc1000, vc5000, react50, react250, react1000, popular100, popular500]);
  }

  // User Achievements
  async getUserAchievements(guildId, userId) {
    const result = await this.pool.query('SELECT * FROM user_achievements WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    return result.rows[0];
  }

  async incrementUserMessages(guildId, userId) {
    await this.pool.query(`
      INSERT INTO user_achievements (guild_id, user_id, messages)
      VALUES ($1, $2, 1)
      ON CONFLICT (guild_id, user_id) DO UPDATE SET
        messages = user_achievements.messages + 1
    `, [guildId, userId]);
  }

  async setUserVoiceJoined(guildId, userId, timestamp) {
    await this.pool.query(`
      INSERT INTO user_achievements (guild_id, user_id, voice_joined_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (guild_id, user_id) DO UPDATE SET
        voice_joined_at = EXCLUDED.voice_joined_at
    `, [guildId, userId, timestamp]);
  }

  async addUserVoiceTime(guildId, userId, minutes) {
    await this.pool.query(`
      INSERT INTO user_achievements (guild_id, user_id, voice_minutes, voice_joined_at)
      VALUES ($1, $2, $3, NULL)
      ON CONFLICT (guild_id, user_id) DO UPDATE SET
        voice_minutes = user_achievements.voice_minutes + $3,
        voice_joined_at = NULL
    `, [guildId, userId, minutes]);
  }

  async incrementReactionsGiven(guildId, userId) {
    await this.pool.query(`
      INSERT INTO user_achievements (guild_id, user_id, reactions_given)
      VALUES ($1, $2, 1)
      ON CONFLICT (guild_id, user_id) DO UPDATE SET
        reactions_given = user_achievements.reactions_given + 1
    `, [guildId, userId]);
  }

  async incrementReactionsReceived(guildId, userId) {
    await this.pool.query(`
      INSERT INTO user_achievements (guild_id, user_id, reactions_received)
      VALUES ($1, $2, 1)
      ON CONFLICT (guild_id, user_id) DO UPDATE SET
        reactions_received = user_achievements.reactions_received + 1
    `, [guildId, userId]);
  }

  async addUserAchievement(guildId, userId, achievement) {
    const userData = await this.getUserAchievements(guildId, userId);
    const currentAchievements = userData && userData.achievements ? userData.achievements.split(',').filter(a => a) : [];
    
    if (!currentAchievements.includes(achievement)) {
      currentAchievements.push(achievement);
      await this.pool.query(`
        INSERT INTO user_achievements (guild_id, user_id, achievements)
        VALUES ($1, $2, $3)
        ON CONFLICT (guild_id, user_id) DO UPDATE SET
          achievements = EXCLUDED.achievements
      `, [guildId, userId, currentAchievements.join(',')]);
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = PostgresDatabase;

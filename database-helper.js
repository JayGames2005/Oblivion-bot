
// Unified database helper that works with both SQLite and PostgreSQL
const { db, statements, isPostgres } = require('./database');

// Helper to execute database operations with unified interface
class DatabaseHelper {

  static async updateBannedWordsAction(guildId, action) {
    if (isPostgres) {
      await db.updateBannedWordsAction(action, guildId);
    } else {
      statements.updateBannedWordsAction.run(action, guildId);
    }
  }
  // Guild Settings
  static async getGuildSettings(guildId) {
    if (isPostgres) {
      return await db.getGuildSettings(guildId);
    } else {
      return statements.getGuildSettings.get(guildId);
    }
  }

  static async setGuildSettings(guildId, prefix, modLogChannel, muteRole, antiSpam, antiInvite, antiLink, bannedWords) {
    if (isPostgres) {
      await db.setGuildSettings(guildId, prefix, modLogChannel, muteRole, antiSpam, antiInvite, antiLink, bannedWords);
    } else {
      statements.setGuildSettings.run(guildId, prefix, modLogChannel, muteRole, antiSpam, antiInvite, antiLink, bannedWords);
    }
  }

  static async updateModLogChannel(guildId, channelId) {
    if (isPostgres) {
      await db.updateModLogChannel(channelId, guildId);
    } else {
      statements.updateModLogChannel.run(channelId, guildId);
    }
  }

  static async updateOblivionLogChannel(guildId, channelId) {
    if (isPostgres) {
      await db.updateOblivionLogChannel(channelId, guildId);
    } else {
      statements.updateOblivionLogChannel.run(channelId, guildId);
    }
  }

  static async updateAutomodAntiSpam(guildId, enabled) {
    if (isPostgres) {
      await db.updateAutomodAntiSpam(enabled, guildId);
    } else {
      statements.updateAutomodAntiSpam.run(enabled, guildId);
    }
  }

  static async updateAutomodAntiInvite(guildId, enabled) {
    if (isPostgres) {
      await db.updateAutomodAntiInvite(enabled, guildId);
    } else {
      statements.updateAutomodAntiInvite.run(enabled, guildId);
    }
  }

  static async updateAutomodAntiLink(guildId, enabled) {
    if (isPostgres) {
      await db.updateAutomodAntiLink(enabled, guildId);
    } else {
      statements.updateAutomodAntiLink.run(enabled, guildId);
    }
  }

  static async updateBannedWords(guildId, words) {
    if (isPostgres) {
      await db.updateBannedWords(words, guildId);
    } else {
      statements.updateBannedWords.run(words, guildId);
    }
  }

  static async updateLevelUpMessages(guildId, enabled) {
    if (isPostgres) {
      await db.updateLevelUpMessages(enabled, guildId);
    } else {
      statements.updateLevelUpMessages.run(enabled, guildId);
    }
  }

  static async updateAchievementMessages(guildId, enabled) {
    if (isPostgres) {
      await db.updateAchievementMessages(enabled, guildId);
    } else {
      statements.updateAchievementMessages.run(enabled, guildId);
    }
  }
  // Mod Cases
  static async createModCase(guildId, caseNumber, userId, userTag, moderatorId, moderatorTag, action, reason, createdAt) {
    if (isPostgres) {
      await db.createModCase(guildId, caseNumber, userId, userTag, moderatorId, moderatorTag, action, reason, createdAt);
    } else {
      statements.createModCase.run(guildId, caseNumber, userId, userTag, moderatorId, moderatorTag, action, reason, createdAt);
    }
  }

  static async getModCase(guildId, caseNumber) {
    if (isPostgres) {
      return await db.getModCase(guildId, caseNumber);
    } else {
      return statements.getModCase.get(guildId, caseNumber);
    }
  }

  static async getAllModCases(guildId) {
    if (isPostgres) {
      return await db.getAllModCases(guildId);
    } else {
      return statements.getAllModCases.all(guildId);
    }
  }

  static async getUserModCases(guildId, userId) {
    if (isPostgres) {
      return await db.getUserModCases(guildId, userId);
    } else {
      return statements.getUserModCases.all(guildId, userId);
    }
  }

  static async getNextCaseNumber(guildId) {
    if (isPostgres) {
      return await db.getNextCaseNumber(guildId);
    } else {
      return statements.getNextCaseNumber.get(guildId).next;
    }
  }

  static async deleteCase(guildId, caseNumber) {
    if (isPostgres) {
      await db.deleteCase(guildId, caseNumber);
    } else {
      statements.deleteCase.run(guildId, caseNumber);
    }
  }

  // Warnings
  static async addWarning(guildId, userId, moderatorId, reason, createdAt) {
    if (isPostgres) {
      await db.addWarning(guildId, userId, moderatorId, reason, createdAt);
    } else {
      statements.addWarning.run(guildId, userId, moderatorId, reason, createdAt);
    }
  }

  static async getWarnings(guildId, userId) {
    if (isPostgres) {
      return await db.getWarnings(guildId, userId);
    } else {
      return statements.getWarnings.all(guildId, userId);
    }
  }

  static async getWarningCount(guildId, userId) {
    if (isPostgres) {
      return await db.getWarningCount(guildId, userId);
    } else {
      return statements.getWarningCount.get(guildId, userId).count;
    }
  }

  static async deleteWarning(id) {
    if (isPostgres) {
      await db.deleteWarning(id);
    } else {
      statements.deleteWarning.run(id);
    }
  }

  static async clearWarnings(guildId, userId) {
    if (isPostgres) {
      await db.clearWarnings(guildId, userId);
    } else {
      statements.clearWarnings.run(guildId, userId);
    }
  }

  // Mutes
  static async addMute(guildId, userId, expiresAt, reason) {
    if (isPostgres) {
      await db.addMute(guildId, userId, expiresAt, reason);
    } else {
      statements.addMute.run(guildId, userId, expiresAt, reason);
    }
  }

  static async getMute(guildId, userId) {
    if (isPostgres) {
      return await db.getMute(guildId, userId);
    } else {
      return statements.getMute.get(guildId, userId);
    }
  }

  static async removeMute(guildId, userId) {
    if (isPostgres) {
      await db.removeMute(guildId, userId);
    } else {
      statements.removeMute.run(guildId, userId);
    }
  }

  static async getExpiredMutes(timestamp) {
    if (isPostgres) {
      return await db.getExpiredMutes(timestamp);
    } else {
      return statements.getExpiredMutes.all(timestamp);
    }
  }

  // XP System
  static async addUserXP(guildId, userId, xpToAdd) {
    const now = Date.now();
    const weekStart = now - (now % (7 * 24 * 60 * 60 * 1000));

    if (isPostgres) {
      return await db.addUserXP(guildId, userId, xpToAdd);
    } else {
      const result = statements.addUserXP.run(guildId, userId, xpToAdd, now, xpToAdd, weekStart);
      const userData = statements.getUserXP.get(guildId, userId);
      return userData;
    }
  }

  static async getUserXP(guildId, userId) {
    if (isPostgres) {
      return await db.getUserXP(guildId, userId);
    } else {
      return statements.getUserXP.get(guildId, userId);
    }
  }

  static async getUserRank(guildId, userId) {
    if (isPostgres) {
      return await db.getUserRank(guildId, userId);
    } else {
      const result = statements.getUserRank.get(guildId, guildId, userId);
      return result ? result.rank : 0;
    }
  }

  static async getAllTimeLeaderboard(guildId, limit = 100) {
    if (isPostgres) {
      return await db.getAllTimeLeaderboard(guildId, limit);
    } else {
      return statements.getAllTimeLeaderboard.all(guildId, limit);
    }
  }

  static async getWeeklyLeaderboard(guildId, limit = 100) {
    if (isPostgres) {
      return await db.getWeeklyLeaderboard(guildId, limit);
    } else {
      return statements.getWeeklyLeaderboard.all(guildId, limit);
    }
  }

  // Welcome Settings
  static async getWelcomeSettings(guildId) {
    if (isPostgres) {
      return await db.getWelcomeSettings(guildId);
    } else {
      return statements.getWelcomeSettings.get(guildId);
    }
  }

  static async setWelcomeSettings(guildId, channelId, message) {
    if (isPostgres) {
      await db.setWelcomeSettings(guildId, channelId, message);
    } else {
      statements.setWelcomeSettings.run(guildId, channelId, message);
    }
  }

  static async disableWelcome(guildId) {
    if (isPostgres) {
      await db.disableWelcome(guildId);
    } else {
      statements.disableWelcome.run(guildId);
    }
  }

  // Achievement Settings
  static async getAchievementSettings(guildId) {
    if (isPostgres) {
      return await db.getAchievementSettings(guildId);
    } else {
      return statements.getAchievementSettings.get(guildId);
    }
  }

  static async setAchievementSettings(guildId, msg100, msg500, msg1000, msg5000, msg10000, vc30, vc60, vc500, vc1000, vc5000, react50, react250, react1000, popular100, popular500) {
    if (isPostgres) {
      await db.setAchievementSettings(guildId, msg100, msg500, msg1000, msg5000, msg10000, vc30, vc60, vc500, vc1000, vc5000, react50, react250, react1000, popular100, popular500);
    } else {
      statements.setAchievementSettings.run(guildId, msg100, msg500, msg1000, msg5000, msg10000, vc30, vc60, vc500, vc1000, vc5000, react50, react250, react1000, popular100, popular500);
    }
  }

  // User Achievements
  static async getUserAchievements(guildId, userId) {
    if (isPostgres) {
      return await db.getUserAchievements(guildId, userId);
    } else {
      return statements.getUserAchievements.get(guildId, userId);
    }
  }

  static async incrementUserMessages(guildId, userId) {
    if (isPostgres) {
      await db.incrementUserMessages(guildId, userId);
    } else {
      statements.incrementUserMessages.run(guildId, userId);
    }
  }

  static async setUserVoiceJoined(guildId, userId, timestamp) {
    if (isPostgres) {
      await db.setUserVoiceJoined(guildId, userId, timestamp);
    } else {
      statements.setUserVoiceJoined.run(guildId, userId, timestamp);
    }
  }

  static async addUserVoiceTime(guildId, userId, minutes) {
    if (isPostgres) {
      await db.addUserVoiceTime(guildId, userId, minutes);
    } else {
      statements.addUserVoiceTime.run(guildId, userId, minutes);
    }
  }

  static async incrementReactionsGiven(guildId, userId) {
    if (isPostgres) {
      await db.incrementReactionsGiven(guildId, userId);
    } else {
      statements.incrementReactionsGiven.run(guildId, userId);
    }
  }

  static async incrementReactionsReceived(guildId, userId) {
    if (isPostgres) {
      await db.incrementReactionsReceived(guildId, userId);
    } else {
      statements.incrementReactionsReceived.run(guildId, userId);
    }
  }

  static async addUserAchievement(guildId, userId, achievement) {
    if (isPostgres) {
      await db.addUserAchievement(guildId, userId, achievement);
    } else {
      const userData = statements.getUserAchievements.get(guildId, userId);
      const currentAchievements = userData && userData.achievements ? userData.achievements.split(',').filter(a => a) : [];
      
      if (!currentAchievements.includes(achievement)) {
        currentAchievements.push(achievement);
        statements.db.prepare(`
          INSERT INTO user_achievements (guild_id, user_id, achievements)
          VALUES (?, ?, ?)
          ON CONFLICT(guild_id, user_id) DO UPDATE SET achievements = excluded.achievements
        `).run(guildId, userId, currentAchievements.join(','));
      }
    }
  }

  static async setUserAchievementStats(guildId, userId, messages, voiceMinutes, reactionsGiven, reactionsReceived, achievements) {
    if (isPostgres) {
      await db.pool.query(`
        INSERT INTO user_achievements (guild_id, user_id, messages, voice_minutes, reactions_given, reactions_received, achievements)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (guild_id, user_id) DO UPDATE SET
          messages = EXCLUDED.messages,
          voice_minutes = EXCLUDED.voice_minutes,
          reactions_given = EXCLUDED.reactions_given,
          reactions_received = EXCLUDED.reactions_received,
          achievements = EXCLUDED.achievements
      `, [guildId, userId, messages, voiceMinutes, reactionsGiven, reactionsReceived, achievements]);
    } else {
      statements.db.prepare(`
        INSERT INTO user_achievements (guild_id, user_id, messages, voice_minutes, reactions_given, reactions_received, achievements)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET
          messages = excluded.messages,
          voice_minutes = excluded.voice_minutes,
          reactions_given = excluded.reactions_given,
          reactions_received = excluded.reactions_received,
          achievements = excluded.achievements
      `).run(guildId, userId, messages, voiceMinutes, reactionsGiven, reactionsReceived, achievements);
    }
  }

  // Achievement Role Persistence
  static async addAchievementRole(guildId, userId, roleId) {
    if (isPostgres) {
      await db.addAchievementRole(guildId, userId, roleId);
    } else {
      statements.addAchievementRole.run(guildId, userId, roleId);
    }
  }

  static async removeAchievementRole(guildId, userId, roleId) {
    if (isPostgres) {
      await db.removeAchievementRole(guildId, userId, roleId);
    } else {
      statements.removeAchievementRole.run(guildId, userId, roleId);
    }
  }

  static async getUserAchievementRoles(guildId, userId) {
    if (isPostgres) {
      return await db.getUserAchievementRoles(guildId, userId);
    } else {
      const rows = statements.getUserAchievementRoles.all(guildId, userId);
      return rows.map(row => row.role_id);
    }
  }

  // Temporary Voice Channels
  static async setTempVCChannel(guildId, creatorChannelId, categoryId) {
    if (isPostgres) {
      await db.setTempVCChannel(guildId, creatorChannelId, categoryId);
    } else {
      statements.setTempVCChannel.run(guildId, creatorChannelId, categoryId);
    }
  }

  static async getTempVCSettings(guildId) {
    if (isPostgres) {
      return await db.getTempVCSettings(guildId);
    } else {
      return statements.getTempVCSettings.get(guildId);
    }
  }

  static async removeTempVCChannel(guildId) {
    if (isPostgres) {
      await db.removeTempVCChannel(guildId);
    } else {
      statements.removeTempVCChannel.run(guildId);
    }
  }
}

module.exports = DatabaseHelper;

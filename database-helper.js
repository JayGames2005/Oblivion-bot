// Unified database helper that works with both SQLite and PostgreSQL
const { db, statements, isPostgres } = require('./database');

// Helper to execute database operations with unified interface
class DatabaseHelper {
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
}

module.exports = DatabaseHelper;

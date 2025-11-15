const { statements } = require('../database');
const Logger = require('./logger');

// Track message spam
const messageCache = new Map();

class AutoMod {
  /**
   * Check message for automod violations
   */
  static async checkMessage(message) {
    if (!message.guild || message.author.bot) return;

    // Get guild settings
    const settings = statements.getGuildSettings.get(message.guild.id);
    if (!settings) return;

    // Check anti-spam
    if (settings.automod_anti_spam) {
      const isSpam = this.checkSpam(message);
      if (isSpam) {
        await this.handleViolation(message, 'spam', settings.automod_anti_spam_action || 'delete');
        return true;
      }
    }

    // Check anti-invite
    if (settings.automod_anti_invite) {
      const hasInvite = this.checkInvite(message.content);
      if (hasInvite) {
        await this.handleViolation(message, 'invite', settings.automod_anti_invite_action || 'delete');
        return true;
      }
    }

    // Check anti-link
    if (settings.automod_anti_link) {
      const hasLink = this.checkLink(message.content);
      if (hasLink) {
        await this.handleViolation(message, 'link', settings.automod_anti_link_action || 'delete');
        return true;
      }
    }

    // Check banned words
    const bannedWords = JSON.parse(settings.automod_banned_words || '[]');
    if (bannedWords.length > 0) {
      const hasBannedWord = this.checkBannedWords(message.content, bannedWords);
      if (hasBannedWord) {
        await this.handleViolation(message, 'banned word', settings.automod_banned_words_action || 'delete');
        return true;
      }
    }

    return false;
  }

  /**
   * Check for spam (multiple messages in short time)
   */
  static checkSpam(message) {
    const key = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    
    if (!messageCache.has(key)) {
      messageCache.set(key, []);
    }

    const userMessages = messageCache.get(key);
    
    // Remove messages older than 5 seconds
    while (userMessages.length > 0 && now - userMessages[0] > 5000) {
      userMessages.shift();
    }

    userMessages.push(now);

    // If user sent more than 5 messages in 5 seconds, it's spam
    if (userMessages.length > 5) {
      messageCache.delete(key);
      return true;
    }

    return false;
  }

  /**
   * Check for Discord invites
   */
  static checkInvite(content) {
    const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+/gi;
    return inviteRegex.test(content);
  }

  /**
   * Check for links
   */
  static checkLink(content) {
    const linkRegex = /(https?:\/\/[^\s]+)/gi;
    return linkRegex.test(content);
  }

  /**
   * Check for banned words
   */
  static checkBannedWords(content, bannedWords) {
    const lowerContent = content.toLowerCase();
    return bannedWords.some(word => lowerContent.includes(word.toLowerCase()));
  }

  /**
   * Handle automod violation
   */
  static async handleViolation(message, type, action = 'delete') {
    try {
      let shouldDelete = action === 'delete' || action === 'both';
      let shouldWarn = action === 'warn' || action === 'both';

      // Delete the message if needed
      if (shouldDelete) {
        await message.delete().catch(err => console.error('Failed to delete message:', err));
      }

      // Warn the user if needed
      if (shouldWarn) {
        // Add warning to database
        statements.addWarning.run(
          message.guild.id,
          message.author.id,
          message.client.user.id,
          `AutoMod violation: ${type}`
        );

        // Get warning count
        const warnings = statements.getWarnings.all(message.guild.id, message.author.id);

        // Log the warning
        await Logger.logAction(
          message.guild,
          'Warn',
          message.author,
          message.client.user,
          `AutoMod violation: ${type}\nContent: ${message.content.substring(0, 100)}\nTotal Warnings: ${warnings.length}`
        );
      }

      // Send notification to user
      const actionText = action === 'both' ? 'deleted and you have been warned' : 
                        action === 'warn' ? 'you have been warned' : 'deleted';
      
      const warningMsg = await message.channel.send({
        content: `${message.author}, your message was ${actionText} for violating automod rules: **${type}**`
      });

      // Delete notification after 5 seconds
      setTimeout(() => {
        warningMsg.delete().catch(() => {});
      }, 5000);

      // Log to mod log if only deleting (warnings already logged above)
      if (!shouldWarn && message.guild.members.me) {
        await Logger.logAction(
          message.guild,
          'AutoMod',
          message.author,
          message.guild.members.me.user,
          `AutoMod violation: ${type}\nContent: ${message.content.substring(0, 100)}`
        );
      }
    } catch (error) {
      console.error('Error handling automod violation:', error);
    }
  }

  /**
   * Clean up old cache entries (call periodically)
   */
  static cleanupCache() {
    const now = Date.now();
    for (const [key, messages] of messageCache.entries()) {
      if (messages.length === 0 || now - messages[messages.length - 1] > 10000) {
        messageCache.delete(key);
      }
    }
  }
}

// Cleanup cache every minute
setInterval(() => AutoMod.cleanupCache(), 60000);

module.exports = AutoMod;

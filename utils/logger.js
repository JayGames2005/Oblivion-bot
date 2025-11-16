const { EmbedBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

class Logger {
  /**
   * Log a moderation action
   */
  static async logAction(guild, action, user, moderator, reason, duration = null) {
    try {
      // Create case number
      const caseNumber = await DatabaseHelper.getNextCaseNumber(guild.id);

      // Save to database (always create the case)
      await DatabaseHelper.createModCase(
        guild.id,
        caseNumber,
        user.id,
        user.tag,
        moderator.id,
        moderator.tag,
        action,
        reason || 'No reason provided',
        Date.now()
      );

      // Try to send to log channel if configured
      const settings = await DatabaseHelper.getGuildSettings(guild.id);
      
      if (settings && settings.mod_log_channel) {
        const logChannel = guild.channels.cache.get(settings.mod_log_channel);
        
        if (logChannel) {
          // Create embed
          const embed = new EmbedBuilder()
            .setTitle(`${this.getActionEmoji(action)} Case #${caseNumber} | ${action}`)
            .setColor(this.getActionColor(action))
            .addFields(
              { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
              { name: '👮 Moderator', value: `${moderator.tag} (${moderator.id})`, inline: true },
              { name: '📝 Reason', value: reason || 'No reason provided', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Case ${caseNumber}` });

          if (duration) {
            embed.addFields({ name: '⏱️ Duration', value: duration, inline: false });
          }

          await logChannel.send({ embeds: [embed] });
        }
      }
      
      return caseNumber;
    } catch (error) {
      console.error('Error logging action:', error);
      return null;
    }
  }

  /**
   * Get emoji for action type
   */
  static getActionEmoji(action) {
    const emojis = {
      'ban': '🔨',
      'unban': '🔓',
      'kick': '👢',
      'mute': '🔇',
      'unmute': '🔊',
      'warn': '⚠️',
      'unwarn': '✅'
    };
    return emojis[action.toLowerCase()] || '📋';
  }

  /**
   * Get color for action type
   */
  static getActionColor(action) {
    const colors = {
      'ban': 0xFF0000,      // Red
      'unban': 0x00FF00,    // Green
      'kick': 0xFF6600,     // Orange
      'mute': 0xFFFF00,     // Yellow
      'unmute': 0x00FFFF,   // Cyan
      'warn': 0xFFCC00,     // Gold
      'unwarn': 0x00FF00    // Green
    };
    return colors[action.toLowerCase()] || 0x3498DB; // Default Blue
  }

  /**
   * Create a simple embed
   */
  static createEmbed(title, description, color = 0x3498DB) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();
  }

  /**
   * Create success embed
   */
  static success(description) {
    return this.createEmbed('✅ Success', description, 0x00FF00);
  }

  /**
   * Create error embed
   */
  static error(description) {
    return this.createEmbed('❌ Error', description, 0xFF0000);
  }

  /**
   * Create warning embed
   */
  static warning(description) {
    return this.createEmbed('⚠️ Warning', description, 0xFFCC00);
  }

  /**
   * Create info embed
   */
  static info(description) {
    return this.createEmbed('ℹ️ Information', description, 0x3498DB);
  }
}

module.exports = Logger;

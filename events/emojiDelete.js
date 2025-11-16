const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  name: Events.GuildEmojiDelete,
  async execute(emoji) {
    try {
      // Get guild settings
      const settings = await DatabaseHelper.getGuildSettings(emoji.guild.id);
      if (!settings || !settings.oblivion_log_channel) return;

      const logChannel = emoji.guild.channels.cache.get(settings.oblivion_log_channel);
      if (!logChannel) return;

      // Get audit log to see who deleted the emoji
      let executor = null;
      try {
        const auditLogs = await emoji.guild.fetchAuditLogs({
          type: AuditLogEvent.EmojiDelete,
          limit: 1
        });
        const log = auditLogs.entries.first();
        if (log && log.target.id === emoji.id) {
          executor = log.executor;
        }
      } catch (error) {
        // No audit log permissions
      }

      const embed = new EmbedBuilder()
        .setTitle('🗑️ Emoji Deleted')
        .setColor(0xFF0000)
        .setThumbnail(emoji.url)
        .addFields(
          { name: '📝 Name', value: emoji.name, inline: true },
          { name: '🆔 ID', value: emoji.id, inline: true },
          { name: '📊 Animated', value: emoji.animated ? 'Yes' : 'No', inline: true }
        )
        .setTimestamp();

      if (executor) {
        embed.addFields({ name: '👤 Deleted By', value: `${executor.tag} (${executor.id})`, inline: false });
      }

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error logging emoji delete:', error);
    }
  }
};

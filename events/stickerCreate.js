const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { statements } = require('../database');

module.exports = {
  name: Events.GuildStickerCreate,
  async execute(sticker) {
    try {
      // Get guild settings
      const settings = statements.getGuildSettings.get(sticker.guild.id);
      if (!settings || !settings.oblivion_log_channel) return;

      const logChannel = sticker.guild.channels.cache.get(settings.oblivion_log_channel);
      if (!logChannel) return;

      // Get audit log to see who created the sticker
      let executor = null;
      try {
        const auditLogs = await sticker.guild.fetchAuditLogs({
          type: AuditLogEvent.StickerCreate,
          limit: 1
        });
        const log = auditLogs.entries.first();
        if (log && log.target.id === sticker.id) {
          executor = log.executor;
        }
      } catch (error) {
        // No audit log permissions
      }

      const embed = new EmbedBuilder()
        .setTitle('🎨 Sticker Created')
        .setColor(0x00FF00)
        .setThumbnail(sticker.url)
        .addFields(
          { name: '📝 Name', value: sticker.name, inline: true },
          { name: '🆔 ID', value: sticker.id, inline: true },
          { name: '📄 Description', value: sticker.description || 'No description', inline: false },
          { name: '🏷️ Tags', value: sticker.tags || 'None', inline: true }
        )
        .setTimestamp();

      if (executor) {
        embed.addFields({ name: '👤 Created By', value: `${executor.tag} (${executor.id})`, inline: false });
      }

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error logging sticker create:', error);
    }
  }
};

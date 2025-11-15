const { Events, EmbedBuilder, ChannelType, AuditLogEvent } = require('discord.js');
const { statements } = require('../database');

module.exports = {
  name: Events.ChannelCreate,
  async execute(channel) {
    try {
      if (!channel.guild) return;

      // Get guild settings
      const settings = statements.getGuildSettings.get(channel.guild.id);
      if (!settings || !settings.oblivion_log_channel) return;

      const logChannel = channel.guild.channels.cache.get(settings.oblivion_log_channel);
      if (!logChannel) return;

      // Get audit log to see who created the channel
      let executor = null;
      try {
        const auditLogs = await channel.guild.fetchAuditLogs({
          type: AuditLogEvent.ChannelCreate,
          limit: 1
        });
        const log = auditLogs.entries.first();
        if (log && log.target.id === channel.id) {
          executor = log.executor;
        }
      } catch (error) {
        // No audit log permissions
      }

      const channelTypes = {
        [ChannelType.GuildText]: '💬 Text Channel',
        [ChannelType.GuildVoice]: '🔊 Voice Channel',
        [ChannelType.GuildCategory]: '📁 Category',
        [ChannelType.GuildAnnouncement]: '📢 Announcement Channel',
        [ChannelType.GuildStageVoice]: '🎭 Stage Channel',
        [ChannelType.GuildForum]: '💭 Forum Channel'
      };

      const embed = new EmbedBuilder()
        .setTitle('➕ Channel Created')
        .setColor(0x00FF00)
        .addFields(
          { name: '📍 Channel', value: `${channel} (${channel.name})`, inline: true },
          { name: '🆔 ID', value: channel.id, inline: true },
          { name: '📝 Type', value: channelTypes[channel.type] || 'Unknown', inline: true }
        )
        .setTimestamp();

      if (executor) {
        embed.addFields({ name: '👤 Created By', value: `${executor.tag} (${executor.id})`, inline: false });
      }

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error logging channel create:', error);
    }
  }
};

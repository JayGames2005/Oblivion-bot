const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { statements } = require('../database');

module.exports = {
  name: Events.GuildRoleCreate,
  async execute(role) {
    try {
      // Get guild settings
      const settings = statements.getGuildSettings.get(role.guild.id);
      if (!settings || !settings.oblivion_log_channel) return;

      const logChannel = role.guild.channels.cache.get(settings.oblivion_log_channel);
      if (!logChannel) return;

      // Get audit log to see who created the role
      let executor = null;
      try {
        const auditLogs = await role.guild.fetchAuditLogs({
          type: AuditLogEvent.RoleCreate,
          limit: 1
        });
        const log = auditLogs.entries.first();
        if (log && log.target.id === role.id) {
          executor = log.executor;
        }
      } catch (error) {
        // No audit log permissions
      }

      const embed = new EmbedBuilder()
        .setTitle('🎨 Role Created')
        .setColor(role.color || 0x00FF00)
        .addFields(
          { name: '📝 Role', value: `${role} (${role.name})`, inline: true },
          { name: '🆔 ID', value: role.id, inline: true },
          { name: '🎨 Color', value: role.hexColor, inline: true }
        )
        .setTimestamp();

      if (executor) {
        embed.addFields({ name: '👤 Created By', value: `${executor.tag} (${executor.id})`, inline: false });
      }

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error logging role create:', error);
    }
  }
};

const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  name: Events.GuildRoleDelete,
  async execute(role) {
    try {
      // Get guild settings
      const settings = await DatabaseHelper.getGuildSettings(role.guild.id);
      if (!settings || !settings.oblivion_log_channel) return;

      const logChannel = role.guild.channels.cache.get(settings.oblivion_log_channel);
      if (!logChannel) return;

      // Get audit log to see who deleted the role
      let executor = null;
      try {
        const auditLogs = await role.guild.fetchAuditLogs({
          type: AuditLogEvent.RoleDelete,
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
        .setTitle('🗑️ Role Deleted')
        .setColor(0xFF0000)
        .addFields(
          { name: '📝 Role Name', value: role.name, inline: true },
          { name: '🆔 ID', value: role.id, inline: true },
          { name: '🎨 Color', value: role.hexColor, inline: true }
        )
        .setTimestamp();

      if (executor) {
        embed.addFields({ name: '👤 Deleted By', value: `${executor.tag} (${executor.id})`, inline: false });
      }

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error logging role delete:', error);
    }
  }
};

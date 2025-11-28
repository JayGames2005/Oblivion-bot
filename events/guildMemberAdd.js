const { Events, EmbedBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      // Restore achievement roles
      try {
        const achievementRoles = await DatabaseHelper.getUserAchievementRoles(member.guild.id, member.id);
        if (achievementRoles && achievementRoles.length > 0) {
          for (const roleId of achievementRoles) {
            const role = member.guild.roles.cache.get(roleId);
            if (role && !member.roles.cache.has(roleId)) {
              await member.roles.add(role);
            }
          }
        }
      } catch (roleError) {
        console.error('Error restoring achievement roles:', roleError);
      }

      // Get guild settings
      const settings = await DatabaseHelper.getGuildSettings(member.guild.id);

      // Welcome message system (fixed: always "welcome username" and only sends once)
      const welcomeSettings = await DatabaseHelper.getWelcomeSettings(member.guild.id);
      if (welcomeSettings && welcomeSettings.welcome_enabled && welcomeSettings.welcome_channel) {
        const welcomeChannel = member.guild.channels.cache.get(welcomeSettings.welcome_channel);
        if (welcomeChannel) {
          const welcomeMessage = `welcome ${member.user.username}`;
          const welcomeEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('👋 Welcome!')
            .setDescription(welcomeMessage)
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
          await welcomeChannel.send({ embeds: [welcomeEmbed] });
        }
      }

      // Oblivion logs
      if (!settings || !settings.oblivion_log_channel) return;

      const logChannel = member.guild.channels.cache.get(settings.oblivion_log_channel);
      if (!logChannel) return;

      // Note: Discord's native timeout automatically persists when users rejoin

      // Log member join
      const embed = new EmbedBuilder()
        .setTitle('📥 Member Joined')
        .setColor(0x00FF00)
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: `${member.user.tag} (${member.id})`, inline: true },
          { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: '👥 Member Count', value: member.guild.memberCount.toString(), inline: true }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error handling member join:', error);
    }
  }
};

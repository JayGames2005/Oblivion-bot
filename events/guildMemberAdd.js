const { Events, EmbedBuilder } = require('discord.js');
const { statements } = require('../database');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      // Get guild settings
      const settings = statements.getGuildSettings.get(member.guild.id);
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

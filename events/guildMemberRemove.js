const { Events, EmbedBuilder } = require('discord.js');
const { statements } = require('../database');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    try {
      // Get guild settings
      const settings = statements.getGuildSettings.get(member.guild.id);
      if (!settings || !settings.oblivion_log_channel) return;

      const logChannel = member.guild.channels.cache.get(settings.oblivion_log_channel);
      if (!logChannel) return;

      // Log member leave
      const embed = new EmbedBuilder()
        .setTitle('📤 Member Left')
        .setColor(0xFF6600)
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: `${member.user.tag} (${member.id})`, inline: true },
          { name: '📅 Joined Server', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
          { name: '👥 Member Count', value: member.guild.memberCount.toString(), inline: true }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error handling member remove:', error);
    }
  }
};

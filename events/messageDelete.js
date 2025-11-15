const { Events, EmbedBuilder } = require('discord.js');
const { statements } = require('../database');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    // Ignore bot messages, DMs, and partial messages
    if (!message.guild || message.author?.bot || message.partial) return;

    try {
      // Get guild settings
      const settings = statements.getGuildSettings.get(message.guild.id);
      if (!settings || !settings.oblivion_log_channel) return;

      const logChannel = message.guild.channels.cache.get(settings.oblivion_log_channel);
      if (!logChannel) return;

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('🗑️ Message Deleted')
        .setColor(0xFF0000)
        .addFields(
          { name: '👤 Author', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown', inline: true },
          { name: '📍 Channel', value: `${message.channel} (${message.channel.id})`, inline: true },
          { name: '📝 Content', value: message.content || '*No text content*', inline: false }
        )
        .setTimestamp();

      if (message.attachments.size > 0) {
        embed.addFields({ 
          name: '📎 Attachments', 
          value: message.attachments.map(a => a.name).join(', '), 
          inline: false 
        });
      }

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error logging deleted message:', error);
    }
  }
};

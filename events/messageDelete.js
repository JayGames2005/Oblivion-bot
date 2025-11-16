const { Events, EmbedBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    // Ignore DMs and partial messages
    if (!message.guild || message.partial) return;

    try {
      // Get guild settings
      const settings = await DatabaseHelper.getGuildSettings(message.guild.id);
      if (!settings) return;

      // Check if message was deleted from mod log channel
      if (settings.mod_log_channel && message.channel.id === settings.mod_log_channel) {
        // Check if it was a case log (bot's message with case embed)
        if (message.author?.id === message.client.user.id && message.embeds.length > 0) {
          const embed = message.embeds[0];
          const isCaseLog = embed.title?.includes('Case #') || embed.footer?.text?.includes('Case');
          
          if (isCaseLog) {
            // Re-post the deleted case log
            await message.channel.send({
              content: '⚠️ **Case log was deleted and has been restored:**',
              embeds: [embed]
            });
          }
        }
      }

      // Log to Oblivion log channel if configured
      if (!settings.oblivion_log_channel) return;

      const logChannel = message.guild.channels.cache.get(settings.oblivion_log_channel);
      if (!logChannel) return;

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('🗑️ Message Deleted')
        .setColor(0xFF0000)
        .addFields(
          { name: '👤 Author', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown', inline: true },
          { name: '📍 Channel', value: `${message.channel} (${message.channel.id})`, inline: true }
        )
        .setTimestamp();

      // Add content if available
      if (message.content) {
        embed.addFields({ name: '📝 Content', value: message.content.slice(0, 1024), inline: false });
      } else if (message.embeds.length > 0) {
        embed.addFields({ name: '📝 Content', value: '*Message contained embeds*', inline: false });
      } else {
        embed.addFields({ name: '📝 Content', value: '*No text content*', inline: false });
      }

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

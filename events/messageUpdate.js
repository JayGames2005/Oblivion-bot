const { Events, EmbedBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    try {
      // Ignore bot messages and partial messages
      if (newMessage.author?.bot) return;
      if (oldMessage.partial || newMessage.partial) return;
      
      // Ignore if content didn't change
      if (oldMessage.content === newMessage.content) return;

      // Get guild settings
      const settings = await DatabaseHelper.getGuildSettings(newMessage.guild.id);
      if (!settings || !settings.oblivion_log_channel) return;

      const logChannel = newMessage.guild.channels.cache.get(settings.oblivion_log_channel);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle('✏️ Message Edited')
        .setColor(0xFFA500)
        .setAuthor({ 
          name: newMessage.author.tag, 
          iconURL: newMessage.author.displayAvatarURL() 
        })
        .addFields(
          { name: '👤 User', value: `${newMessage.author} (${newMessage.author.id})`, inline: true },
          { name: '📍 Channel', value: `${newMessage.channel}`, inline: true },
          { name: '🔗 Jump', value: `[Go to Message](${newMessage.url})`, inline: true },
          { name: '📝 Before', value: oldMessage.content.substring(0, 1024) || '*No content*', inline: false },
          { name: '📝 After', value: newMessage.content.substring(0, 1024) || '*No content*', inline: false }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error logging message edit:', error);
    }
  }
};

const { Events, EmbedBuilder } = require('discord.js');
const AutoMod = require('../utils/automod');
const { statements } = require('../database');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore bot messages and DMs
    if (message.author.bot || !message.guild) return;

    // Check automod
    await AutoMod.checkMessage(message);

    // Log message to Oblivion logs
    try {
      const settings = statements.getGuildSettings.get(message.guild.id);
      if (settings && settings.oblivion_log_channel) {
        const logChannel = message.guild.channels.cache.get(settings.oblivion_log_channel);
        if (logChannel && logChannel.id !== message.channel.id) {
          const embed = new EmbedBuilder()
            .setAuthor({ 
              name: message.author.tag, 
              iconURL: message.author.displayAvatarURL() 
            })
            .setDescription(message.content.substring(0, 2048) || '*No text content*')
            .setColor(0x5865F2)
            .addFields(
              { name: '👤 User', value: `${message.author} (${message.author.id})`, inline: true },
              { name: '📍 Channel', value: `${message.channel}`, inline: true },
              { name: '🔗 Jump', value: `[Go to Message](${message.url})`, inline: true }
            )
            .setFooter({ text: `Message ID: ${message.id}` })
            .setTimestamp();

          // Add attachment info if present
          if (message.attachments.size > 0) {
            const attachments = message.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
            embed.addFields({ name: '📎 Attachments', value: attachments.substring(0, 1024), inline: false });
          }

          // Add sticker info if present
          if (message.stickers.size > 0) {
            const stickers = message.stickers.map(s => s.name).join(', ');
            embed.addFields({ name: '🎨 Stickers', value: stickers, inline: false });
          }

          await logChannel.send({ embeds: [embed] });
        }
      }
    } catch (error) {
      // Silently fail to avoid spam
    }

    // Legacy text commands could be added here if needed
    // For now, we're using slash commands only
  }
};

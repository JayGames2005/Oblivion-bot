const { Events, EmbedBuilder } = require('discord.js');
const AutoMod = require('../utils/automod');
const DatabaseHelper = require('../database-helper');

// XP Cooldown tracking (in-memory)
const xpCooldowns = new Map();

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore bot messages and DMs
    if (message.author.bot || !message.guild) return;

    // Check automod
    await AutoMod.checkMessage(message);

    // XP System - award XP for messages (with cooldown)
    try {
      const cooldownKey = `${message.guild.id}-${message.author.id}`;
      const lastMessageTime = xpCooldowns.get(cooldownKey);
      const now = Date.now();

      // 60 second cooldown between XP gains
      if (!lastMessageTime || now - lastMessageTime >= 60000) {
        xpCooldowns.set(cooldownKey, now);

        // Random XP between 15-25
        const xpGain = Math.floor(Math.random() * 11) + 15;
        
        const userData = await DatabaseHelper.addUserXP(message.guild.id, message.author.id, xpGain);
        
        // Calculate old and new level
        const oldLevel = Math.floor(0.1 * Math.sqrt(userData.xp - xpGain));
        const newLevel = Math.floor(0.1 * Math.sqrt(userData.xp));

        // Level up announcement
        if (newLevel > oldLevel) {
          const levelUpEmbed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🎉 Level Up!')
            .setDescription(`${message.author} reached **Level ${newLevel}**!`)
            .addFields({ name: 'Total XP', value: `${userData.xp.toLocaleString()}`, inline: true })
            .setTimestamp();

          await message.channel.send({ embeds: [levelUpEmbed] });
        }
      }
    } catch (error) {
      console.error('Error awarding XP:', error);
    }

    // Log message to Oblivion logs
    try {
      const settings = await DatabaseHelper.getGuildSettings(message.guild.id);
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

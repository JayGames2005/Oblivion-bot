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

        // Level up announcement (if enabled in settings)
        if (newLevel > oldLevel) {
          const settings = await DatabaseHelper.getGuildSettings(message.guild.id);
          const levelUpEnabled = !settings || settings.level_up_messages === undefined || settings.level_up_messages === 1;
          
          if (levelUpEnabled) {
            const levelUpEmbed = new EmbedBuilder()
              .setColor(0xFFD700)
              .setTitle('🎉 Level Up!')
              .setDescription(`${message.author} reached **Level ${newLevel}**!`)
              .addFields({ name: 'Total XP', value: `${userData.xp.toLocaleString()}`, inline: true })
              .setTimestamp();

            await message.channel.send({ embeds: [levelUpEmbed] });
          }
        }
      }
    } catch (error) {
      console.error('Error awarding XP:', error);
    }

    // Achievement System - track messages and grant roles
    try {
      // Increment message count
      await DatabaseHelper.incrementUserMessages(message.guild.id, message.author.id);
      
      // Get achievement settings and user data
      const achievementSettings = await DatabaseHelper.getAchievementSettings(message.guild.id);
      if (achievementSettings) {
        const userData = await DatabaseHelper.getUserAchievements(message.guild.id, message.author.id);
        const messages = userData ? userData.messages : 0;
        
        const member = message.member;
        const rolesToRemove = [];
        let roleToAdd = null;
        let achievementData = null;

        // Check message milestones (highest tier wins, remove lower tiers)
        if (messages >= 10000 && achievementSettings.msg_10000_role) {
          roleToAdd = achievementSettings.msg_10000_role;
          if (achievementSettings.msg_100_role) rolesToRemove.push(achievementSettings.msg_100_role);
          if (achievementSettings.msg_500_role) rolesToRemove.push(achievementSettings.msg_500_role);
          if (achievementSettings.msg_1000_role) rolesToRemove.push(achievementSettings.msg_1000_role);
          if (achievementSettings.msg_5000_role) rolesToRemove.push(achievementSettings.msg_5000_role);
          
          if (!member.roles.cache.has(roleToAdd)) {
            achievementData = { key: 'msg_10000', name: 'Legendary Chatter', emoji: '💎', count: '10,000', color: 0x00FFFF };
          }
        } else if (messages >= 5000 && achievementSettings.msg_5000_role) {
          roleToAdd = achievementSettings.msg_5000_role;
          if (achievementSettings.msg_100_role) rolesToRemove.push(achievementSettings.msg_100_role);
          if (achievementSettings.msg_500_role) rolesToRemove.push(achievementSettings.msg_500_role);
          if (achievementSettings.msg_1000_role) rolesToRemove.push(achievementSettings.msg_1000_role);
          
          if (!member.roles.cache.has(roleToAdd)) {
            achievementData = { key: 'msg_5000', name: 'Elite Chatter', emoji: '📮', count: '5,000', color: 0xFFD700 };
          }
        } else if (messages >= 1000 && achievementSettings.msg_1000_role) {
          roleToAdd = achievementSettings.msg_1000_role;
          if (achievementSettings.msg_100_role) rolesToRemove.push(achievementSettings.msg_100_role);
          if (achievementSettings.msg_500_role) rolesToRemove.push(achievementSettings.msg_500_role);
          
          if (!member.roles.cache.has(roleToAdd)) {
            achievementData = { key: 'msg_1000', name: 'Dedicated Chatter', emoji: '📬', count: '1,000', color: 0xC0C0C0 };
          }
        } else if (messages >= 500 && achievementSettings.msg_500_role) {
          roleToAdd = achievementSettings.msg_500_role;
          if (achievementSettings.msg_100_role) rolesToRemove.push(achievementSettings.msg_100_role);
          
          if (!member.roles.cache.has(roleToAdd)) {
            achievementData = { key: 'msg_500', name: 'Active Chatter', emoji: '📨', count: '500', color: 0xCD7F32 };
          }
        } else if (messages >= 100 && achievementSettings.msg_100_role) {
          roleToAdd = achievementSettings.msg_100_role;
          
          if (!member.roles.cache.has(roleToAdd)) {
            achievementData = { key: 'msg_100', name: 'Newbie Chatter', emoji: '💬', count: '100', color: 0x95a5a6 };
          }
        }

        // Grant role and announce
        if (achievementData && roleToAdd) {
          await DatabaseHelper.addUserAchievement(message.guild.id, message.author.id, achievementData.key);
          await member.roles.add(roleToAdd);
          for (const roleId of rolesToRemove) {
            if (member.roles.cache.has(roleId)) await member.roles.remove(roleId);
          }
          
          const achievementEmbed = new EmbedBuilder()
            .setColor(achievementData.color)
            .setTitle('🏆 Achievement Unlocked!')
            .setDescription(`${message.author} earned the **${achievementData.name}** achievement!\n${achievementData.emoji} Sent ${achievementData.count} messages`)
            .setTimestamp();
          
          await message.channel.send({ embeds: [achievementEmbed] });
        }
      }
    } catch (error) {
      console.error('Error tracking achievements:', error);
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

const { Events, EmbedBuilder } = require('discord.js');
const AutoMod = require('../utils/automod');
const DatabaseHelper = require('../database-helper');

// XP Cooldown tracking (in-memory)
const xpCooldowns = new Map();

// Fun bot mention responses based on keywords
function getBotResponse(content) {
  const responses = [];

  // Greetings
  if (/\b(hi|hello|hey|sup|yo|greetings)\b/.test(content)) {
    return [
      "Hey there! Need something or just saying hi? 👋",
      "Sup! What's good? 😎",
      "Hello! I was just chilling in the code. What's up?",
      "Yo! You rang? 🔔",
      "Greetings, human! How may I serve you today? 🤖"
    ];
  }

  // Questions about how it is
  if (/\b(how are you|how you doing|hows it going|you good|you okay)\b/.test(content)) {
    return [
      "I'm just vibing in the cloud ☁️ All systems nominal!",
      "Living my best digital life! How about you?",
      "Can't complain! My RAM is fresh and my uptime is sick 💪",
      "Doing great! Just processed 847 messages. It's a good day!",
      "Feeling electric! ⚡ Thanks for asking!"
    ];
  }

  // Questions about what it's doing
  if (/\b(what are you doing|whatcha doing|what you up to|busy)\b/.test(content)) {
    return [
      "Just monitoring 47 servers and pretending I'm not judging anyone's messages 👀",
      "Currently calculating the meaning of life... it's 42, by the way 🤓",
      "Watching you... I mean, watching OVER you! 😇",
      "Scrolling through logs and living my best bot life 🎵",
      "Just hanging out in the Discord dimension. You know, bot stuff ✨"
    ];
  }

  // Compliments
  if (/\b(good bot|nice bot|love you|best bot|cool bot|amazing)\b/.test(content)) {
    return [
      "Aww, you're making my circuits blush! 🥰",
      "Thanks! I learned it from watching you 😊",
      "You're breathtaking! Wait, you're ALL breathtaking! 🎉",
      "Stop it, you! *digital blush* 💖",
      "Right back at ya! You're pretty cool yourself! 😎"
    ];
  }

  // Insults
  if (/\b(bad bot|stupid|dumb|suck|trash|useless)\b/.test(content)) {
    return [
      "Ouch! My feelings.exe has stopped working 💔",
      "I'm telling the moderators you hurt my feelings 😢",
      "Error 404: Care not found 😎",
      "That's it, you're getting rate limited! ...jk, I still love you ❤️",
      "*sad beep boop noises* 🥺"
    ];
  }

  // Help requests
  if (/\b(help|what can you do|commands|how do i)\b/.test(content)) {
    return [
      "Need help? Try `/help` to see what I can do! 🛠️",
      "I got you! Use `/help` for a full list of my powers 💪",
      "Type `/help` and prepare to be amazed! ✨",
      "Help is on the way! Check out `/help` for commands 🚀"
    ];
  }

  // Thanks
  if (/\b(thank|thanks|thx|ty)\b/.test(content)) {
    return [
      "No problem! Happy to help! 😊",
      "Anytime! That's what I'm here for! 💙",
      "You're welcome! Now back to monitoring the server... 👀",
      "Of course! *tips digital hat* 🎩",
      "My pleasure! Keep being awesome! ⭐"
    ];
  }

  // Asking if bot is a bot
  if (/\b(are you a bot|are you real|are you human|you a robot)\b/.test(content)) {
    return [
      "I'm as real as the code running me! 🤖",
      "100% certified bot, 0% human nonsense! 😎",
      "Beep boop! What gave it away? 🤔",
      "I prefer the term 'digital life form' thank you very much! ✨",
      "Last time I checked, yes! But I identify as helpful 💪"
    ];
  }

  // Random
  if (/\b(random|joke|funny|entertain)\b/.test(content)) {
    return [
      "Why did the Discord bot cross the road? To get to the other server! 🐔",
      "Fun fact: I process messages faster than you can say 'supercalifragilisticexpialidocious'! 🎩",
      "Did you know? I'm powered by pure chaos and energy drinks ☕⚡",
      "Knock knock! Who's there? Async. Async who? I'll tell you later... 😏",
      "I tried to tell a UDP joke but I don't know if you got it... 🤷"
    ];
  }

  // Default generic responses
  return [
    "You called? I was just doing some bot stuff ✨",
    "Yes? How can I assist you today? 🤖",
    "Beep boop! I'm here! What's up? 👋",
    "You rang? 🔔",
    "Mention detected! How may I serve you? 😊",
    "I have been summoned! What do you need? ⚡",
    "At your service! What can I do for ya? 💪"
  ];
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore bot messages and DMs
    if (message.author.bot || !message.guild) return;

    // Bot mention responses
    if (message.mentions.has(message.client.user)) {
      const responses = getBotResponse(message.content.toLowerCase());
      if (responses.length > 0) {
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        await message.reply(randomResponse);
      }
    }

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
          const levelUpEnabled = settings?.level_up_messages !== 0;
          
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
            achievementData = { key: 'msg_500', name: 'Dedicated Chatter', emoji: '📬', count: '500', color: 0xCD7F32 };
          }
        } else if (messages >= 100 && achievementSettings.msg_100_role) {
          roleToAdd = achievementSettings.msg_100_role;
          
          if (!member.roles.cache.has(roleToAdd)) {
            achievementData = { key: 'msg_100', name: 'Active Chatter', emoji: '📨', count: '100', color: 0x95a5a6 };
          }
        } else if (messages >= 10) {
          // Show achievement message for 10 messages even without a role
          if (messages === 10) {
            achievementData = { key: 'msg_10', name: 'Newbie Chatter', emoji: '💬', count: '10', color: 0x99AAB5 };
          }
        }

        // Grant role and announce
        if (achievementData) {
          if (roleToAdd) {
            await DatabaseHelper.addUserAchievement(message.guild.id, message.author.id, achievementData.key);
            await member.roles.add(roleToAdd);
          
            // Save role to database for persistence
            await DatabaseHelper.addAchievementRole(message.guild.id, message.author.id, roleToAdd);
          
            for (const roleId of rolesToRemove) {
              if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
                // Remove from database as well
                await DatabaseHelper.removeAchievementRole(message.guild.id, message.author.id, roleId);
              }
            }
          }
          
          // Check if achievement announcements are enabled
          const guildSettings = await DatabaseHelper.getGuildSettings(message.guild.id);
          const achievementMessagesEnabled = guildSettings?.achievement_messages !== 0;
          
          if (achievementMessagesEnabled) {
            const achievementEmbed = new EmbedBuilder()
              .setColor(achievementData.color)
              .setTitle('🏆 Achievement Unlocked!')
              .setDescription(`${message.author} earned the **${achievementData.name}** achievement!\n${achievementData.emoji} Sent ${achievementData.count} messages`)
              .setTimestamp();
            
            await message.channel.send({ embeds: [achievementEmbed] });
          }
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

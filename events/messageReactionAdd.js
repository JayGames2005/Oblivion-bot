const { Events, EmbedBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

async function checkReactionAchievements(guild, member, userData, achievementSettings, type) {
  if (!achievementSettings || !member) return;

  const value = type === 'given' ? userData.reactions_given : userData.reactions_received;
  const rolesToRemove = [];
  let roleToAdd = null;
  let achievementUnlocked = null;

  if (type === 'given') {
    // Reactions given achievements
    if (value >= 1000 && achievementSettings.react_1000_role) {
      roleToAdd = achievementSettings.react_1000_role;
      if (achievementSettings.react_50_role) rolesToRemove.push(achievementSettings.react_50_role);
      if (achievementSettings.react_250_role) rolesToRemove.push(achievementSettings.react_250_role);
      
      if (!member.roles.cache.has(roleToAdd)) {
        achievementUnlocked = {
          name: 'Mega Reactor',
          emoji: '🌟',
          description: 'Given 1,000 reactions',
          color: 0xFFD700,
          key: 'react_1000'
        };
      }
    } else if (value >= 250 && achievementSettings.react_250_role) {
      roleToAdd = achievementSettings.react_250_role;
      if (achievementSettings.react_50_role) rolesToRemove.push(achievementSettings.react_50_role);
      
      if (!member.roles.cache.has(roleToAdd)) {
        achievementUnlocked = {
          name: 'Super Reactor',
          emoji: '⭐',
          description: 'Given 250 reactions',
          color: 0xC0C0C0,
          key: 'react_250'
        };
      }
    } else if (value >= 50 && achievementSettings.react_50_role) {
      roleToAdd = achievementSettings.react_50_role;
      
      if (!member.roles.cache.has(roleToAdd)) {
        achievementUnlocked = {
          name: 'Reactor',
          emoji: '👍',
          description: 'Given 50 reactions',
          color: 0xCD7F32,
          key: 'react_50'
        };
      }
    }
  } else {
    // Reactions received (popularity) achievements
    if (value >= 500 && achievementSettings.popular_500_role) {
      roleToAdd = achievementSettings.popular_500_role;
      if (achievementSettings.popular_100_role) rolesToRemove.push(achievementSettings.popular_100_role);
      
      if (!member.roles.cache.has(roleToAdd)) {
        achievementUnlocked = {
          name: 'Superstar',
          emoji: '🌠',
          description: 'Received 500 reactions',
          color: 0xFFD700,
          key: 'popular_500'
        };
      }
    } else if (value >= 100 && achievementSettings.popular_100_role) {
      roleToAdd = achievementSettings.popular_100_role;
      
      if (!member.roles.cache.has(roleToAdd)) {
        achievementUnlocked = {
          name: 'Rising Star',
          emoji: '✨',
          description: 'Received 100 reactions',
          color: 0xC0C0C0,
          key: 'popular_100'
        };
      }
    }
  }

  // Grant role and announce
  if (achievementUnlocked && roleToAdd) {
    await member.roles.add(roleToAdd);
    
    // Save role to database for persistence
    await DatabaseHelper.addAchievementRole(guild.id, member.id, roleToAdd);
    
    for (const roleId of rolesToRemove) {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        // Remove from database as well
        await DatabaseHelper.removeAchievementRole(guild.id, member.id, roleId);
      }
    }

    await DatabaseHelper.addUserAchievement(guild.id, member.id, achievementUnlocked.key);

    // Check if achievement announcements are enabled
    const guildSettings = await DatabaseHelper.getGuildSettings(guild.id);
    const achievementMessagesEnabled = guildSettings?.achievement_messages !== 0;

    // Find a text channel to announce
    if (achievementMessagesEnabled) {
      const channel = guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages'));
      
      if (channel) {
        const achievementEmbed = new EmbedBuilder()
          .setColor(achievementUnlocked.color)
          .setTitle('🏆 Achievement Unlocked!')
          .setDescription(`${member.user} earned the **${achievementUnlocked.name}** achievement!\n${achievementUnlocked.emoji} ${achievementUnlocked.description}`)
          .setTimestamp();
        
        await channel.send({ embeds: [achievementEmbed] });
      }
    }
  }
}

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    try {
      // Ignore bot reactions
      if (user.bot) return;

      // Fetch partial reactions
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (error) {
          console.error('Error fetching reaction:', error);
          return;
        }
      }

      const guild = reaction.message.guild;
      if (!guild) return;

      // Track reaction given
      await DatabaseHelper.incrementReactionsGiven(guild.id, user.id);
      const giverData = await DatabaseHelper.getUserAchievements(guild.id, user.id);
      const giverMember = await guild.members.fetch(user.id).catch(() => null);
      const achievementSettings = await DatabaseHelper.getAchievementSettings(guild.id);

      await checkReactionAchievements(guild, giverMember, giverData, achievementSettings, 'given');

      // Track reaction received (if different user)
      if (reaction.message.author && reaction.message.author.id !== user.id && !reaction.message.author.bot) {
        await DatabaseHelper.incrementReactionsReceived(guild.id, reaction.message.author.id);
        const receiverData = await DatabaseHelper.getUserAchievements(guild.id, reaction.message.author.id);
        const receiverMember = await guild.members.fetch(reaction.message.author.id).catch(() => null);

        await checkReactionAchievements(guild, receiverMember, receiverData, achievementSettings, 'received');
      }
    } catch (error) {
      console.error('Error handling reaction add:', error);
    }
  }
};

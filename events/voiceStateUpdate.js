const { Events, EmbedBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    try {
      const member = newState.member;
      const guildId = newState.guild.id;
      const userId = member.id;

      // User joined a voice channel
      if (!oldState.channelId && newState.channelId) {
        await DatabaseHelper.setUserVoiceJoined(guildId, userId, Date.now());
      }

      // User left a voice channel
      if (oldState.channelId && !newState.channelId) {
        const userData = await DatabaseHelper.getUserAchievements(guildId, userId);
        
        if (userData && userData.voice_joined_at) {
          const timeSpent = Math.floor((Date.now() - userData.voice_joined_at) / 60000); // Convert to minutes
          
          if (timeSpent > 0) {
            await DatabaseHelper.addUserVoiceTime(guildId, userId, timeSpent);

            // Check for achievements
            const achievementSettings = await DatabaseHelper.getAchievementSettings(guildId);
            if (achievementSettings) {
              const updatedData = await DatabaseHelper.getUserAchievements(guildId, userId);
              const totalMinutes = updatedData ? updatedData.voice_minutes : 0;

              const rolesToRemove = [];
              let roleToAdd = null;
              let achievementUnlocked = null;

              // Check voice milestones (highest tier wins, remove lower tiers)
              if (totalMinutes >= 2000 && achievementSettings.vc_2000_role) {
                roleToAdd = achievementSettings.vc_2000_role;
                if (achievementSettings.vc_60_role) rolesToRemove.push(achievementSettings.vc_60_role);
                
                if (!member.roles.cache.has(roleToAdd)) {
                  achievementUnlocked = {
                    name: 'Voice Regular II',
                    emoji: '🎤',
                    description: 'Spent 2,000 minutes in voice',
                    color: 0xFFD700
                  };
                  await DatabaseHelper.addUserAchievement(guildId, userId, 'vc_2000');
                }
              } else if (totalMinutes >= 60 && achievementSettings.vc_60_role) {
                roleToAdd = achievementSettings.vc_60_role;
                
                if (!member.roles.cache.has(roleToAdd)) {
                  achievementUnlocked = {
                    name: 'Voice Regular I',
                    emoji: '🎙️',
                    description: 'Spent 60 minutes in voice',
                    color: 0xCD7F32
                  };
                  await DatabaseHelper.addUserAchievement(guildId, userId, 'vc_60');
                }
              }

              // Grant role and send announcement
              if (achievementUnlocked && roleToAdd) {
                await member.roles.add(roleToAdd);
                
                for (const roleId of rolesToRemove) {
                  if (member.roles.cache.has(roleId)) await member.roles.remove(roleId);
                }

                // Find a text channel to announce
                const channel = newState.guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(newState.guild.members.me).has('SendMessages'));
                
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
        }
      }
    } catch (error) {
      console.error('Error handling voice state update:', error);
    }
  }
};

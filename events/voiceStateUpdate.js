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
              if (totalMinutes >= 5000 && achievementSettings.vc_5000_role) {
                roleToAdd = achievementSettings.vc_5000_role;
                if (achievementSettings.vc_30_role) rolesToRemove.push(achievementSettings.vc_30_role);
                if (achievementSettings.vc_60_role) rolesToRemove.push(achievementSettings.vc_60_role);
                if (achievementSettings.vc_500_role) rolesToRemove.push(achievementSettings.vc_500_role);
                if (achievementSettings.vc_1000_role) rolesToRemove.push(achievementSettings.vc_1000_role);
                
                if (!member.roles.cache.has(roleToAdd)) {
                  achievementUnlocked = {
                    name: 'Voice Legend',
                    emoji: '🎵',
                    description: 'Spent 5,000 minutes in voice (83 hours)',
                    color: 0x00FFFF
                  };
                  await DatabaseHelper.addUserAchievement(guildId, userId, 'vc_5000');
                }
              } else if (totalMinutes >= 1000 && achievementSettings.vc_1000_role) {
                roleToAdd = achievementSettings.vc_1000_role;
                if (achievementSettings.vc_30_role) rolesToRemove.push(achievementSettings.vc_30_role);
                if (achievementSettings.vc_60_role) rolesToRemove.push(achievementSettings.vc_60_role);
                if (achievementSettings.vc_500_role) rolesToRemove.push(achievementSettings.vc_500_role);
                
                if (!member.roles.cache.has(roleToAdd)) {
                  achievementUnlocked = {
                    name: 'Voice Expert',
                    emoji: '📢',
                    description: 'Spent 1,000 minutes in voice (16 hours)',
                    color: 0xFFD700
                  };
                  await DatabaseHelper.addUserAchievement(guildId, userId, 'vc_1000');
                }
              } else if (totalMinutes >= 500 && achievementSettings.vc_500_role) {
                roleToAdd = achievementSettings.vc_500_role;
                if (achievementSettings.vc_30_role) rolesToRemove.push(achievementSettings.vc_30_role);
                if (achievementSettings.vc_60_role) rolesToRemove.push(achievementSettings.vc_60_role);
                
                if (!member.roles.cache.has(roleToAdd)) {
                  achievementUnlocked = {
                    name: 'Voice Enthusiast',
                    emoji: '🔊',
                    description: 'Spent 500 minutes in voice (8 hours)',
                    color: 0xC0C0C0
                  };
                  await DatabaseHelper.addUserAchievement(guildId, userId, 'vc_500');
                }
              } else if (totalMinutes >= 60 && achievementSettings.vc_60_role) {
                roleToAdd = achievementSettings.vc_60_role;
                if (achievementSettings.vc_30_role) rolesToRemove.push(achievementSettings.vc_30_role);
                
                if (!member.roles.cache.has(roleToAdd)) {
                  achievementUnlocked = {
                    name: 'Voice Regular',
                    emoji: '🎤',
                    description: 'Spent 60 minutes in voice (1 hour)',
                    color: 0xCD7F32
                  };
                  await DatabaseHelper.addUserAchievement(guildId, userId, 'vc_60');
                }
              } else if (totalMinutes >= 30 && achievementSettings.vc_30_role) {
                roleToAdd = achievementSettings.vc_30_role;
                
                if (!member.roles.cache.has(roleToAdd)) {
                  achievementUnlocked = {
                    name: 'Voice Newbie',
                    emoji: '🎙️',
                    description: 'Spent 30 minutes in voice',
                    color: 0x95a5a6
                  };
                  await DatabaseHelper.addUserAchievement(guildId, userId, 'vc_30');
                }
              }

              // Grant role and send announcement
              if (achievementUnlocked && roleToAdd) {
                await member.roles.add(roleToAdd);
                
                for (const roleId of rolesToRemove) {
                  if (member.roles.cache.has(roleId)) await member.roles.remove(roleId);
                }

                // Check if achievement announcements are enabled
                const guildSettings = await DatabaseHelper.getGuildSettings(newState.guild.id);
                const achievementMessagesEnabled = !guildSettings || guildSettings.achievement_messages === undefined || guildSettings.achievement_messages === 1;

                // Find a text channel to announce
                if (achievementMessagesEnabled) {
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
      }
    } catch (error) {
      console.error('Error handling voice state update:', error);
    }
  }
};

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View your achievement progress')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check (defaults to you)')
        .setRequired(false)),

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Get user's achievement data
      const userData = await DatabaseHelper.getUserAchievements(interaction.guild.id, targetUser.id);
      const messages = userData ? userData.messages : 0;
      const voiceMinutes = userData ? userData.voice_minutes : 0;
      const reactionsGiven = userData ? userData.reactions_given : 0;
      const reactionsReceived = userData ? userData.reactions_received : 0;
      const achievements = userData && userData.achievements ? userData.achievements.split(',').filter(a => a) : [];

      // Calculate progress
      const messageProgress = [
        { name: '💬 Newbie Chatter', target: 100, emoji: '⬜', achieved: messages >= 100 },
        { name: '📨 Active Chatter', target: 500, emoji: '🥉', achieved: messages >= 500 },
        { name: '📬 Dedicated Chatter', target: 1000, emoji: '🥈', achieved: messages >= 1000 },
        { name: '📮 Elite Chatter', target: 5000, emoji: '🥇', achieved: messages >= 5000 },
        { name: '💎 Legendary Chatter', target: 10000, emoji: '💎', achieved: messages >= 10000 }
      ];

      const voiceProgress = [
        { name: '🎙️ Voice Newbie', target: 30, emoji: '⬜', achieved: voiceMinutes >= 30 },
        { name: '🎤 Voice Regular', target: 60, emoji: '🥉', achieved: voiceMinutes >= 60 },
        { name: '🔊 Voice Enthusiast', target: 500, emoji: '🥈', achieved: voiceMinutes >= 500 },
        { name: '📢 Voice Expert', target: 1000, emoji: '🥇', achieved: voiceMinutes >= 1000 },
        { name: '🎵 Voice Legend', target: 5000, emoji: '💎', achieved: voiceMinutes >= 5000 }
      ];

      const reactionProgress = [
        { name: '👍 Reactor', target: 50, emoji: '🥉', achieved: reactionsGiven >= 50 },
        { name: '⭐ Super Reactor', target: 250, emoji: '🥈', achieved: reactionsGiven >= 250 },
        { name: '🌟 Mega Reactor', target: 1000, emoji: '🥇', achieved: reactionsGiven >= 1000 }
      ];

      const popularityProgress = [
        { name: '✨ Rising Star', target: 100, emoji: '🥈', achieved: reactionsReceived >= 100 },
        { name: '🌠 Superstar', target: 500, emoji: '🥇', achieved: reactionsReceived >= 500 }
      ];

      // Create progress bars
      const createProgressBar = (current, target) => {
        const percentage = Math.min((current / target) * 100, 100);
        const filled = Math.floor(percentage / 5);
        const empty = 20 - filled;
        return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage.toFixed(1)}%`;
      };

      const embed = new EmbedBuilder()
        .setColor(0x667eea)
        .setTitle(`🏆 ${targetUser.username}'s Achievements`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      // Message achievements
      let messageText = '';
      messageProgress.forEach(ach => {
        const status = ach.achieved ? `${ach.emoji} **UNLOCKED**` : createProgressBar(messages || 0, ach.target);
        messageText += `${ach.name}\n${status}\n${ach.achieved ? '' : `Progress: ${(messages || 0).toLocaleString()}/${ach.target.toLocaleString()}\n`}\n`;
      });
      embed.addFields({ name: '📨 Message Achievements', value: messageText || 'No data', inline: false });

      // Voice achievements
      let voiceText = '';
      voiceProgress.forEach(ach => {
        const status = ach.achieved ? `${ach.emoji} **UNLOCKED**` : createProgressBar(voiceMinutes || 0, ach.target);
        voiceText += `${ach.name}\n${status}\n${ach.achieved ? '' : `Progress: ${(voiceMinutes || 0).toLocaleString()}/${ach.target.toLocaleString()} minutes\n`}\n`;
      });
      embed.addFields({ name: '🎤 Voice Achievements', value: voiceText || 'No data', inline: false });

      // Reaction achievements
      let reactionText = '';
      reactionProgress.forEach(ach => {
        const status = ach.achieved ? `${ach.emoji} **UNLOCKED**` : createProgressBar(reactionsGiven || 0, ach.target);
        reactionText += `${ach.name}\n${status}\n${ach.achieved ? '' : `Progress: ${(reactionsGiven || 0).toLocaleString()}/${ach.target.toLocaleString()} reactions\n`}\n`;
      });
      embed.addFields({ name: '👍 Reaction Achievements', value: reactionText || 'No data', inline: false });

      // Popularity achievements
      let popularityText = '';
      popularityProgress.forEach(ach => {
        const status = ach.achieved ? `${ach.emoji} **UNLOCKED**` : createProgressBar(reactionsReceived || 0, ach.target);
        popularityText += `${ach.name}\n${status}\n${ach.achieved ? '' : `Progress: ${(reactionsReceived || 0).toLocaleString()}/${ach.target.toLocaleString()} reactions\n`}\n`;
      });
      embed.addFields({ name: '✨ Popularity Achievements', value: popularityText || 'No data', inline: false });

      // Statistics
      const totalAchievements = messageProgress.filter(a => a.achieved).length + voiceProgress.filter(a => a.achieved).length + reactionProgress.filter(a => a.achieved).length + popularityProgress.filter(a => a.achieved).length;
      const maxAchievements = messageProgress.length + voiceProgress.length + reactionProgress.length + popularityProgress.length;
      
      embed.addFields({
        name: '📊 Statistics',
        value: `**Total Achievements:** ${totalAchievements}/${maxAchievements}\n**Messages:** ${(messages || 0).toLocaleString()}\n**Voice Time:** ${(voiceMinutes || 0).toLocaleString()} min (${((voiceMinutes || 0) / 60).toFixed(1)} hrs)\n**Reactions Given:** ${(reactionsGiven || 0).toLocaleString()}\n**Reactions Received:** ${(reactionsReceived || 0).toLocaleString()}`,
        inline: false
      });

      // If user has completed all achievements, add special message
      if (totalAchievements === maxAchievements) {
        embed.setFooter({ text: '🎉 All achievements completed! You are a legend!' });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching achievements:', error);
      const errorMessage = { content: '❌ Failed to fetch achievements. Please try again.' };
      
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      } catch (replyError) {
        console.error('Failed to send error message:', replyError);
      }
    }
  }
};

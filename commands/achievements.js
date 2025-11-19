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
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Get user's achievement data
      const userData = await DatabaseHelper.getUserAchievements(interaction.guild.id, targetUser.id);
      const messages = userData ? userData.messages : 0;
      const voiceMinutes = userData ? userData.voice_minutes : 0;
      const achievements = userData && userData.achievements ? userData.achievements.split(',').filter(a => a) : [];

      // Calculate progress
      const messageProgress = [
        { name: '📨 Chatterbox I', target: 500, emoji: '🥉', achieved: messages >= 500 },
        { name: '📬 Chatterbox II', target: 1000, emoji: '🥈', achieved: messages >= 1000 },
        { name: '📮 Chatterbox III', target: 2000, emoji: '🥇', achieved: messages >= 2000 }
      ];

      const voiceProgress = [
        { name: '🎙️ Voice Regular I', target: 60, emoji: '🥉', achieved: voiceMinutes >= 60 },
        { name: '🎤 Voice Regular II', target: 2000, emoji: '🥇', achieved: voiceMinutes >= 2000 }
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
        const status = ach.achieved ? `${ach.emoji} **UNLOCKED**` : createProgressBar(messages, ach.target);
        messageText += `${ach.name}\n${status}\n${ach.achieved ? '' : `Progress: ${messages.toLocaleString()}/${ach.target.toLocaleString()}\n`}\n`;
      });
      embed.addFields({ name: '📨 Message Achievements', value: messageText || 'No data', inline: false });

      // Voice achievements
      let voiceText = '';
      voiceProgress.forEach(ach => {
        const status = ach.achieved ? `${ach.emoji} **UNLOCKED**` : createProgressBar(voiceMinutes, ach.target);
        voiceText += `${ach.name}\n${status}\n${ach.achieved ? '' : `Progress: ${voiceMinutes.toLocaleString()}/${ach.target.toLocaleString()} minutes\n`}\n`;
      });
      embed.addFields({ name: '🎤 Voice Achievements', value: voiceText || 'No data', inline: false });

      // Statistics
      const totalAchievements = messageProgress.filter(a => a.achieved).length + voiceProgress.filter(a => a.achieved).length;
      const maxAchievements = messageProgress.length + voiceProgress.length;
      
      embed.addFields({
        name: '📊 Statistics',
        value: `**Total Achievements:** ${totalAchievements}/${maxAchievements}\n**Messages Sent:** ${messages.toLocaleString()}\n**Voice Time:** ${voiceMinutes.toLocaleString()} minutes (${(voiceMinutes / 60).toFixed(1)} hours)`,
        inline: false
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching achievements:', error);
      await interaction.editReply({
        content: '❌ Failed to fetch achievements. Please try again.'
      });
    }
  }
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseHelper = require('../database-helper');

const BOT_OWNER_ID = '1432443011488288890';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achset')
    .setDescription('Set achievement stats for a user (Bot Owner only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to modify')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('messages')
        .setDescription('Number of messages')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('voice_minutes')
        .setDescription('Voice minutes')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('reactions_given')
        .setDescription('Reactions given')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('reactions_received')
        .setDescription('Reactions received')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Only bot owner can use this command
    if (interaction.user.id !== BOT_OWNER_ID) {
      return interaction.editReply({ 
        content: '❌ This command is restricted to the bot owner only.'
      });
    }

    try {
      const targetUser = interaction.options.getUser('user');
      
      // Get current stats
      const currentData = await DatabaseHelper.getUserAchievements(interaction.guild.id, targetUser.id);
      
      // Use provided values or keep current values
      const messages = interaction.options.getInteger('messages') ?? (currentData?.messages || 0);
      const voiceMinutes = interaction.options.getInteger('voice_minutes') ?? (currentData?.voice_minutes || 0);
      const reactionsGiven = interaction.options.getInteger('reactions_given') ?? (currentData?.reactions_given || 0);
      const reactionsReceived = interaction.options.getInteger('reactions_received') ?? (currentData?.reactions_received || 0);
      
      // Calculate which achievements should be unlocked
      const achievements = [];
      
      // Message achievements
      if (messages >= 100) achievements.push('msg_100');
      if (messages >= 500) achievements.push('msg_500');
      if (messages >= 1000) achievements.push('msg_1000');
      if (messages >= 5000) achievements.push('msg_5000');
      if (messages >= 10000) achievements.push('msg_10000');
      
      // Voice achievements
      if (voiceMinutes >= 30) achievements.push('vc_30');
      if (voiceMinutes >= 60) achievements.push('vc_60');
      if (voiceMinutes >= 500) achievements.push('vc_500');
      if (voiceMinutes >= 1000) achievements.push('vc_1000');
      if (voiceMinutes >= 5000) achievements.push('vc_5000');
      
      // Reaction achievements
      if (reactionsGiven >= 50) achievements.push('react_50');
      if (reactionsGiven >= 250) achievements.push('react_250');
      if (reactionsGiven >= 1000) achievements.push('react_1000');
      
      // Popularity achievements
      if (reactionsReceived >= 100) achievements.push('popular_100');
      if (reactionsReceived >= 500) achievements.push('popular_500');
      
      // Update database
      await DatabaseHelper.setUserAchievementStats(
        interaction.guild.id,
        targetUser.id,
        messages,
        voiceMinutes,
        reactionsGiven,
        reactionsReceived,
        achievements.join(',')
      );
      
      await interaction.editReply({
        content: `✅ Updated achievement stats for ${targetUser}:\n` +
                 `📨 Messages: ${messages.toLocaleString()}\n` +
                 `🎙️ Voice Minutes: ${voiceMinutes.toLocaleString()}\n` +
                 `👍 Reactions Given: ${reactionsGiven.toLocaleString()}\n` +
                 `⭐ Reactions Received: ${reactionsReceived.toLocaleString()}\n` +
                 `🏆 Achievements Unlocked: ${achievements.length}/15`
      });

    } catch (error) {
      console.error('Error setting achievement stats:', error);
      await interaction.editReply({
        content: '❌ Failed to update achievement stats. Check console for errors.'
      });
    }
  }
};

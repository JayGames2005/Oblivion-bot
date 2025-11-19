const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the XP leaderboard')
    .addStringOption(option =>
      option.setName('timeframe')
        .setDescription('Leaderboard timeframe')
        .addChoices(
          { name: 'All Time', value: 'alltime' },
          { name: 'This Week', value: 'weekly' }
        )
        .setRequired(false))
    .setDMPermission(false),

  async execute(interaction) {
    try {
      await interaction.deferReply();
    } catch (err) {
      console.error('Failed to defer leaderboard:', err);
      return;
    }

    const timeframe = interaction.options.getString('timeframe') || 'alltime';
    
    // Get leaderboard data
    const leaderboard = timeframe === 'weekly' 
      ? await DatabaseHelper.getWeeklyLeaderboard(interaction.guild.id)
      : await DatabaseHelper.getAllTimeLeaderboard(interaction.guild.id);

    if (!leaderboard || leaderboard.length === 0) {
      return interaction.editReply({
        content: '❌ No leaderboard data available yet!'
      });
    }

    // Build leaderboard embed
    const medals = ['🥇', '🥈', '🥉'];
    const description = leaderboard.slice(0, 10).map((entry, index) => {
      const medal = medals[index] || `**${index + 1}.**`;
      const level = Math.floor(0.1 * Math.sqrt(entry.xp));
      return `${medal} <@${entry.user_id}> - Level ${level} (${entry.xp.toLocaleString()} XP)`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${timeframe === 'weekly' ? 'Weekly' : 'All-Time'} Leaderboard`)
      .setDescription(description || 'No data available')
      .setColor('#FFD700')
      .setFooter({ text: `${interaction.guild.name} • ${leaderboard.length} ranked members` })
      .setTimestamp();

    // Add user's rank if not in top 10
    const userRank = leaderboard.findIndex(e => e.user_id === interaction.user.id);
    if (userRank >= 10) {
      const userData = leaderboard[userRank];
      const userLevel = Math.floor(0.1 * Math.sqrt(userData.xp));
      embed.addFields({
        name: 'Your Rank',
        value: `#${userRank + 1} - Level ${userLevel} (${userData.xp.toLocaleString()} XP)`
      });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};

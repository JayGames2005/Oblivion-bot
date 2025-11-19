const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your or another user\'s rank and XP')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check rank for')
        .setRequired(false))
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.editReply({
        content: '❌ That user is not in this server!'
      });
    }

    if (user.bot) {
      return interaction.editReply({
        content: '❌ Bots don\'t have XP!'
      });
    }

    // Get user XP data
    const userData = await DatabaseHelper.getUserXP(interaction.guild.id, user.id);
    
    if (!userData || userData.xp === 0) {
      return interaction.editReply({
        content: `${user.tag} hasn't earned any XP yet!`
      });
    }

    // Calculate level
    const level = Math.floor(0.1 * Math.sqrt(userData.xp));
    const xpForCurrentLevel = Math.pow(level * 10, 2);
    const xpForNextLevel = Math.pow((level + 1) * 10, 2);
    const xpProgress = userData.xp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const progressPercent = Math.floor((xpProgress / xpNeeded) * 100);

    // Get rank
    const rank = await DatabaseHelper.getUserRank(interaction.guild.id, user.id);

    // Create progress bar
    const progressBarLength = 20;
    const filledLength = Math.floor((progressPercent / 100) * progressBarLength);
    const progressBar = '█'.repeat(filledLength) + '░'.repeat(progressBarLength - filledLength);

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${user.tag}'s Rank`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setColor(member.displayHexColor || '#5865F2')
      .addFields(
        { name: '🏆 Rank', value: `#${rank}`, inline: true },
        { name: '⭐ Level', value: `${level}`, inline: true },
        { name: '💎 Total XP', value: `${userData.xp.toLocaleString()}`, inline: true },
        { 
          name: '📈 Progress to Next Level',
          value: `${progressBar} ${progressPercent}%\n${xpProgress.toLocaleString()}/${xpNeeded.toLocaleString()} XP`,
          inline: false
        }
      )
      .setFooter({ text: `Messages sent: ${userData.messages}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};

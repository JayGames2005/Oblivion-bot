const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setxp')
    .setDescription('Set a user\'s XP (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to set XP for')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('The amount of XP to set')
        .setRequired(true)
        .setMinValue(0))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser('user');
      const xpAmount = interaction.options.getInteger('amount');

      // Get current XP data
      const currentData = await DatabaseHelper.getUserXP(interaction.guild.id, targetUser.id);
      const currentXP = currentData ? currentData.xp : 0;

      // Calculate XP difference
      const xpDiff = xpAmount - currentXP;

      if (xpDiff !== 0) {
        // Add or subtract XP to reach target amount
        await DatabaseHelper.addUserXP(interaction.guild.id, targetUser.id, xpDiff);
      }

      const newLevel = Math.floor(0.1 * Math.sqrt(xpAmount));

      await interaction.editReply({
        content: `✅ Set ${targetUser}'s XP to **${xpAmount.toLocaleString()}** (Level ${newLevel})`
      });

    } catch (error) {
      console.error('Error setting XP:', error);
      await interaction.editReply({
        content: '❌ Failed to set XP. Please try again.'
      });
    }
  }
};

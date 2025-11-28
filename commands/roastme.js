const { SlashCommandBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roastme')
    .setDescription('Opt in to receive a daily AI-generated roast!'),
  async execute(interaction) {
    await DatabaseHelper.setAIDailyOptin(interaction.guild.id, interaction.user.id, 'roast');
    await interaction.reply({ content: '🔥 You will now receive a daily AI-generated roast! Use /optout to stop.', flags: 64 });
  }
};

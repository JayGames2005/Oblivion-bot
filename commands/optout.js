const { SlashCommandBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('optout')
    .setDescription('Opt out of daily AI-generated roasts or compliments.'),
  async execute(interaction) {
    await DatabaseHelper.removeAIDailyOptin(interaction.guild.id, interaction.user.id);
    await interaction.reply({ content: '✅ You have opted out of daily AI-generated roasts and compliments.', flags: 64 });
  }
};

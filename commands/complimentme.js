const { SlashCommandBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('complimentme')
    .setDescription('Opt in to receive a daily AI-generated compliment!'),
  async execute(interaction) {
    await DatabaseHelper.setAIDailyOptin(interaction.guild.id, interaction.user.id, 'compliment');
    await interaction.reply({ content: '💖 You will now receive a daily AI-generated compliment! Use /optout to stop.', flags: 64 });
  }
};

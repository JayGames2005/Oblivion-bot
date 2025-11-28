const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-features')
    .setDescription('Set up database tables for custom commands and birthdays')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
      await DatabaseHelper.createCustomCommandsTable();
      await DatabaseHelper.createBirthdaysTable();
      await interaction.editReply({ content: '✅ Custom commands and birthdays tables are set up in the database!' });
    } catch (e) {
      await interaction.editReply({ content: '❌ Failed to set up tables: ' + e.message });
    }
  }
};

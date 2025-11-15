const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { statements } = require('../database');
const Logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove a warning from a user')
    .addIntegerOption(option =>
      option.setName('warning_id')
        .setDescription('The ID of the warning to remove')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for removing the warning')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const warningId = interaction.options.getInteger('warning_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      // Get warning
      const warning = statements.db.prepare('SELECT * FROM warnings WHERE id = ? AND guild_id = ?').get(warningId, interaction.guild.id);

      if (!warning) {
        return interaction.reply({ 
          embeds: [Logger.error('Warning not found!')], 
          ephemeral: true 
        });
      }

      // Get user
      const user = await interaction.client.users.fetch(warning.user_id).catch(() => null);

      // Delete warning
      statements.deleteWarning.run(warningId);

      // Log the action
      if (user) {
        await Logger.logAction(
          interaction.guild,
          'Unwarn',
          user,
          interaction.user,
          `Removed warning #${warningId}: ${reason}`
        );
      }

      // Reply
      await interaction.reply({
        embeds: [Logger.success(
          `Warning #${warningId} has been removed!\n` +
          `**User:** ${user ? user.tag : 'Unknown'}\n` +
          `**Reason:** ${reason}`
        )]
      });

    } catch (error) {
      console.error('Error removing warning:', error);
      await interaction.reply({ 
        embeds: [Logger.error('Failed to remove warning.')], 
        ephemeral: true 
      });
    }
  }
};

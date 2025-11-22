const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseHelper = require('../database-helper');
const Logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove warnings from a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to remove warnings from')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of warnings to remove (default: 1, use 0 for all)')
        .setMinValue(0)
        .setRequired(false))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for removing the warnings')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.reply({ content: '⏳ Removing warnings...', flags: 64 });
    
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount') ?? 1;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      // Get user's warnings
      const warnings = await DatabaseHelper.getWarnings(interaction.guild.id, user.id);

      if (warnings.length === 0) {
        return interaction.editReply({ 
          embeds: [Logger.error(`**${user.tag}** has no warnings to remove!`)]
        });
      }

      let removed = 0;

      if (amount === 0) {
        // Remove all warnings
        await DatabaseHelper.clearWarnings(interaction.guild.id, user.id);
        removed = warnings.length;
      } else {
        // Remove specified amount
        const toRemove = Math.min(amount, warnings.length);
        for (let i = 0; i < toRemove; i++) {
          await DatabaseHelper.deleteWarning(warnings[i].id);
          removed++;
        }
      }

      // Log the action
      await Logger.logAction(
        interaction.guild,
        'Unwarn',
        user,
        interaction.user,
        `Removed ${removed} warning(s): ${reason}`
      );

      // Reply
      await interaction.editReply({
        embeds: [Logger.success(
          `Removed **${removed}** warning(s) from **${user.tag}**!\n` +
          `**Remaining:** ${warnings.length - removed}\n` +
          `**Reason:** ${reason}`
        )]
      });

    } catch (error) {
      console.error('Error removing warnings:', error);
      await interaction.editReply({ 
        embeds: [Logger.error('Failed to remove warnings.')]
      });
    }
  }
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { statements } = require('../database');
const Logger = require('../utils/logger');
const { canModerate } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    // Check if user can be moderated
    const moderationCheck = canModerate(interaction.member, target, interaction.guild);
    if (!moderationCheck.canModerate) {
      return interaction.reply({ 
        embeds: [Logger.error(moderationCheck.reason)], 
        ephemeral: true 
      });
    }

    try {
      // Add warning to database
      statements.addWarning.run(
        interaction.guild.id,
        target.id,
        interaction.user.id,
        reason,
        Date.now()
      );

      // Get warning count
      const warningCount = statements.getWarningCount.get(interaction.guild.id, target.id);

      // Try to DM the user
      try {
        await target.send({
          embeds: [Logger.warning(
            `You have been warned in **${interaction.guild.name}**\n` +
            `**Reason:** ${reason}\n` +
            `**Moderator:** ${interaction.user.tag}\n` +
            `**Total Warnings:** ${warningCount.count}`
          )]
        });
      } catch (error) {
        // User has DMs disabled or blocked the bot
      }

      // Log the action
      const caseNumber = await Logger.logAction(
        interaction.guild,
        'Warn',
        target,
        interaction.user,
        reason
      );

      // Reply
      await interaction.reply({
        embeds: [Logger.success(
          `**${target.tag}** has been warned!\n` +
          `**Reason:** ${reason}\n` +
          `**Total Warnings:** ${warningCount.count}\n` +
          `**Case:** #${caseNumber}`
        )]
      });

    } catch (error) {
      console.error('Error warning user:', error);
      await interaction.reply({ 
        embeds: [Logger.error('Failed to warn user.')], 
        ephemeral: true 
      });
    }
  }
};

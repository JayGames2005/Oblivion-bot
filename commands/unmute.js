const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { statements } = require('../database');
const Logger = require('../utils/logger');
const { canModerate } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a user in the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to unmute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the unmute')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Check if user can be moderated
    const moderationCheck = canModerate(interaction.member, target, interaction.guild);
    if (!moderationCheck.canModerate) {
      return interaction.reply({ 
        embeds: [Logger.error(moderationCheck.reason)], 
        ephemeral: true 
      });
    }

    // Get member
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ 
        embeds: [Logger.error('That user is not in this server!')], 
        ephemeral: true 
      });
    }

    // Check if user is timed out
    if (!member.communicationDisabledUntilTimestamp) {
      return interaction.reply({ 
        embeds: [Logger.error('That user is not timed out!')], 
        ephemeral: true 
      });
    }

    // Check bot permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ 
        embeds: [Logger.error('I don\'t have permission to manage timeouts!')], 
        ephemeral: true 
      });
    }

    try {
      // Remove timeout
      await member.timeout(null, `${reason} | By ${interaction.user.tag}`);

      // Remove from database
      statements.removeMute.run(interaction.guild.id, target.id);

      // Try to DM the user
      try {
        await target.send({
          embeds: [Logger.success(
            `Your timeout has been removed in **${interaction.guild.name}**\n` +
            `**Reason:** ${reason}\n` +
            `**Moderator:** ${interaction.user.tag}`
          )]
        });
      } catch (error) {
        // User has DMs disabled or blocked the bot
      }

      // Log the action
      const caseNumber = await Logger.logAction(
        interaction.guild,
        'Unmute',
        target,
        interaction.user,
        reason
      );

      // Reply
      await interaction.reply({
        embeds: [Logger.success(
          `**${target.tag}** has been unmuted!\n` +
          `**Reason:** ${reason}\n` +
          `**Case:** #${caseNumber}`
        )]
      });

    } catch (error) {
      console.error('Error unmuting user:', error);
      await interaction.reply({ 
        embeds: [Logger.error('Failed to unmute user. Make sure I have the proper permissions.')], 
        ephemeral: true 
      });
    }
  }
};

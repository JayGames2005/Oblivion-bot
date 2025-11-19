const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseHelper = require('../database-helper');
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
      return interaction.editReply({ 
        embeds: [Logger.error(moderationCheck.reason)]
      });
    }

    // Get member
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.editReply({ 
        embeds: [Logger.error('That user is not in this server!')]
      });
    }

    // Check if user is timed out
    if (!member.communicationDisabledUntilTimestamp) {
      return interaction.editReply({ 
        embeds: [Logger.error('That user is not timed out!')]
      });
    }

    // Check bot permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.editReply({ 
        embeds: [Logger.error('I don\'t have permission to manage timeouts!')]
      });
    }

    try {
      // Remove timeout
      await member.timeout(null, `${reason} | By ${interaction.user.tag}`);

      // Remove from database
      await DatabaseHelper.removeMute(interaction.guild.id, target.id);

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
      await interaction.editReply({
        embeds: [Logger.success(
          `**${target.tag}** has been unmuted!\n` +
          `**Reason:** ${reason}\n` +
          `**Case:** #${caseNumber}`
        )]
      });

    } catch (error) {
      console.error('Error unmuting user:', error);
      await interaction.editReply({ 
        embeds: [Logger.error('Failed to unmute user. Make sure I have the proper permissions.')]
      });
    }
  }
};

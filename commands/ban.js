const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');
const { canModerate } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('delete_days')
        .setDescription('Number of days of messages to delete (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    // Check if user can be moderated
    const moderationCheck = canModerate(interaction.member, target, interaction.guild);
    if (!moderationCheck.canModerate) {
      return interaction.reply({ 
        embeds: [Logger.error(moderationCheck.reason)], 
        ephemeral: true 
      });
    }

    // Check bot permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ 
        embeds: [Logger.error('I don\'t have permission to ban members!')], 
        ephemeral: true 
      });
    }

    try {
      // Try to DM the user before banning
      try {
        await target.send({
          embeds: [Logger.warning(
            `You have been banned from **${interaction.guild.name}**\n` +
            `**Reason:** ${reason}\n` +
            `**Moderator:** ${interaction.user.tag}`
          )]
        });
      } catch (error) {
        // User has DMs disabled or blocked the bot
      }

      // Ban the user
      await interaction.guild.members.ban(target, {
        reason: `${reason} | Banned by ${interaction.user.tag}`,
        deleteMessageSeconds: deleteDays * 24 * 60 * 60
      });

      // Log the action
      const caseNumber = await Logger.logAction(
        interaction.guild,
        'Ban',
        target,
        interaction.user,
        reason
      );

      // Reply
      await interaction.reply({
        embeds: [Logger.success(
          `**${target.tag}** has been banned!\n` +
          `**Reason:** ${reason}\n` +
          `**Case:** #${caseNumber}`
        )]
      });

    } catch (error) {
      console.error('Error banning user:', error);
      await interaction.reply({ 
        embeds: [Logger.error('Failed to ban user. Make sure I have the proper permissions and role hierarchy.')], 
        ephemeral: true 
      });
    }
  }
};

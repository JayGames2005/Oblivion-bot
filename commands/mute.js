const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseHelper = require('../database-helper');
const Logger = require('../utils/logger');
const { canModerate, parseDuration, formatDuration } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a user (Discord native timeout)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to timeout')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration (e.g., 1h, 30m, 1d) - max 28 days')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply();
    
    const target = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');
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

    // Check bot permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.editReply({ 
        embeds: [Logger.error('I don\'t have permission to timeout members!')]
      });
    }

    // Parse duration
    const duration = parseDuration(durationStr);
    if (!duration) {
      return interaction.editReply({ 
        embeds: [Logger.error('Invalid duration format! Use formats like: 1h, 30m, 1d')]
      });
    }

    // Discord timeout max is 28 days (2419200000 ms)
    if (duration > 2419200000) {
      return interaction.editReply({ 
        embeds: [Logger.error('Duration cannot exceed 28 days!')]
      });
    }

    const durationText = formatDuration(duration);
    const expiresAt = Date.now() + duration;

    try {
      // Apply Discord timeout
      await member.timeout(duration, `${reason} | By ${interaction.user.tag}`);

      // Save to database
      await DatabaseHelper.addMute(
        interaction.guild.id,
        target.id,
        expiresAt,
        reason
      );

      // Try to DM the user
      try {
        await target.send({
          embeds: [Logger.warning(
            `You have been timed out in **${interaction.guild.name}**\n` +
            `**Duration:** ${durationText}\n` +
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
        'Mute',
        target,
        interaction.user,
        reason,
        durationText
      );

      // Reply
      await interaction.editReply({
        embeds: [Logger.success(
          `**${target.tag}** has been timed out!\n` +
          `**Duration:** ${durationText}\n` +
          `**Reason:** ${reason}\n` +
          `**Case:** #${caseNumber}`
        )]
      });

    } catch (error) {
      console.error('Error timing out user:', error);
      await interaction.editReply({ 
        embeds: [Logger.error('Failed to timeout user. Make sure I have the proper permissions.')]
      });
    }
  }
};

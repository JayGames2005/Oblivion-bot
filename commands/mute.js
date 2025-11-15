const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { statements } = require('../database');
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
    const target = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');
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

    // Check bot permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ 
        embeds: [Logger.error('I don\'t have permission to timeout members!')], 
        ephemeral: true 
      });
    }

    // Parse duration
    const duration = parseDuration(durationStr);
    if (!duration) {
      return interaction.reply({ 
        embeds: [Logger.error('Invalid duration format! Use formats like: 1h, 30m, 1d')], 
        ephemeral: true 
      });
    }

    // Discord timeout max is 28 days (2419200000 ms)
    if (duration > 2419200000) {
      return interaction.reply({ 
        embeds: [Logger.error('Duration cannot exceed 28 days!')], 
        ephemeral: true 
      });
    }

    const durationText = formatDuration(duration);
    const expiresAt = Date.now() + duration;

    try {
      // Apply Discord timeout
      await member.timeout(duration, `${reason} | By ${interaction.user.tag}`);

      // Save to database
      statements.addMute.run(
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
      await interaction.reply({
        embeds: [Logger.success(
          `**${target.tag}** has been timed out!\n` +
          `**Duration:** ${durationText}\n` +
          `**Reason:** ${reason}\n` +
          `**Case:** #${caseNumber}`
        )]
      });

    } catch (error) {
      console.error('Error timing out user:', error);
      await interaction.reply({ 
        embeds: [Logger.error('Failed to timeout user. Make sure I have the proper permissions.')], 
        ephemeral: true 
      });
    }
  }
};

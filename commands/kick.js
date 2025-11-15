const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');
const { canModerate } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
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

    // Check bot permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({ 
        embeds: [Logger.error('I don\'t have permission to kick members!')], 
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

    try {
      // Try to DM the user before kicking
      try {
        await target.send({
          embeds: [Logger.warning(
            `You have been kicked from **${interaction.guild.name}**\n` +
            `**Reason:** ${reason}\n` +
            `**Moderator:** ${interaction.user.tag}`
          )]
        });
      } catch (error) {
        // User has DMs disabled or blocked the bot
      }

      // Kick the user
      await member.kick(`${reason} | Kicked by ${interaction.user.tag}`);

      // Log the action
      const caseNumber = await Logger.logAction(
        interaction.guild,
        'Kick',
        target,
        interaction.user,
        reason
      );

      // Reply
      await interaction.reply({
        embeds: [Logger.success(
          `**${target.tag}** has been kicked!\n` +
          `**Reason:** ${reason}\n` +
          `**Case:** #${caseNumber}`
        )]
      });

    } catch (error) {
      console.error('Error kicking user:', error);
      await interaction.reply({ 
        embeds: [Logger.error('Failed to kick user. Make sure I have the proper permissions and role hierarchy.')], 
        ephemeral: true 
      });
    }
  }
};

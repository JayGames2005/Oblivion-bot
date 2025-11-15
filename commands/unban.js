const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .addStringOption(option =>
      option.setName('user_id')
        .setDescription('The ID of the user to unban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the unban')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Check bot permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ 
        embeds: [Logger.error('I don\'t have permission to unban members!')], 
        ephemeral: true 
      });
    }

    try {
      // Check if user is banned
      const bans = await interaction.guild.bans.fetch();
      const bannedUser = bans.get(userId);

      if (!bannedUser) {
        return interaction.reply({ 
          embeds: [Logger.error('That user is not banned!')], 
          ephemeral: true 
        });
      }

      // Unban the user
      await interaction.guild.members.unban(userId, `${reason} | Unbanned by ${interaction.user.tag}`);

      // Log the action
      const caseNumber = await Logger.logAction(
        interaction.guild,
        'Unban',
        bannedUser.user,
        interaction.user,
        reason
      );

      // Reply
      await interaction.reply({
        embeds: [Logger.success(
          `**${bannedUser.user.tag}** has been unbanned!\n` +
          `**Reason:** ${reason}\n` +
          `**Case:** #${caseNumber}`
        )]
      });

    } catch (error) {
      console.error('Error unbanning user:', error);
      await interaction.reply({ 
        embeds: [Logger.error('Failed to unban user. Please check the user ID and try again.')], 
        ephemeral: true 
      });
    }
  }
};

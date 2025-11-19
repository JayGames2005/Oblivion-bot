const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete multiple messages')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('user');

    // Check bot permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ 
        embeds: [Logger.error('I don\'t have permission to manage messages!')], 
        ephemeral: true 
      });
    }

    try {
      // Fetch messages
      const messages = await interaction.channel.messages.fetch({ limit: amount + 1 });

      // Filter messages if user is specified
      let messagesToDelete = messages;
      if (targetUser) {
        messagesToDelete = messages.filter(msg => msg.author.id === targetUser.id);
      }

      // Filter out messages older than 14 days (Discord API limitation)
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
      messagesToDelete = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);

      if (messagesToDelete.size === 0) {
        return interaction.editReply({
          embeds: [Logger.warning('No messages found to delete! (Messages must be less than 14 days old)')]
        });
      }

      // Delete messages
      const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);

      // Reply
      await interaction.editReply({
        embeds: [Logger.success(
          `Successfully deleted **${deleted.size}** message${deleted.size !== 1 ? 's' : ''}!` +
          (targetUser ? `\n**User:** ${targetUser.tag}` : '')
        )]
      });

      // Log the action
      await Logger.logAction(
        interaction.guild,
        'Purge',
        targetUser || interaction.user,
        interaction.user,
        `Purged ${deleted.size} message(s) in ${interaction.channel}` +
        (targetUser ? ` from ${targetUser.tag}` : '')
      );

    } catch (error) {
      console.error('Error purging messages:', error);
      await interaction.editReply({ 
        embeds: [Logger.error('Failed to purge messages. Make sure the messages are less than 14 days old.')]
      });
    }
  }
};

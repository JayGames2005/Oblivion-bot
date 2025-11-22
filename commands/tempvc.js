const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const DatabaseHelper = require('../database-helper');
const Logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempvc')
    .setDescription('Configure temporary voice channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Create a "Join to Create" voice channel')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Name for the creator channel (default: "➕ Join to Create")')
            .setRequired(false))
        .addChannelOption(option =>
          option.setName('category')
            .setDescription('Category to create channels in')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove the temporary VC system'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('View current temporary VC settings'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      try {
        const channelName = interaction.options.getString('name') || '➕ Join to Create';
        const category = interaction.options.getChannel('category');

        // Create the join-to-create channel
        const creatorChannel = await interaction.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildVoice,
          parent: category?.id,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
            }
          ],
          reason: 'Temporary voice channel creator'
        });

        // Save to database
        await DatabaseHelper.setTempVCChannel(interaction.guild.id, creatorChannel.id, category?.id || null);

        await interaction.editReply({
          embeds: [Logger.success(
            `✅ Temporary voice channel system enabled!\n\n` +
            `**Creator Channel:** ${creatorChannel}\n` +
            `${category ? `**Category:** ${category.name}\n` : ''}` +
            `\nWhen users join ${creatorChannel}, a private voice channel will be created for them.\n` +
            `The channel will be deleted when everyone leaves.`
          )]
        });

      } catch (error) {
        console.error('Error setting up temp VC:', error);
        await interaction.editReply({
          embeds: [Logger.error(`Failed to set up temporary voice channels: ${error.message}`)]
        });
      }
    } else if (subcommand === 'remove') {
      try {
        const settings = await DatabaseHelper.getTempVCSettings(interaction.guild.id);

        if (!settings || !settings.creator_channel_id) {
          return interaction.editReply({
            embeds: [Logger.error('No temporary voice channel system is configured!')]
          });
        }

        // Try to delete the creator channel
        try {
          const channel = await interaction.guild.channels.fetch(settings.creator_channel_id);
          if (channel) {
            await channel.delete('Removing temp VC system');
          }
        } catch (err) {
          // Channel might already be deleted
        }

        await DatabaseHelper.removeTempVCChannel(interaction.guild.id);

        await interaction.editReply({
          embeds: [Logger.success('✅ Temporary voice channel system has been removed!')]
        });

      } catch (error) {
        console.error('Error removing temp VC:', error);
        await interaction.editReply({
          embeds: [Logger.error(`Failed to remove temporary voice channels: ${error.message}`)]
        });
      }
    } else if (subcommand === 'settings') {
      try {
        const settings = await DatabaseHelper.getTempVCSettings(interaction.guild.id);

        if (!settings || !settings.creator_channel_id) {
          return interaction.editReply({
            embeds: [Logger.error('No temporary voice channel system is configured!\n\nUse `/tempvc setup` to enable it.')]
          });
        }

        let channelMention = 'Not found (may have been deleted)';
        try {
          const channel = await interaction.guild.channels.fetch(settings.creator_channel_id);
          if (channel) channelMention = `${channel}`;
        } catch (err) {
          // Channel not found
        }

        let categoryName = 'None';
        if (settings.category_id) {
          try {
            const category = await interaction.guild.channels.fetch(settings.category_id);
            if (category) categoryName = category.name;
          } catch (err) {
            categoryName = 'Not found';
          }
        }

        await interaction.editReply({
          embeds: [Logger.success(
            `**🔊 Temporary Voice Channel Settings**\n\n` +
            `**Creator Channel:** ${channelMention}\n` +
            `**Category:** ${categoryName}\n\n` +
            `Users who join the creator channel will get their own temporary voice channel.`
          )]
        });

      } catch (error) {
        console.error('Error fetching temp VC settings:', error);
        await interaction.editReply({
          embeds: [Logger.error(`Failed to fetch settings: ${error.message}`)]
        });
      }
    }
  }
};

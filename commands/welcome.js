const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure welcome messages')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Set up welcome messages')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel to send welcome messages')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Welcome message (use {user} for mention, {server} for server name)')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable welcome messages'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('test')
        .setDescription('Test the current welcome message'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');

      // Check bot permissions
      if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
        return interaction.editReply({
          content: '❌ I don\'t have permission to send messages in that channel!'
        });
      }

      // Save to database
      await DatabaseHelper.setWelcomeSettings(
        interaction.guild.id,
        channel.id,
        message
      );

      const embed = new EmbedBuilder()
        .setTitle('✅ Welcome Messages Enabled')
        .setColor('#43B581')
        .addFields(
          { name: 'Channel', value: `${channel}`, inline: true },
          { name: 'Message', value: message, inline: false }
        )
        .setFooter({ text: 'Use /welcome test to preview' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } else if (subcommand === 'disable') {
      await DatabaseHelper.disableWelcome(interaction.guild.id);

      await interaction.editReply({
        content: '✅ Welcome messages have been disabled.'
      });

    } else if (subcommand === 'test') {
      const settings = await DatabaseHelper.getWelcomeSettings(interaction.guild.id);

      if (!settings || !settings.welcome_enabled) {
        return interaction.editReply({
          content: '❌ Welcome messages are not configured. Use `/welcome setup` first.'
        });
      }

      const channel = interaction.guild.channels.cache.get(settings.welcome_channel);
      if (!channel) {
        return interaction.editReply({
          content: '❌ Welcome channel no longer exists. Please reconfigure.'
        });
      }

      // Format message
      let formattedMessage = settings.welcome_message
        .replace(/{user}/g, interaction.user.toString())
        .replace(/{server}/g, interaction.guild.name)
        .replace(/{memberCount}/g, interaction.guild.memberCount);

      const embed = new EmbedBuilder()
        .setTitle(`👋 Welcome to ${interaction.guild.name}!`)
        .setDescription(formattedMessage)
        .setColor('#5865F2')
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: `Member #${interaction.guild.memberCount}` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      await interaction.editReply({
        content: `✅ Test welcome message sent to ${channel}!`
      });
    }
  }
};

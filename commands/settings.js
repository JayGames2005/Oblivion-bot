const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const DatabaseHelper = require('../database-helper');
const Logger = require('../utils/logger');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure bot settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current server settings'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('modlog')
        .setDescription('Set the moderation log channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel for mod logs')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('oblivion-log')
        .setDescription('Set the Oblivion log channel (tracks everything)')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel for Oblivion logs')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('automod')
        .setDescription('Configure automod settings')
        .addStringOption(option =>
          option.setName('feature')
            .setDescription('The automod feature to configure')
            .setRequired(true)
            .addChoices(
              { name: 'Anti-Spam', value: 'anti_spam' },
              { name: 'Anti-Invite', value: 'anti_invite' },
              { name: 'Anti-Link', value: 'anti_link' }
            ))
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable this feature')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('banned-words')
        .setDescription('Manage banned words')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' },
              { name: 'Clear', value: 'clear' }
            ))
        .addStringOption(option =>
          option.setName('word')
            .setDescription('The word to add/remove')
            .setRequired(false)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
  await interaction.deferReply();
    
    const subcommand = interaction.options.getSubcommand();

    try {
      // Ensure guild settings exist
      let settings = await DatabaseHelper.getGuildSettings(interaction.guild.id);
      if (!settings) {
        const defaults = config.defaultSettings;
        await DatabaseHelper.setGuildSettings(
          interaction.guild.id,
          defaults.prefix,
          defaults.modLogChannel,
          defaults.muteRole,
          defaults.automod.antiSpam ? 1 : 0,
          defaults.automod.antiInvite ? 1 : 0,
          defaults.automod.antiLink ? 1 : 0,
          JSON.stringify(defaults.automod.bannedWords)
        );
        settings = await DatabaseHelper.getGuildSettings(interaction.guild.id);
      }

      if (subcommand === 'view') {
        const modLogChannel = settings.mod_log_channel ? `<#${settings.mod_log_channel}>` : 'Not set';
        const oblivionLogChannel = settings.oblivion_log_channel ? `<#${settings.oblivion_log_channel}>` : 'Not set';
        const bannedWords = JSON.parse(settings.automod_banned_words || '[]');

        const embed = new EmbedBuilder()
          .setTitle('⚙️ Server Settings')
          .setColor(0x3498DB)
          .addFields(
            { name: '📋 Mod Log Channel', value: modLogChannel, inline: true },
            { name: '📜 Oblivion Log Channel', value: oblivionLogChannel, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: '🚫 Anti-Spam', value: settings.automod_anti_spam ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '🔗 Anti-Invite', value: settings.automod_anti_invite ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '🌐 Anti-Link', value: settings.automod_anti_link ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '🤬 Banned Words', value: bannedWords.length > 0 ? `${bannedWords.length} word(s)` : 'None', inline: false }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'modlog') {
        const channel = interaction.options.getChannel('channel');

        // Check bot permissions in channel
        if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
          return interaction.editReply({ 
            embeds: [Logger.error('I don\'t have permission to send messages in that channel!')]
          });
        }

        // Update settings
        await DatabaseHelper.updateModLogChannel(channel.id, interaction.guild.id);

        await interaction.editReply({
          embeds: [Logger.success(`Mod log channel set to ${channel}!`)]
        });

      } else if (subcommand === 'oblivion-log') {
        const channel = interaction.options.getChannel('channel');

        // Check bot permissions in channel
        if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
          return interaction.editReply({ 
            embeds: [Logger.error('I don\'t have permission to send messages in that channel!')]
          });
        }

        // Update settings
        await DatabaseHelper.updateOblivionLogChannel(channel.id, interaction.guild.id);

        await interaction.editReply({
          embeds: [Logger.success(`Oblivion log channel set to ${channel}!\n\nThis channel will now track:\n• All messages sent\n• Message edits & deletions\n• Channels created & deleted\n• Roles created & deleted\n• Emojis & stickers added/removed\n• Members joining & leaving`)]
        });

      } else if (subcommand === 'automod') {
        const feature = interaction.options.getString('feature');
        const enabled = interaction.options.getBoolean('enabled');

        const methodMap = {
          'anti_spam': 'updateAutomodAntiSpam',
          'anti_invite': 'updateAutomodAntiInvite',
          'anti_link': 'updateAutomodAntiLink'
        };

        const method = methodMap[feature];
        await DatabaseHelper[method](enabled ? 1 : 0, interaction.guild.id);

        const featureName = feature.replace('_', '-');
        await interaction.editReply({
          embeds: [Logger.success(`${featureName} has been ${enabled ? 'enabled' : 'disabled'}!`)]
        });

      } else if (subcommand === 'banned-words') {
        const action = interaction.options.getString('action');
        const word = interaction.options.getString('word');

        const bannedWords = JSON.parse(settings.automod_banned_words || '[]');

        if (action === 'add') {
          if (!word) {
            return interaction.editReply({ 
              embeds: [Logger.error('Please specify a word to add!')]
            });
          }

          if (bannedWords.includes(word.toLowerCase())) {
            return interaction.editReply({ 
              embeds: [Logger.error('That word is already banned!')]
            });
          }

          bannedWords.push(word.toLowerCase());
          await DatabaseHelper.updateBannedWords(JSON.stringify(bannedWords), interaction.guild.id);

          await interaction.editReply({
            embeds: [Logger.success(`Added "${word}" to banned words list!`)]
          });

        } else if (action === 'remove') {
          if (!word) {
            return interaction.editReply({ 
              embeds: [Logger.error('Please specify a word to remove!')]
            });
          }

          const index = bannedWords.indexOf(word.toLowerCase());
          if (index === -1) {
            return interaction.editReply({ 
              embeds: [Logger.error('That word is not in the banned list!')]
            });
          }

          bannedWords.splice(index, 1);
          await DatabaseHelper.updateBannedWords(JSON.stringify(bannedWords), interaction.guild.id);

          await interaction.editReply({
            embeds: [Logger.success(`Removed "${word}" from banned words list!`)]
          });

        } else if (action === 'list') {
          if (bannedWords.length === 0) {
            return interaction.editReply({
              embeds: [Logger.info('No banned words configured.')],
              flags: ['Ephemeral']
            });
          }

          const embed = new EmbedBuilder()
            .setTitle('🤬 Banned Words')
            .setColor(0xFF0000)
            .setDescription(bannedWords.map((w, i) => `${i + 1}. ||${w}||`).join('\n'))
            .setFooter({ text: `Total: ${bannedWords.length} word(s)` })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed], flags: ['Ephemeral'] });

        } else if (action === 'clear') {
          await DatabaseHelper.updateBannedWords('[]', interaction.guild.id);

          await interaction.editReply({
            embeds: [Logger.success('Cleared all banned words!')]
          });
        }
      }

    } catch (error) {
      console.error('Error updating settings:', error);
      await interaction.editReply({ 
        embeds: [Logger.error('Failed to update settings.')]
      });
    }
  }
};

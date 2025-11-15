const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { statements } = require('../database');
const Logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cases')
    .setDescription('View moderation cases')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View a specific case')
        .addIntegerOption(option =>
          option.setName('case_number')
            .setDescription('The case number to view')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('user')
        .setDescription('View all cases for a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check cases for')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View recent cases'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'view') {
        const caseNumber = interaction.options.getInteger('case_number');
        const modCase = statements.getModCase.get(interaction.guild.id, caseNumber);

        if (!modCase) {
          return interaction.reply({ 
            embeds: [Logger.error('Case not found!')], 
            ephemeral: true 
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`📋 Case #${modCase.case_number}`)
          .setColor(Logger.getActionColor(modCase.action))
          .addFields(
            { name: '⚖️ Action', value: modCase.action, inline: true },
            { name: '👤 User', value: `${modCase.user_tag} (${modCase.user_id})`, inline: true },
            { name: '👮 Moderator', value: `${modCase.moderator_tag} (${modCase.moderator_id})`, inline: true },
            { name: '📝 Reason', value: modCase.reason || 'No reason provided', inline: false },
            { name: '📅 Date', value: `<t:${Math.floor(modCase.created_at / 1000)}:F>`, inline: false }
          )
          .setTimestamp(modCase.created_at);

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'user') {
        const user = interaction.options.getUser('user');
        const cases = statements.getUserModCases.all(interaction.guild.id, user.id);

        if (cases.length === 0) {
          return interaction.reply({
            embeds: [Logger.info(`**${user.tag}** has no moderation cases.`)]
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`📋 Cases for ${user.tag}`)
          .setThumbnail(user.displayAvatarURL())
          .setColor(0x3498DB)
          .setDescription(`Total cases: **${cases.length}**`)
          .setTimestamp();

        // Add case fields (max 25)
        const maxCases = Math.min(cases.length, 25);
        for (let i = 0; i < maxCases; i++) {
          const modCase = cases[i];
          const timestamp = Math.floor(modCase.created_at / 1000);
          
          embed.addFields({
            name: `Case #${modCase.case_number} - ${modCase.action}`,
            value: `**Moderator:** ${modCase.moderator_tag}\n**Reason:** ${modCase.reason || 'No reason'}\n**Date:** <t:${timestamp}:R>`,
            inline: false
          });
        }

        if (cases.length > 25) {
          embed.setFooter({ text: `Showing 25 of ${cases.length} cases` });
        }

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'list') {
        const cases = statements.getAllModCases.all(interaction.guild.id);

        if (cases.length === 0) {
          return interaction.reply({
            embeds: [Logger.info('No moderation cases found.')]
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('📋 Recent Moderation Cases')
          .setColor(0x3498DB)
          .setDescription(`Total cases: **${cases.length}**`)
          .setTimestamp();

        // Add case fields (max 10 recent)
        const maxCases = Math.min(cases.length, 10);
        for (let i = 0; i < maxCases; i++) {
          const modCase = cases[i];
          const timestamp = Math.floor(modCase.created_at / 1000);
          
          embed.addFields({
            name: `Case #${modCase.case_number} - ${modCase.action}`,
            value: `**User:** ${modCase.user_tag}\n**Moderator:** ${modCase.moderator_tag}\n**Date:** <t:${timestamp}:R>`,
            inline: true
          });
        }

        if (cases.length > 10) {
          embed.setFooter({ text: `Showing 10 of ${cases.length} cases` });
        }

        await interaction.reply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Error fetching cases:', error);
      await interaction.reply({ 
        embeds: [Logger.error('Failed to fetch cases.')], 
        ephemeral: true 
      });
    }
  }
};

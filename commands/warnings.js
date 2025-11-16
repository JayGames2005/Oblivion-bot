const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');
const Logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check warnings for')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply();
    
    const target = interaction.options.getUser('user');

    try {
      // Get warnings
      const warnings = await DatabaseHelper.getWarnings(interaction.guild.id, target.id);

      if (warnings.length === 0) {
        return interaction.editReply({
          embeds: [Logger.info(`**${target.tag}** has no warnings.`)]
        });
      }

      // Create embed with warnings
      const embed = new EmbedBuilder()
        .setTitle(`⚠️ Warnings for ${target.tag}`)
        .setThumbnail(target.displayAvatarURL())
        .setColor(0xFFCC00)
        .setDescription(`Total warnings: **${warnings.length}**`)
        .setTimestamp();

      // Add warning fields (max 25 fields)
      const maxWarnings = Math.min(warnings.length, 25);
      for (let i = 0; i < maxWarnings; i++) {
        const warning = warnings[i];
        const moderator = await interaction.client.users.fetch(warning.moderator_id).catch(() => null);
        const timestamp = Math.floor(warning.created_at / 1000);
        
        embed.addFields({
          name: `Warning #${warning.id}`,
          value: `**Reason:** ${warning.reason}\n**Moderator:** ${moderator ? moderator.tag : 'Unknown'}\n**Date:** <t:${timestamp}:R>`,
          inline: false
        });
      }

      if (warnings.length > 25) {
        embed.setFooter({ text: `Showing 25 of ${warnings.length} warnings` });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching warnings:', error);
      await interaction.editReply({ 
        embeds: [Logger.error('Failed to fetch warnings.')]
      });
    }
  }
};

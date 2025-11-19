const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseHelper = require('../database-helper');
const Logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get information about a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to get info about')
        .setRequired(false))
    .setDMPermission(false),

  async execute(interaction) {
    
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.editReply({ 
        embeds: [Logger.error('That user is not in this server!')]
      });
    }

    try {
      // Get user stats
      const warnings = await DatabaseHelper.getWarningCount(interaction.guild.id, user.id);
      const cases = await DatabaseHelper.getUserModCases(interaction.guild.id, user.id);
      const mute = await DatabaseHelper.getMute(interaction.guild.id, user.id);

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`👤 User Information: ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .setColor(member.displayHexColor || 0x3498DB)
        .addFields(
          { name: '🆔 User ID', value: user.id, inline: true },
          { name: '📛 Username', value: user.username, inline: true },
          { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true },
          { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>\n<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false },
          { name: '📥 Joined Server', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: false }
        );

      // Roles
      const roles = member.roles.cache
        .filter(role => role.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(role => role.toString())
        .slice(0, 20);

      if (roles.length > 0) {
        embed.addFields({ 
          name: `🎭 Roles [${member.roles.cache.size - 1}]`, 
          value: roles.join(', ') + (member.roles.cache.size > 21 ? '...' : ''), 
          inline: false 
        });
      }

      // Moderation info
      if (interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        const moderationInfo = [];
        
        moderationInfo.push(`⚠️ **Warnings:** ${warnings.count}`);
        moderationInfo.push(`📋 **Cases:** ${cases.length}`);
        moderationInfo.push(`🔇 **Muted:** ${mute ? 'Yes' : 'No'}`);

        if (mute && mute.expires_at) {
          moderationInfo.push(`⏱️ **Mute Expires:** <t:${Math.floor(mute.expires_at / 1000)}:R>`);
        }

        embed.addFields({ 
          name: '👮 Moderation Info', 
          value: moderationInfo.join('\n'), 
          inline: false 
        });
      }

      // Key permissions
      const keyPerms = [];
      if (member.permissions.has(PermissionFlagsBits.Administrator)) keyPerms.push('Administrator');
      if (member.permissions.has(PermissionFlagsBits.ManageGuild)) keyPerms.push('Manage Server');
      if (member.permissions.has(PermissionFlagsBits.ManageChannels)) keyPerms.push('Manage Channels');
      if (member.permissions.has(PermissionFlagsBits.ManageRoles)) keyPerms.push('Manage Roles');
      if (member.permissions.has(PermissionFlagsBits.BanMembers)) keyPerms.push('Ban Members');
      if (member.permissions.has(PermissionFlagsBits.KickMembers)) keyPerms.push('Kick Members');
      if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) keyPerms.push('Moderate Members');

      if (keyPerms.length > 0) {
        embed.addFields({ 
          name: '🔑 Key Permissions', 
          value: keyPerms.join(', '), 
          inline: false 
        });
      }

      embed.setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching user info:', error);
      await interaction.editReply({ 
        embeds: [Logger.error('Failed to fetch user information.')]
      });
    }
  }
};

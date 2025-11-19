const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseHelper = require('../database-helper');

const BOT_OWNER_ID = '1432443011488288890';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achcomplete')
    .setDescription('Grant all achievements to a user (Bot Owner only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to grant achievements to')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Defer immediately BEFORE any logic
    await interaction.deferReply({ flags: 64 });

    // Only bot owner can use this command
    if (interaction.user.id !== BOT_OWNER_ID) {
      return interaction.editReply({ 
        content: '❌ This command is restricted to the bot owner only.'
      });
    }

    try {
      const targetUser = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(targetUser.id);

      // Set max values for all achievement types (roles are optional)
      const maxMessages = 10000;
      const maxVoiceMinutes = 5000;
      const maxReactionsGiven = 1000;
      const maxReactionsReceived = 500;

      // Update database with max values using DatabaseHelper
      await DatabaseHelper.setUserAchievementStats(
        interaction.guild.id,
        targetUser.id,
        maxMessages,
        maxVoiceMinutes,
        maxReactionsGiven,
        maxReactionsReceived,
        'msg_100,msg_500,msg_1000,msg_5000,msg_10000,vc_30,vc_60,vc_500,vc_1000,vc_5000,react_50,react_250,react_1000,popular_100,popular_500'
      );

      // Grant all achievement roles (highest tier only for each category)
      // Get achievement settings to check which roles are configured
      const settings = await DatabaseHelper.getAchievementSettings(interaction.guild.id);
      
      const rolesToAdd = [];
      const rolesToRemove = [];

      // Message roles - keep only highest
      if (settings && settings.msg_10000_role) {
        rolesToAdd.push(settings.msg_10000_role);
        if (settings.msg_100_role) rolesToRemove.push(settings.msg_100_role);
        if (settings.msg_500_role) rolesToRemove.push(settings.msg_500_role);
        if (settings.msg_1000_role) rolesToRemove.push(settings.msg_1000_role);
        if (settings.msg_5000_role) rolesToRemove.push(settings.msg_5000_role);
      }

      // Voice roles - keep only highest
      if (settings && settings.vc_5000_role) {
        rolesToAdd.push(settings.vc_5000_role);
        if (settings.vc_30_role) rolesToRemove.push(settings.vc_30_role);
        if (settings.vc_60_role) rolesToRemove.push(settings.vc_60_role);
        if (settings.vc_500_role) rolesToRemove.push(settings.vc_500_role);
        if (settings.vc_1000_role) rolesToRemove.push(settings.vc_1000_role);
      }

      // Reaction roles - keep only highest
      if (settings && settings.react_1000_role) {
        rolesToAdd.push(settings.react_1000_role);
        if (settings.react_50_role) rolesToRemove.push(settings.react_50_role);
        if (settings.react_250_role) rolesToRemove.push(settings.react_250_role);
      }

      // Popularity roles - keep only highest
      if (settings && settings.popular_500_role) {
        rolesToAdd.push(settings.popular_500_role);
        if (settings.popular_100_role) rolesToRemove.push(settings.popular_100_role);
      }

      // Remove lower tier roles
      for (const roleId of rolesToRemove) {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
        }
      }

      // Add top tier roles
      let addedRoles = 0;
      for (const roleId of rolesToAdd) {
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(roleId);
          addedRoles++;
        }
      }

      await interaction.editReply({
        content: `✅ **All achievements granted to ${targetUser}!**\n\n` +
                 `📊 **Stats set to:**\n` +
                 `• Messages: ${maxMessages.toLocaleString()}\n` +
                 `• Voice Time: ${maxVoiceMinutes.toLocaleString()} minutes\n` +
                 `• Reactions Given: ${maxReactionsGiven.toLocaleString()}\n` +
                 `• Reactions Received: ${maxReactionsReceived.toLocaleString()}\n\n` +
                 `🏆 **${addedRoles} role(s) granted**\n` +
                 `✨ All 15 achievements unlocked!`
      });

    } catch (error) {
      console.error('Error granting achievements:', error);
      await interaction.editReply({
        content: '❌ Failed to grant achievements. Please try again.'
      });
    }
  }
};

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fullsetup')
    .setDescription('Complete server setup - creates all roles and channels for Oblivion Bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Instant reply to avoid timeout
    await interaction.reply({ content: '🔧 Starting full server setup... This may take a moment.', flags: 64 });

    try {
      const guild = interaction.guild;
      const createdRoles = [];
      const createdChannels = [];
      const errors = [];

      // Get bot's highest role position for hierarchy
      const botMember = await guild.members.fetch(guild.members.me.id);
      const botHighestRole = botMember.roles.highest;
      let currentPosition = botHighestRole.position - 1; // Start below bot's role

      // ===== STEP 1: Create Staff Roles (with proper hierarchy) =====
      let ownerRole, adminRole, modRole;

      try {
        // Owner Role - All permissions (highest staff role)
        ownerRole = await guild.roles.create({
          name: '👑 Owner',
          color: 0xFF0000, // Red
          permissions: [
            PermissionFlagsBits.Administrator
          ],
          position: currentPosition--,
          hoist: true,
          mentionable: false,
          reason: 'Oblivion Bot Full Setup'
        });
        createdRoles.push(ownerRole.name);

        // Admin Role - Most permissions except some dangerous ones
        adminRole = await guild.roles.create({
          name: '⚡ Admin',
          color: 0xFFA500, // Orange
          permissions: [
            PermissionFlagsBits.ManageGuild,
            PermissionFlagsBits.ManageRoles,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.KickMembers,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.ManageThreads,
            PermissionFlagsBits.ModerateMembers,
            PermissionFlagsBits.ViewAuditLog,
            PermissionFlagsBits.ManageWebhooks,
            PermissionFlagsBits.ManageEmojisAndStickers,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageNicknames,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.DeafenMembers
          ],
          position: currentPosition--,
          hoist: true,
          mentionable: true,
          reason: 'Oblivion Bot Full Setup'
        });
        createdRoles.push(adminRole.name);

        // Moderator Role - Basic moderation permissions
        modRole = await guild.roles.create({
          name: '🛡️ Moderator',
          color: 0x00FF00, // Green
          permissions: [
            PermissionFlagsBits.KickMembers,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.ManageThreads,
            PermissionFlagsBits.ModerateMembers,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.DeafenMembers
          ],
          position: currentPosition--,
          hoist: true,
          mentionable: true,
          reason: 'Oblivion Bot Full Setup'
        });
        createdRoles.push(modRole.name);
      } catch (error) {
        errors.push(`Failed to create staff roles: ${error.message}`);
      }

      // ===== STEP 2: Create Achievement Roles (ordered by tier) =====
      const achievementRoles = {};
      
      try {
        // Diamond tier (highest)
        achievementRoles.msg_10000_role = await guild.roles.create({
          name: '💎 Legendary Chatter',
          color: 0x00FFFF,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 10K Messages'
        });
        createdRoles.push(achievementRoles.msg_10000_role.name);

        achievementRoles.vc_5000_role = await guild.roles.create({
          name: '🎧 Voice Legend',
          color: 0x00FFFF,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 5000min Voice'
        });
        createdRoles.push(achievementRoles.vc_5000_role.name);

        // Gold tier
        achievementRoles.msg_5000_role = await guild.roles.create({
          name: '📮 Elite Chatter',
          color: 0xFFD700,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 5K Messages'
        });
        createdRoles.push(achievementRoles.msg_5000_role.name);

        achievementRoles.vc_1000_role = await guild.roles.create({
          name: '📻 Voice Expert',
          color: 0xFFD700,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 1000min Voice'
        });
        createdRoles.push(achievementRoles.vc_1000_role.name);

        achievementRoles.react_1000_role = await guild.roles.create({
          name: '🌟 Mega Reactor',
          color: 0xFFD700,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 1000 Reactions Given'
        });
        createdRoles.push(achievementRoles.react_1000_role.name);

        achievementRoles.popular_500_role = await guild.roles.create({
          name: '🌠 Superstar',
          color: 0xFFD700,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 500 Reactions Received'
        });
        createdRoles.push(achievementRoles.popular_500_role.name);

        // Silver tier
        achievementRoles.msg_1000_role = await guild.roles.create({
          name: '📬 Dedicated Chatter',
          color: 0xC0C0C0,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 1K Messages'
        });
        createdRoles.push(achievementRoles.msg_1000_role.name);

        achievementRoles.vc_500_role = await guild.roles.create({
          name: '🔊 Voice Enthusiast',
          color: 0xC0C0C0,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 500min Voice'
        });
        createdRoles.push(achievementRoles.vc_500_role.name);

        achievementRoles.react_250_role = await guild.roles.create({
          name: '⭐ Super Reactor',
          color: 0xC0C0C0,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 250 Reactions Given'
        });
        createdRoles.push(achievementRoles.react_250_role.name);

        achievementRoles.popular_100_role = await guild.roles.create({
          name: '✨ Rising Star',
          color: 0xC0C0C0,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 100 Reactions Received'
        });
        createdRoles.push(achievementRoles.popular_100_role.name);

        // Bronze tier
        achievementRoles.msg_500_role = await guild.roles.create({
          name: '📨 Active Chatter',
          color: 0xCD7F32,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 500 Messages'
        });
        createdRoles.push(achievementRoles.msg_500_role.name);

        achievementRoles.vc_60_role = await guild.roles.create({
          name: '🎤 Voice Active',
          color: 0xCD7F32,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 60min Voice'
        });
        createdRoles.push(achievementRoles.vc_60_role.name);

        achievementRoles.react_50_role = await guild.roles.create({
          name: '👍 Reactor',
          color: 0xCD7F32,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 50 Reactions Given'
        });
        createdRoles.push(achievementRoles.react_50_role.name);

        // Gray tier (lowest)
        achievementRoles.msg_100_role = await guild.roles.create({
          name: '💬 Newbie Chatter',
          color: 0x95a5a6,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 100 Messages'
        });
        createdRoles.push(achievementRoles.msg_100_role.name);

        achievementRoles.vc_30_role = await guild.roles.create({
          name: '🎙️ Voice Beginner',
          color: 0x95a5a6,
          position: currentPosition--,
          reason: 'Oblivion Bot Full Setup - 30min Voice'
        });
        createdRoles.push(achievementRoles.vc_30_role.name);

        // Save achievement role IDs to database
        await DatabaseHelper.setAchievementSettings(
          guild.id,
          achievementRoles.msg_100_role.id,
          achievementRoles.msg_500_role.id,
          achievementRoles.msg_1000_role.id,
          achievementRoles.msg_5000_role.id,
          achievementRoles.msg_10000_role.id,
          achievementRoles.vc_30_role.id,
          achievementRoles.vc_60_role.id,
          achievementRoles.vc_500_role.id,
          achievementRoles.vc_1000_role.id,
          achievementRoles.vc_5000_role.id,
          achievementRoles.react_50_role.id,
          achievementRoles.react_250_role.id,
          achievementRoles.react_1000_role.id,
          achievementRoles.popular_100_role.id,
          achievementRoles.popular_500_role.id
        );
      } catch (error) {
        errors.push(`Failed to create achievement roles: ${error.message}`);
      }

      // ===== STEP 3: Create Log Channels =====
      let modLogChannel, oblivionLogChannel;

      try {
        // Create a category for logs
        const logCategory = await guild.channels.create({
          name: '📋 Logs',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: guild.id, // @everyone
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: guild.members.me.id, // Bot
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            }
          ],
          reason: 'Oblivion Bot Full Setup'
        });

        // Add permissions for staff roles if they exist
        if (modRole) {
          await logCategory.permissionOverwrites.create(modRole, {
            ViewChannel: true,
            SendMessages: false,
            ReadMessageHistory: true
          });
        }
        if (adminRole) {
          await logCategory.permissionOverwrites.create(adminRole, {
            ViewChannel: true,
            SendMessages: false,
            ReadMessageHistory: true
          });
        }
        if (ownerRole) {
          await logCategory.permissionOverwrites.create(ownerRole, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageChannels: true
          });
        }

        // Mod Log Channel
        modLogChannel = await guild.channels.create({
          name: '🔨-mod-logs',
          type: ChannelType.GuildText,
          parent: logCategory.id,
          topic: 'Moderation actions (bans, kicks, mutes, warns)',
          reason: 'Oblivion Bot Full Setup'
        });
        createdChannels.push(modLogChannel.name);

        // Oblivion Log Channel (comprehensive server logs)
        oblivionLogChannel = await guild.channels.create({
          name: '📝-server-logs',
          type: ChannelType.GuildText,
          parent: logCategory.id,
          topic: 'All server events (messages, joins, leaves, role changes)',
          reason: 'Oblivion Bot Full Setup'
        });
        createdChannels.push(oblivionLogChannel.name);

        // Save channel IDs to database
        await DatabaseHelper.updateModLogChannel(guild.id, modLogChannel.id);
        await DatabaseHelper.updateOblivionLogChannel(guild.id, oblivionLogChannel.id);

      } catch (error) {
        errors.push(`Failed to create log channels: ${error.message}`);
      }

      // ===== STEP 4: Initialize Guild Settings =====
      try {
        // Ensure guild settings exist with default values
        const settings = await DatabaseHelper.getGuildSettings(guild.id);
        if (!settings) {
          await DatabaseHelper.setGuildSettings(
            guild.id,
            '!',
            modLogChannel?.id || null,
            null,
            0, 0, 0,
            '[]'
          );
          if (oblivionLogChannel) {
            await DatabaseHelper.updateOblivionLogChannel(guild.id, oblivionLogChannel.id);
          }
        }
        
        // Enable level-up and achievement messages by default
        await DatabaseHelper.updateLevelUpMessages(guild.id, 1);
        await DatabaseHelper.updateAchievementMessages(guild.id, 1);
      } catch (error) {
        errors.push(`Failed to initialize guild settings: ${error.message}`);
      }

      // ===== Send Summary =====
      const summary = [];
      summary.push('✅ **Full Server Setup Complete!**\n');

      if (createdRoles.length > 0) {
        summary.push(`**🎭 Created ${createdRoles.length} Roles:**`);
        summary.push('**Staff Roles:**');
        if (ownerRole) summary.push(`• ${ownerRole} - Full admin access`);
        if (adminRole) summary.push(`• ${adminRole} - Manage server & moderation`);
        if (modRole) summary.push(`• ${modRole} - Basic moderation powers`);
        summary.push('\n**Achievement Roles:**');
        summary.push('• 15 achievement roles for messages, voice, reactions, and popularity');
      }

      if (createdChannels.length > 0) {
        summary.push(`\n**📁 Created ${createdChannels.length} Channels:**`);
        summary.push('• 📋 Logs category (hidden from everyone)');
        if (modLogChannel) summary.push(`• ${modLogChannel} - Moderation action logs`);
        if (oblivionLogChannel) summary.push(`• ${oblivionLogChannel} - Server event logs`);
      }

      summary.push('\n**⚙️ Settings:**');
      summary.push('• Level-up messages: ✅ Enabled');
      summary.push('• Achievement messages: ✅ Enabled');
      summary.push('• All achievement roles saved to database');

      if (errors.length > 0) {
        summary.push(`\n**⚠️ Errors (${errors.length}):**`);
        errors.forEach(err => summary.push(`• ${err}`));
      }

      summary.push('\n**💡 Next Steps:**');
      summary.push('• Assign staff roles to your team members');
      summary.push('• Configure additional settings via `/settings` or the dashboard');
      summary.push('• Users will automatically earn achievement roles as they participate!');

      await interaction.editReply({ content: summary.join('\n') });

    } catch (error) {
      console.error('Error in fullsetup command:', error);
      await interaction.editReply({ 
        content: `❌ Setup failed: ${error.message}\n\nPlease check bot permissions and try again.` 
      });
    }
  }
};

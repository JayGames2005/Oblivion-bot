const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achsetup')
    .setDescription('Automatically create and configure achievement roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    try {
      const guild = interaction.guild;

      // Create achievement roles
      const rolesToCreate = [
        // Message achievements
        { name: '💬 Newbie Chatter', color: 0x95a5a6, position: 'msg_100' },      // Gray - 100 messages
        { name: '📨 Active Chatter', color: 0xCD7F32, position: 'msg_500' },      // Bronze - 500 messages
        { name: '📬 Dedicated Chatter', color: 0xC0C0C0, position: 'msg_1000' },  // Silver - 1000 messages
        { name: '📮 Elite Chatter', color: 0xFFD700, position: 'msg_5000' },      // Gold - 5000 messages
        { name: '💎 Legendary Chatter', color: 0x00FFFF, position: 'msg_10000' }, // Diamond - 10000 messages
        
        // Voice achievements
        { name: '🎙️ Voice Newbie', color: 0x95a5a6, position: 'vc_30' },        // Gray - 30 min
        { name: '🎤 Voice Regular', color: 0xCD7F32, position: 'vc_60' },        // Bronze - 60 min
        { name: '🔊 Voice Enthusiast', color: 0xC0C0C0, position: 'vc_500' },    // Silver - 500 min
        { name: '📢 Voice Expert', color: 0xFFD700, position: 'vc_1000' },       // Gold - 1000 min
        { name: '🎵 Voice Legend', color: 0x00FFFF, position: 'vc_5000' },       // Diamond - 5000 min
        
        // Reaction achievements (giving reactions)
        { name: '👍 Reactor', color: 0xCD7F32, position: 'react_50' },           // Bronze - 50 reactions
        { name: '⭐ Super Reactor', color: 0xC0C0C0, position: 'react_250' },    // Silver - 250 reactions
        { name: '🌟 Mega Reactor', color: 0xFFD700, position: 'react_1000' },   // Gold - 1000 reactions
        
        // Popularity achievements (receiving reactions)
        { name: '✨ Rising Star', color: 0xC0C0C0, position: 'popular_100' },    // Silver - 100 reactions received
        { name: '🌠 Superstar', color: 0xFFD700, position: 'popular_500' }       // Gold - 500 reactions received
      ];

      const createdRoles = {};
      let statusMessage = '**Creating Achievement Roles...**\n\n';

      for (const roleData of rolesToCreate) {
        try {
          // Check if role already exists
          let role = guild.roles.cache.find(r => r.name === roleData.name);
          
          if (!role) {
            role = await guild.roles.create({
              name: roleData.name,
              color: roleData.color,
              permissions: [], // No permissions - blank role
              reason: 'Achievement system setup',
              mentionable: false,
              hoist: false
            });
            statusMessage += `✅ Created: **${roleData.name}**\n`;
          } else {
            statusMessage += `ℹ️ Already exists: **${roleData.name}**\n`;
          }

          createdRoles[roleData.position] = role.id;
        } catch (error) {
          statusMessage += `❌ Failed to create: **${roleData.name}**\n`;
          console.error(`Error creating role ${roleData.name}:`, error);
        }
      }

      // Save to database
      try {
        await DatabaseHelper.setAchievementSettings(
          guild.id,
          createdRoles.msg_100 || null,
          createdRoles.msg_500 || null,
          createdRoles.msg_1000 || null,
          createdRoles.msg_5000 || null,
          createdRoles.msg_10000 || null,
          createdRoles.vc_30 || null,
          createdRoles.vc_60 || null,
          createdRoles.vc_500 || null,
          createdRoles.vc_1000 || null,
          createdRoles.vc_5000 || null,
          createdRoles.react_50 || null,
          createdRoles.react_250 || null,
          createdRoles.react_1000 || null,
          createdRoles.popular_100 || null,
          createdRoles.popular_500 || null
        );
        statusMessage += '\n✅ **Achievement settings saved to database!**';
      } catch (error) {
        statusMessage += '\n❌ **Failed to save settings to database**';
        console.error('Error saving achievement settings:', error);
      }

      const embed = new EmbedBuilder()
        .setColor(0x667eea)
        .setTitle('🏆 Achievement Setup Complete')
        .setDescription(statusMessage)
        .addFields({
          name: '📋 Next Steps',
          value: 'Your achievement roles are now configured! Users will automatically receive these roles as they:\n\n' +
                 '**Messages:** 100, 500, 1K, 5K, 10K\n' +
                 '**Voice Time:** 30min, 1hr, 8hrs, 16hrs, 83hrs\n' +
                 '**Reactions Given:** 50, 250, 1K\n' +
                 '**Reactions Received:** 100, 500\n\n' +
                 'Use `/achievements` to view progress!',
          inline: false
        })
        .setFooter({ text: 'You can customize these roles in your server settings or dashboard' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in achsetup command:', error);
      await interaction.editReply({
        content: '❌ An error occurred while setting up achievements. Please ensure the bot has "Manage Roles" permission.'
      });
    }
  }
};

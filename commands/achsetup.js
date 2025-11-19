const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achsetup')
    .setDescription('Automatically create and configure achievement roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guild = interaction.guild;

      // Create achievement roles
      const rolesToCreate = [
        { name: '📨 Chatterbox I', color: 0xCD7F32, position: 'msg_500' },      // Bronze
        { name: '📬 Chatterbox II', color: 0xC0C0C0, position: 'msg_1000' },    // Silver
        { name: '📮 Chatterbox III', color: 0xFFD700, position: 'msg_2000' },   // Gold
        { name: '🎙️ Voice Regular I', color: 0xCD7F32, position: 'vc_60' },    // Bronze
        { name: '🎤 Voice Regular II', color: 0xFFD700, position: 'vc_2000' }   // Gold
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
          createdRoles.msg_500 || null,
          createdRoles.msg_1000 || null,
          createdRoles.msg_2000 || null,
          createdRoles.vc_60 || null,
          createdRoles.vc_2000 || null
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
                 '• Send 500, 1000, or 2000 messages\n' +
                 '• Spend 60 or 2000 minutes in voice channels\n\n' +
                 'Use `/achievements` to view progress and `@role` to mention achievement holders!',
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

const { Events } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isButton()) return;

    // Handle giveaway entries
    if (interaction.customId.startsWith('giveaway_enter_')) {
      // Reply instantly to avoid timeout
      await interaction.reply({
        content: '⏳ Checking eligibility...',
        flags: 64
      });

      const minRole = interaction.customId.split('_')[2];
      
      // Check if user has required role (if any)
      if (minRole !== 'none') {
        // Get achievement settings to find the role ID
        const settings = await DatabaseHelper.getAchievementSettings(interaction.guild.id);
        const roleId = settings?.[`${minRole}_role`];
        
        if (!roleId) {
          return interaction.editReply({
            content: '❌ This giveaway requires a role that hasn\'t been set up yet!'
          });
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);
        
        if (!member.roles.cache.has(roleId)) {
          const roleNames = {
            'msg_100': 'Newbie Chatter (100 messages)',
            'msg_500': 'Active Chatter (500 messages)',
            'msg_1000': 'Dedicated Chatter (1K messages)',
            'msg_5000': 'Elite Chatter (5K messages)',
            'msg_10000': 'Legendary Chatter (10K messages)'
          };
          
          return interaction.editReply({
            content: `❌ You need the **${roleNames[minRole]}** role to enter this giveaway!`
          });
        }
      }

      // Get giveaway data
      const giveaway = interaction.client.giveaways?.get(interaction.message.id);
      
      if (!giveaway) {
        return interaction.editReply({
          content: '❌ This giveaway is no longer active!'
        });
      }

      // Check if already entered
      if (giveaway.entries.includes(interaction.user.id)) {
        return interaction.editReply({
          content: '❌ You have already entered this giveaway!'
        });
      }

      // Add entry
      giveaway.entries.push(interaction.user.id);

      await interaction.editReply({
        content: `✅ You have been entered into the giveaway! Good luck! 🍀`
      });
    }
  }
};

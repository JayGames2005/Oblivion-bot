const { Events } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isButton()) return;

    // Handle giveaway entries
    if (interaction.customId.startsWith('giveaway_enter_')) {
      const minRole = interaction.customId.split('_')[2];
      
      // Check if user has required role (if any)
      if (minRole !== 'none') {
        // Hard-coded role names - you set these up with /achsetup
        const roleNames = {
          'msg_100': 'Newbie Chatter',
          'msg_500': 'Active Chatter',
          'msg_1000': 'Dedicated Chatter',
          'msg_5000': 'Elite Chatter',
          'msg_10000': 'Legendary Chatter'
        };

        const member = interaction.member;
        const hasRole = member.roles.cache.some(role => 
          role.name === roleNames[minRole] || 
          role.name.includes(roleNames[minRole])
        );
        
        if (!hasRole) {
          return interaction.reply({
            content: `❌ You need the **${roleNames[minRole]}** role to enter this giveaway!`,
            flags: 64
          });
        }
      }

      // Get giveaway data
      const giveaway = interaction.client.giveaways?.get(interaction.message.id);
      
      if (!giveaway) {
        return interaction.reply({
          content: '❌ This giveaway is no longer active!',
          flags: 64
        });
      }

      // Check if already entered
      if (giveaway.entries.includes(interaction.user.id)) {
        return interaction.reply({
          content: '❌ You have already entered this giveaway!',
          flags: 64
        });
      }

      // Add entry
      giveaway.entries.push(interaction.user.id);

      await interaction.reply({
        content: `✅ You have been entered into the giveaway! Good luck! 🍀`,
        flags: 64
      });
    }
  }
};

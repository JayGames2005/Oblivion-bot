const { Events } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isButton()) return;

    // Handle giveaway entries
    if (interaction.customId === 'giveaway_enter') {
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

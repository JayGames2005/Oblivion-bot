const { Events } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isButton()) return;

    // Handle giveaway entries
    if (interaction.customId.startsWith('giveaway_enter_')) {
      const minLevel = parseInt(interaction.customId.split('_')[2]);
      
      // Get user's XP data
      const userData = await DatabaseHelper.getUserXP(interaction.guild.id, interaction.user.id);
      const userXP = userData?.xp || 0;
      const userLevel = Math.floor(0.1 * Math.sqrt(userXP));

      // Check if user meets minimum level requirement
      if (userLevel < minLevel) {
        return interaction.reply({
          content: `❌ You need to be at least **Level ${minLevel}** to enter this giveaway! You are currently **Level ${userLevel}**.`,
          flags: 64 // ephemeral
        });
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
        content: `✅ You have been entered into the giveaway! Good luck! 🍀\n**Your Level:** ${userLevel}`,
        flags: 64
      });
    }
  }
};

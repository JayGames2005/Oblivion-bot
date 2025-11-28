const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create_ai_optin_table')
    .setDescription('Creates the ai_daily_optin table in the database (admin only).'),
  async execute(interaction, db) {
    // Only allow the bot owner or admins to run this
    if (!interaction.memberPermissions.has('Administrator')) {
      return interaction.reply({ content: 'You must be an admin to use this command.', ephemeral: true });
    }
    try {
      await db.pool.query(`
        CREATE TABLE IF NOT EXISTS ai_daily_optin (
          id SERIAL PRIMARY KEY,
          guild_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          UNIQUE(guild_id, user_id)
        );
      `);
      await interaction.reply({ content: 'ai_daily_optin table created (or already exists).', ephemeral: true });
    } catch (err) {
      console.error('Error creating ai_daily_optin table:', err);
      await interaction.reply({ content: 'Failed to create table: ' + err.message, ephemeral: true });
    }
  },
};

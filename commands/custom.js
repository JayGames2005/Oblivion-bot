const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('custom')
    .setDescription('Manage custom commands')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a custom command')
        .addStringOption(opt =>
          opt.setName('trigger').setDescription('Command trigger').setRequired(true))
        .addStringOption(opt =>
          opt.setName('response').setDescription('Command response').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a custom command')
        .addStringOption(opt =>
          opt.setName('trigger').setDescription('Command trigger').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all custom commands'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'add') {
      const trigger = interaction.options.getString('trigger').toLowerCase();
      const response = interaction.options.getString('response');
      await DatabaseHelper.addCustomCommand(guildId, trigger, response);
      await interaction.editReply({ content: `✅ Custom command \\${trigger} added!` });
    } else if (sub === 'remove') {
      const trigger = interaction.options.getString('trigger').toLowerCase();
      await DatabaseHelper.removeCustomCommand(guildId, trigger);
      await interaction.editReply({ content: `🗑️ Custom command \\${trigger} removed.` });
    } else if (sub === 'list') {
      const commands = await DatabaseHelper.getCustomCommands(guildId);
      if (!commands || commands.length === 0) {
        await interaction.editReply({ content: 'No custom commands set.' });
      } else {
        await interaction.editReply({ content: 'Custom commands:\n' + commands.map(c => `\\${c.trigger}`).join(', ') });
      }
    }
  }
};

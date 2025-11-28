const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
  .setName('oblivionboard')
  .setDescription('Configure the oblivionboard (starboard)')
    .addSubcommand(sub =>
      sub.setName('set')
  .setDescription('Set the oblivionboard channel, emoji, and threshold')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Oblivionboard channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addStringOption(opt =>
          opt.setName('emoji').setDescription('Emoji to track (default 👍)').setRequired(false))
        .addIntegerOption(opt =>
          opt.setName('threshold').setDescription('Number of reactions required (default 5)').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('view')
  .setDescription('View current oblivionboard settings'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel');
      const emoji = interaction.options.getString('emoji') || '👍';
      const threshold = interaction.options.getInteger('threshold') || 5;
  await DatabaseHelper.setSlugboardSettings(guildId, channel.id, emoji, threshold);
  await interaction.editReply({ content: `✅ Oblivionboard set to <#${channel.id}> with emoji ${emoji} and threshold ${threshold}` });
    } else if (sub === 'view') {
  const settings = await DatabaseHelper.getSlugboardSettings(guildId);
      if (!settings) {
  await interaction.editReply({ content: 'Oblivionboard is not configured.' });
      } else {
  await interaction.editReply({ content: `Oblivionboard channel: <#${settings.channel_id}>\nEmoji: ${settings.emoji}\nThreshold: ${settings.threshold}` });
      }
    }
  }
};

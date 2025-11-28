const { SlashCommandBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Set or view your birthday')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set your birthday (MM-DD)')
        .addStringOption(opt =>
          opt.setName('date').setDescription('Birthday in MM-DD format').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View your saved birthday'))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove your birthday'))
    .addSubcommand(sub =>
      sub.setName('next')
        .setDescription('List the next 10 birthdays in the server')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'set') {
      const date = interaction.options.getString('date');
      if (!/^\d{2}-\d{2}$/.test(date)) {
        await interaction.editReply({ content: '❌ Please use MM-DD format.' });
        return;
      }
      await DatabaseHelper.setBirthday(guildId, userId, date);
      await interaction.editReply({ content: `🎂 Birthday set to ${date}!` });
    } else if (sub === 'view') {
      const bday = await DatabaseHelper.getBirthday(guildId, userId);
      if (!bday) {
        await interaction.editReply({ content: 'No birthday set.' });
      } else {
        await interaction.editReply({ content: `Your birthday: ${bday}` });
      }
    } else if (sub === 'remove') {
      await DatabaseHelper.removeBirthday(guildId, userId);
      await interaction.editReply({ content: '🗑️ Your birthday has been removed.' });
    } else if (sub === 'next') {
      const nextBirthdays = await DatabaseHelper.getNextBirthdays(guildId, 10);
      if (!nextBirthdays || nextBirthdays.length === 0) {
        await interaction.editReply({ content: 'No birthdays found.' });
      } else {
        const lines = nextBirthdays.map(b => `<@${b.user_id}> — ${b.date}`);
        await interaction.editReply({ content: 'Next birthdays:\n' + lines.join('\n') });
      }
    }
  }
};

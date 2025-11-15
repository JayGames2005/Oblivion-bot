const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Get the link to the Oblivion dashboard'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🌐 Oblivion Dashboard')
      .setDescription('Access the web dashboard to manage your server settings!')
      .addFields({
        name: 'Dashboard URL',
        value: '[Click here to open dashboard](https://oblivion-bot-production-913e.up.railway.app/)',
        inline: false
      })
      .setFooter({ text: 'Login with your Discord account to manage settings' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

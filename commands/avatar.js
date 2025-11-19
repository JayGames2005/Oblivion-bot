const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get a user\'s avatar')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to get the avatar of')
        .setRequired(false))
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Avatar`)
      .setColor(member?.displayHexColor || '#5865F2')
      .setImage(user.displayAvatarURL({ size: 4096, extension: 'png' }))
      .setDescription(
        `[PNG](${user.displayAvatarURL({ size: 4096, extension: 'png' })}) | ` +
        `[JPG](${user.displayAvatarURL({ size: 4096, extension: 'jpg' })}) | ` +
        `[WEBP](${user.displayAvatarURL({ size: 4096, extension: 'webp' })})`
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};

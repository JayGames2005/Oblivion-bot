const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removecase')
    .setDescription('Remove a case from the database')
    .addIntegerOption(option =>
      option
        .setName('case_id')
        .setDescription('The case ID to remove')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    
    const caseId = interaction.options.getInteger('case_id');

    // Check if case exists
    const existingCase = await DatabaseHelper.getCase(interaction.guildId, caseId);
    
    if (!existingCase) {
      return interaction.editReply({
        content: `❌ Case #${caseId} not found.`,
        flags: ['Ephemeral']
      });
    }

    // Delete the case
    await DatabaseHelper.deleteCase(interaction.guildId, caseId);

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🗑️ Case Removed')
      .setDescription(`Case #${caseId} has been removed from the database.`)
      .addFields(
        { name: 'Type', value: existingCase.type, inline: true },
        { name: 'User', value: `<@${existingCase.userId}>`, inline: true },
        { name: 'Moderator', value: `<@${existingCase.moderatorId}>`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Removed by ${interaction.user.tag}` });

    await interaction.editReply({ embeds: [embed] });
  }
};

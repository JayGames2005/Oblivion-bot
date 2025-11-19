const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('The poll question')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('option1')
        .setDescription('First option')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('option2')
        .setDescription('Second option')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('option3')
        .setDescription('Third option')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('option4')
        .setDescription('Fourth option')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('option5')
        .setDescription('Fifth option')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Poll duration in minutes (default: no limit)')
        .setMinValue(1)
        .setMaxValue(10080)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply();

    const question = interaction.options.getString('question');
    const duration = interaction.options.getInteger('duration');
    
    // Collect options
    const options = [];
    for (let i = 1; i <= 5; i++) {
      const option = interaction.options.getString(`option${i}`);
      if (option) options.push(option);
    }

    // Emoji numbers for reactions
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

    // Build poll embed
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${question}`)
      .setColor('#5865F2')
      .setDescription(
        options.map((opt, i) => `${emojis[i]} ${opt}`).join('\n\n')
      )
      .setFooter({ 
        text: duration 
          ? `Poll ends in ${duration} minute${duration !== 1 ? 's' : ''} • Created by ${interaction.user.tag}`
          : `Created by ${interaction.user.tag}`
      })
      .setTimestamp();

    // Send poll
    const pollMessage = await interaction.editReply({ embeds: [embed] });

    // Add reactions
    for (let i = 0; i < options.length; i++) {
      await pollMessage.react(emojis[i]);
    }

    // Auto-end poll if duration is set
    if (duration) {
      setTimeout(async () => {
        try {
          const updatedMessage = await pollMessage.fetch();
          const results = [];
          
          for (let i = 0; i < options.length; i++) {
            const reaction = updatedMessage.reactions.cache.get(emojis[i]);
            const count = reaction ? reaction.count - 1 : 0; // -1 for bot's reaction
            results.push({ option: options[i], votes: count });
          }

          // Sort by votes
          results.sort((a, b) => b.votes - a.votes);
          const winner = results[0];

          const resultsEmbed = new EmbedBuilder()
            .setTitle(`📊 ${question}`)
            .setColor('#43B581')
            .setDescription('**Poll Results:**\n\n' + 
              results.map((r, i) => 
                `${emojis[i]} ${r.option}: **${r.votes}** vote${r.votes !== 1 ? 's' : ''}`
              ).join('\n')
            )
            .addFields({
              name: '🏆 Winner',
              value: `${winner.option} with ${winner.votes} vote${winner.votes !== 1 ? 's' : ''}!`
            })
            .setFooter({ text: `Poll ended • Created by ${interaction.user.tag}` })
            .setTimestamp();

          await updatedMessage.edit({ embeds: [resultsEmbed] });
        } catch (error) {
          console.error('Error ending poll:', error);
        }
      }, duration * 60 * 1000);
    }
  }
};

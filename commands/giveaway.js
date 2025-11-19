const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption(option =>
          option.setName('prize')
            .setDescription('What are you giving away?')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('duration')
            .setDescription('Duration in minutes')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('winners')
            .setDescription('Number of winners')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('End a giveaway early')
        .addStringOption(option =>
          option.setName('message_id')
            .setDescription('The giveaway message ID')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reroll')
        .setDescription('Reroll a giveaway winner')
        .addStringOption(option =>
          option.setName('message_id')
            .setDescription('The giveaway message ID')
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'start') {
      const prize = interaction.options.getString('prize');
      const duration = interaction.options.getInteger('duration');
      const winners = interaction.options.getInteger('winners');

      const endTime = Date.now() + (duration * 60 * 1000);
      const endTimestamp = Math.floor(endTime / 1000);

      const embed = new EmbedBuilder()
        .setTitle('🎉 GIVEAWAY 🎉')
        .setDescription(
          `**Prize:** ${prize}\n` +
          `**Winners:** ${winners}\n` +
          `**Ends:** <t:${endTimestamp}:R> (<t:${endTimestamp}:F>)\n\n` +
          `Click the button below to enter!`
        )
        .setColor('#FF69B4')
        .setFooter({ text: `${winners} winner(s) | Ends at` })
        .setTimestamp(endTime);

      const button = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('giveaway_enter')
            .setLabel('🎉 Enter Giveaway')
            .setStyle(ButtonStyle.Primary)
        );

      const message = await interaction.reply({
        embeds: [embed],
        components: [button],
        fetchReply: true
      });

      // Store giveaway data
      const giveawayData = {
        messageId: message.id,
        channelId: interaction.channel.id,
        guildId: interaction.guild.id,
        prize,
        winners,
        endTime,
        hostId: interaction.user.id,
        entries: []
      };

      // Schedule giveaway end
      setTimeout(async () => {
        await endGiveaway(interaction.client, giveawayData);
      }, duration * 60 * 1000);

      // Store in memory (you could also store in database)
      if (!interaction.client.giveaways) {
        interaction.client.giveaways = new Map();
      }
      interaction.client.giveaways.set(message.id, giveawayData);

    } else if (subcommand === 'end') {
      const messageId = interaction.options.getString('message_id');
      const giveaway = interaction.client.giveaways?.get(messageId);

      if (!giveaway) {
        return interaction.reply({
          content: '❌ Giveaway not found or already ended!',
          flags: 64
        });
      }

      await endGiveaway(interaction.client, giveaway);
      await interaction.reply({
        content: '✅ Giveaway ended!',
        flags: 64
      });

    } else if (subcommand === 'reroll') {
      const messageId = interaction.options.getString('message_id');
      
      try {
        const channel = interaction.channel;
        const message = await channel.messages.fetch(messageId);
        const giveaway = interaction.client.giveaways?.get(messageId);

        if (!giveaway || giveaway.entries.length === 0) {
          return interaction.reply({
            content: '❌ No entries found for this giveaway!',
            flags: 64
          });
        }

        const winner = giveaway.entries[Math.floor(Math.random() * giveaway.entries.length)];
        
        await interaction.reply({
          content: `🎉 New winner: <@${winner}>! Congratulations!`
        });

      } catch (error) {
        console.error('Error rerolling giveaway:', error);
        await interaction.reply({
          content: '❌ Failed to reroll giveaway. Make sure the message ID is correct.',
          flags: 64
        }).catch(() => {});
      }
    }
  }
};

async function endGiveaway(client, giveaway) {
  try {
    const channel = await client.channels.fetch(giveaway.channelId);
    const message = await channel.messages.fetch(giveaway.messageId);

    if (giveaway.entries.length === 0) {
      const noWinnerEmbed = new EmbedBuilder()
        .setTitle('🎉 GIVEAWAY ENDED 🎉')
        .setDescription(
          `**Prize:** ${giveaway.prize}\n\n` +
          `No valid entries! Nobody won.`
        )
        .setColor('#FF0000')
        .setFooter({ text: 'Giveaway ended' })
        .setTimestamp();

      await message.edit({
        embeds: [noWinnerEmbed],
        components: []
      });

      return;
    }

    // Pick random winners
    const winnerCount = Math.min(giveaway.winners, giveaway.entries.length);
    const winners = [];
    const entriesCopy = [...giveaway.entries];

    for (let i = 0; i < winnerCount; i++) {
      const randomIndex = Math.floor(Math.random() * entriesCopy.length);
      winners.push(entriesCopy[randomIndex]);
      entriesCopy.splice(randomIndex, 1);
    }

    const winnerEmbed = new EmbedBuilder()
      .setTitle('🎉 GIVEAWAY ENDED 🎉')
      .setDescription(
        `**Prize:** ${giveaway.prize}\n\n` +
        `**Winner(s):**\n${winners.map(w => `<@${w}>`).join('\n')}`
      )
      .setColor('#00FF00')
      .setFooter({ text: 'Giveaway ended' })
      .setTimestamp();

    await message.edit({
      embeds: [winnerEmbed],
      components: []
    });

    await channel.send({
      content: `🎉 Congratulations ${winners.map(w => `<@${w}>`).join(', ')}! You won **${giveaway.prize}**!`
    });

    // Remove from active giveaways
    if (client.giveaways) {
      client.giveaways.delete(giveaway.messageId);
    }

  } catch (error) {
    console.error('Error ending giveaway:', error);
  }
}

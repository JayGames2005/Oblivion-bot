const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available commands')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('Get detailed help for a specific command')
        .setRequired(false)),

  async execute(interaction) {
    const commandName = interaction.options.getString('command');

    if (commandName) {
      // Show detailed help for specific command
      const command = interaction.client.commands.get(commandName);

      if (!command) {
        return interaction.reply({ 
          content: '❌ Command not found!', 
          ephemeral: true 
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`📖 Help: /${command.data.name}`)
        .setDescription(command.data.description)
        .setColor(0x3498DB)
        .setTimestamp();

      // Add options if they exist
      if (command.data.options && command.data.options.length > 0) {
        const options = command.data.options
          .map(opt => `\`${opt.name}\` - ${opt.description}${opt.required ? ' (Required)' : ''}`)
          .join('\n');
        embed.addFields({ name: 'Options', value: options });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else {
      // Show all commands
      const embed = new EmbedBuilder()
        .setTitle('📚 Oblivion Bot Commands')
        .setDescription('Here are all available commands. Use `/help <command>` for more details.')
        .setColor(0x3498DB)
        .setTimestamp();

      const categories = {
        '👮 Moderation': [
          '`/ban` - Ban a user from the server',
          '`/unban` - Unban a user from the server',
          '`/kick` - Kick a user from the server',
          '`/mute` - Timeout a user (Discord native timeout)',
          '`/unmute` - Remove timeout from a user',
          '`/warn` - Warn a user',
          '`/unwarn` - Remove a warning from a user',
          '`/purge` - Delete multiple messages'
        ],
        '📋 Information': [
          '`/userinfo` - Get information about a user',
          '`/warnings` - View warnings for a user',
          '`/cases` - View moderation cases',
          '`/avatar` - Display user avatar in high resolution'
        ],
        '🎮 Engagement': [
          '`/rank` - View your XP rank and level',
          '`/leaderboard` - View XP leaderboards (weekly/all-time)',
          '`/poll` - Create an interactive poll'
        ],
        '⚙️ Configuration': [
          '`/settings` - Configure bot settings',
          '`/welcome` - Configure welcome messages'
        ],
        '❓ Help': [
          '`/help` - View this help menu'
        ]
      };

      for (const [category, commands] of Object.entries(categories)) {
        embed.addFields({ 
          name: category, 
          value: commands.join('\n'), 
          inline: false 
        });
      }

      embed.addFields({ 
        name: '🌐 Web Dashboard', 
        value: 'Access the web dashboard at: http://localhost:3000', 
        inline: false 
      });

      embed.setFooter({ text: 'Oblivion Moderation Bot' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};

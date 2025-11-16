const { Events, ActivityType, REST, Routes } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`\n🎉 ${client.user.tag} is online!`);
    console.log(`📊 Serving ${client.guilds.cache.size} servers`);
    console.log(`👥 Serving ${client.users.cache.size} users\n`);

    // Set bot status
    client.user.setActivity('for violations', { type: ActivityType.Watching });

    // Register slash commands
    await registerSlashCommands(client);

    // Start mute expiry checker
    startMuteChecker(client);
  }
};

async function registerSlashCommands(client) {
  try {
    const commands = [];
    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) {
      console.log('⚠️ No commands folder found');
      return;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      if (command.data) {
        commands.push(command.data.toJSON());
      }
    }

    const rest = new REST().setToken(config.token);

    console.log(`🔄 Registering ${commands.length} slash commands...`);

    // Register commands globally
    const data = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );

    console.log(`✅ Successfully registered ${data.length} slash commands globally`);
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
  }
}

function startMuteChecker(client) {
  const DatabaseHelper = require('../database-helper');
  const Logger = require('../utils/logger');

  // Check every 30 seconds for expired timeouts
  setInterval(async () => {
    try {
      const now = Date.now();
      const expiredMutes = await DatabaseHelper.getExpiredMutes(now);

      for (const mute of expiredMutes) {
        const guild = client.guilds.cache.get(mute.guild_id);
        if (!guild) continue;

        const member = await guild.members.fetch(mute.user_id).catch(() => null);
        if (!member) {
          await DatabaseHelper.removeMute(mute.guild_id, mute.user_id);
          continue;
        }

        // Discord's native timeout should handle this automatically,
        // but we remove from database for cleanup
        await DatabaseHelper.removeMute(mute.guild_id, mute.user_id);

        console.log(`🔊 Cleaned up expired timeout for ${member.user.tag} in ${guild.name}`);
      }
    } catch (error) {
      console.error('Error checking mute expiry:', error);
    }
  }, 30000);
}

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load config from environment
const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID
};

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
      console.log(`⚠️  Skipping ${file}: missing data or execute`);
    }
  } catch (error) {
    console.log(`❌ Error loading ${file}:`, error.message);
  }
}

const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(`\n🚀 Started refreshing ${commands.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    );

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands globally.\n`);
    
    // List all deployed commands
    console.log('📋 Deployed commands:');
    data.forEach(cmd => console.log(`   • /${cmd.name}`));
    
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();

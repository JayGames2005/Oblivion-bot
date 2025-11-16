const { Client, GatewayIntentBits, Collection, Events, ActivityType } = require('discord.js');
const config = require('./config');
const database = require('./database');
const fs = require('fs');
const path = require('path');

// Main startup function
async function startBot() {
  // Wait for database to be ready
  console.log('⏳ Waiting for database initialization...');
  await database.ready();
  console.log('✅ Database ready');

  // Create Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildModeration
    ]
    });

  // Collections to store commands
  client.commands = new Collection();
  client.cooldowns = new Collection();

  // Load commands from commands folder
  const commandsPath = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
      } else {
        console.log(`⚠️ Command at ${filePath} is missing "data" or "execute" property`);
      }
    }
  }

  // Load events from events folder
  const eventsPath = path.join(__dirname, 'events');
  if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      console.log(`✅ Loaded event: ${event.name}`);
    }
  }

  // Interaction handler (slash commands)
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    // Check cooldowns
    const { cooldowns } = client;

    if (!cooldowns.has(command.data.name)) {
      cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const defaultCooldownDuration = 3;
    const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

    if (timestamps.has(interaction.user.id)) {
      const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

      if (now < expirationTime) {
        const expiredTimestamp = Math.round(expirationTime / 1000);
        return interaction.reply({ 
          content: `⏱️ Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, 
          ephemeral: true 
        });
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      const message = { content: '❌ There was an error executing this command!', ephemeral: true };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(message);
      } else {
        await interaction.reply(message);
      }
    }
  });

  // Error handling
  client.on('error', error => {
    console.error('Discord client error:', error);
  });

  process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
  });

  // Login to Discord
  await client.login(config.token);
  console.log('🤖 Bot logged in successfully');

  // Start dashboard server
  const dashboard = require('./dashboard/server');
  dashboard(client);

  return client;
}

// Start the bot
startBot().catch(err => {
  console.error('❌ Fatal error starting bot:', err);
  process.exit(1);
});

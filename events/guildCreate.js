const { Events } = require('discord.js');
const DatabaseHelper = require('../database-helper');
const config = require('../config');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    console.log(`✅ Joined new guild: ${guild.name} (${guild.id})`);

    // Create default settings for the guild
    try {
      const settings = config.defaultSettings;
      await DatabaseHelper.setGuildSettings(
        guild.id,
        settings.prefix,
        settings.modLogChannel,
        settings.muteRole,
        settings.automod.antiSpam ? 1 : 0,
        settings.automod.antiInvite ? 1 : 0,
        settings.automod.antiLink ? 1 : 0,
        JSON.stringify(settings.automod.bannedWords)
      );
      console.log(`📝 Created default settings for ${guild.name}`);
    } catch (error) {
      console.error('Error creating guild settings:', error);
    }

    // Try to send welcome message to system channel
    if (guild.systemChannel && guild.systemChannel.permissionsFor(guild.members.me).has('SendMessages')) {
      try {
        await guild.systemChannel.send({
          content: `👋 **Thanks for adding me!**\n\n` +
            `I'm a powerful moderation bot with many features.\n\n` +
            `**Getting Started:**\n` +
            `• Use \`/help\` to see all available commands\n` +
            `• Set up a mod log channel with \`/settings modlog #channel\`\n` +
            `• Configure automod with \`/settings automod\`\n\n` +
            `For more info and to access the web dashboard, visit: http://localhost:3000`
        });
      } catch (error) {
        console.error('Could not send welcome message:', error);
      }
    }
  }
};

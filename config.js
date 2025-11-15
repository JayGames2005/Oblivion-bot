require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/auth/callback',
  sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-this',
  port: process.env.PORT || 3000,
  
  // Default guild settings
  defaultSettings: {
    prefix: '!',
    modLogChannel: null,
    muteRole: null,
    automod: {
      antiSpam: false,
      antiInvite: false,
      antiLink: false,
      bannedWords: []
    }
  }
};

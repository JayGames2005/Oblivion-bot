# 🛡️ Oblivion Discord Moderation Bot

A powerful Discord moderation bot with comprehensive features and a web dashboard. Built with Discord.js v14, SQLite, and Express.

## ✨ Features

### 👮 Moderation Commands
- `/ban` - Ban users with optional message deletion
- `/unban` - Unban users by ID
- `/kick` - Kick users from the server
- `/mute` - Temporarily or permanently mute users
- `/unmute` - Unmute users
- `/warn` - Issue warnings to users
- `/unwarn` - Remove specific warnings
- `/warnings` - View all warnings for a user
- `/purge` - Bulk delete messages with optional user filter
- `/userinfo` - Get detailed information about users

### 📋 Case System
- `/cases view` - View specific moderation cases
- `/cases user` - View all cases for a specific user
- `/cases list` - View recent moderation cases
- Automatic case number assignment
- Comprehensive logging of all moderation actions

### 🤖 Auto-Moderation
- **Anti-Spam**: Prevents users from sending too many messages rapidly
- **Anti-Invite**: Blocks Discord invite links
- **Anti-Link**: Blocks all external links
- **Banned Words**: Custom word filtering system
- Automatic message deletion and user warnings

### 🌐 Web Dashboard
- Discord OAuth2 authentication
- Server selection interface
- Real-time statistics (cases, bans, kicks, mutes, warnings)
- Configure mod log channel
- Set up mute role
- Toggle automod features
- View recent moderation cases
- Beautiful, responsive design

### 📊 Advanced Features
- Automatic mute expiration system
- Member join/leave logging
- Message deletion logging
- Role hierarchy checking
- Permission validation
- Cooldown system for commands

## 🚀 Setup

### Prerequisites
- Node.js v16.9.0 or higher
- A Discord bot account
- Discord application with OAuth2 configured

### Installation

1. **Clone or download this repository**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure your bot**
   
   Edit `.env` file with your Discord credentials:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   CLIENT_SECRET=your_client_secret_here
   CALLBACK_URL=http://localhost:3000/auth/callback
   SESSION_SECRET=your_random_secret_here
   PORT=3000
   ```

4. **Set up Discord OAuth2**
   
   In your Discord Application settings (https://discord.com/developers/applications):
   - Go to OAuth2 → General
   - Add redirect URL: `http://localhost:3000/auth/callback`
   - Save changes

5. **Invite the bot to your server**
   
   Use this URL (replace CLIENT_ID with yours):
   ```
   https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=1099511627894&scope=bot%20applications.commands
   ```

6. **Start the bot**
   ```bash
   npm start
   ```

7. **Access the dashboard**
   
   Open your browser to: `http://localhost:3000`

## 📝 Initial Server Setup

After inviting the bot:

1. Use `/settings modlog #channel` to set up moderation logging
2. Create or select a mute role and use `/settings mute-role @role`
3. Configure automod features with `/settings automod`
4. Add banned words with `/settings banned-words add <word>`

## 🔒 Permissions

The bot requires these permissions:
- View Channels
- Send Messages
- Manage Messages
- Embed Links
- Read Message History
- Ban Members
- Kick Members
- Manage Roles
- Moderate Members

## 🛠️ Configuration

Default settings can be modified in `config.js`:
- Default prefix (for future text commands)
- Default automod settings
- Session secrets
- Port configuration

## 📂 Project Structure

```
Oblivion/
├── commands/          # Slash command files
├── events/            # Discord event handlers
├── utils/             # Utility functions
├── views/             # EJS templates for dashboard
├── data/              # SQLite database location
├── config.js          # Bot configuration
├── database.js        # Database setup and queries
├── dashboard.js       # Express web server
├── index.js           # Main bot file
└── package.json       # Dependencies
```

## 🗃️ Database

The bot uses SQLite (better-sqlite3) with the following tables:
- `guild_settings` - Server-specific configuration
- `mod_cases` - Moderation action history
- `warnings` - User warning system
- `mutes` - Active mutes with expiration

Database file is stored in `data/oblivion.db`

## 🔄 Updates

To update the bot:
1. Pull latest changes
2. Run `npm install` to update dependencies
3. Restart the bot

## 🐛 Troubleshooting

**Bot not responding to commands:**
- Ensure the bot is online (check Discord)
- Verify bot has proper permissions
- Check console for error messages

**Dashboard login not working:**
- Verify CLIENT_SECRET is set correctly
- Check OAuth2 redirect URL matches exactly
- Clear browser cookies and try again

**Mute role not working:**
- Ensure bot's role is higher than mute role
- Verify bot has "Manage Roles" permission
- Check mute role is properly configured in channel permissions

## 📜 License

MIT License - Feel free to use and modify!

## 🤝 Support

For issues or questions, check the console logs for error messages. Most issues are related to:
- Missing permissions
- Incorrect role hierarchy
- Configuration errors in .env file

## 🎯 Roadmap

Potential future features:
- Advanced analytics
- Custom command aliases
- Timed bans/kicks
- Raid protection
- Verification system
- Ticket system
- Music commands
- Economy system

---

Made with ❤️ for Discord server moderation

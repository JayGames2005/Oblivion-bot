const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const path = require('path');
const { statements, db } = require('../database');
const config = require('../config');

module.exports = function(client) {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Session
  app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 * 60 * 24 } // 24 hours
  }));

  // Passport
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));

  passport.use(new Strategy({
    clientID: config.clientId,
    clientSecret: config.clientSecret,
    callbackURL: config.callbackURL,
    scope: ['identify', 'guilds']
  }, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Middleware to check authentication
  function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
  }

  // Middleware to attach bot data
  app.use((req, res, next) => {
    res.locals.user = req.user;
    res.locals.client = client;
    next();
  });

  // Routes
  app.get('/', (req, res) => {
    res.render('index');
  });

  app.get('/login', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.render('login');
  });

  app.get('/auth', passport.authenticate('discord'));

  app.get('/auth/callback',
    passport.authenticate('discord', { failureRedirect: '/login' }),
    (req, res) => res.redirect('/dashboard')
  );

  app.get('/logout', (req, res) => {
    req.logout(() => {
      res.redirect('/');
    });
  });

  app.get('/dashboard', checkAuth, (req, res) => {
    // Get user's mutual guilds with the bot
    const userGuilds = req.user.guilds || [];
    const mutualGuilds = userGuilds.filter(guild => {
      const botGuild = client.guilds.cache.get(guild.id);
      // User must have Manage Guild permission
      return botGuild && ((parseInt(guild.permissions) & 0x20) === 0x20);
    });

    res.render('dashboard', { guilds: mutualGuilds });
  });

  app.get('/dashboard/:guildId', checkAuth, async (req, res) => {
    const { guildId } = req.params;

    // Check if user has access to this guild
    const userGuilds = req.user.guilds || [];
    const userGuild = userGuilds.find(g => g.id === guildId);

    if (!userGuild || (parseInt(userGuild.permissions) & 0x20) !== 0x20) {
      return res.status(403).render('error', { 
        error: 'You don\'t have permission to manage this server!' 
      });
    }

    // Check if bot is in guild
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).render('error', { 
        error: 'Bot is not in this server!' 
      });
    }

    try {
      // Get guild data
      let settings = statements.getGuildSettings.get(guildId);
      if (!settings) {
        const defaults = config.defaultSettings;
        statements.setGuildSettings.run(
          guildId,
          defaults.prefix,
          defaults.modLogChannel,
          defaults.muteRole,
          defaults.automod.antiSpam ? 1 : 0,
          defaults.automod.antiInvite ? 1 : 0,
          defaults.automod.antiLink ? 1 : 0,
          JSON.stringify(defaults.automod.bannedWords)
        );
        settings = statements.getGuildSettings.get(guildId);
      }

      const cases = statements.getAllModCases.all(guildId);
      
      // Get recent cases (last 10)
      const recentCases = cases.slice(0, 10);

      // Get case statistics
      const caseStats = {
        total: cases.length,
        bans: cases.filter(c => c.action.toLowerCase() === 'ban').length,
        kicks: cases.filter(c => c.action.toLowerCase() === 'kick').length,
        mutes: cases.filter(c => c.action.toLowerCase() === 'mute').length,
        warns: cases.filter(c => c.action.toLowerCase() === 'warn').length
      };

      res.render('server', { 
        guild, 
        settings, 
        recentCases, 
        caseStats,
        channels: guild.channels.cache.filter(c => c.type === 0),
        roles: guild.roles.cache
      });
    } catch (error) {
      console.error('Error loading server dashboard:', error);
      res.status(500).render('error', { 
        error: 'Failed to load server data' 
      });
    }
  });

  // API endpoint to update settings
  app.post('/api/guild/:guildId/settings', checkAuth, async (req, res) => {
    const { guildId } = req.params;

    // Verify permissions
    const userGuilds = req.user.guilds || [];
    const userGuild = userGuilds.find(g => g.id === guildId);

    if (!userGuild || (parseInt(userGuild.permissions) & 0x20) !== 0x20) {
      return res.status(403).json({ error: 'No permission' });
    }

    try {
      const { modLogChannel, oblivionLogChannel, antiSpam, antiInvite, antiLink, antiSpamAction, antiInviteAction, antiLinkAction, bannedWordsAction } = req.body;

      db.prepare(`
        UPDATE guild_settings 
        SET mod_log_channel = ?, 
            oblivion_log_channel = ?,
            automod_anti_spam = ?,
            automod_anti_invite = ?,
            automod_anti_link = ?,
            automod_anti_spam_action = ?,
            automod_anti_invite_action = ?,
            automod_anti_link_action = ?,
            automod_banned_words_action = ?
        WHERE guild_id = ?
      `).run(
        modLogChannel || null,
        oblivionLogChannel || null,
        antiSpam ? 1 : 0,
        antiInvite ? 1 : 0,
        antiLink ? 1 : 0,
        antiSpamAction || 'delete',
        antiInviteAction || 'delete',
        antiLinkAction || 'delete',
        bannedWordsAction || 'delete',
        guildId
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // API: Get server stats
  app.get('/api/server/:guildId/stats', checkAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);
      
      if (!guild) {
        return res.json({ success: false, error: 'Guild not found' });
      }

      // Check permissions
      const member = guild.members.cache.get(req.user.id);
      if (!member || !member.permissions.has('ManageGuild')) {
        return res.json({ success: false, error: 'No permission' });
      }

      const cases = statements.getAllModCases.all(guildId);

      res.json({
        success: true,
        memberCount: guild.memberCount,
        channelCount: guild.channels.cache.size,
        roleCount: guild.roles.cache.size,
        caseCount: cases.length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.json({ success: false, error: 'Failed to fetch stats' });
    }
  });

  // API: Get server cases
  app.get('/api/server/:guildId/cases', checkAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);
      
      if (!guild) {
        return res.json({ success: false, error: 'Guild not found' });
      }

      // Check permissions
      const member = guild.members.cache.get(req.user.id);
      if (!member || !member.permissions.has('ManageGuild')) {
        return res.json({ success: false, error: 'No permission' });
      }

      const cases = statements.getAllModCases.all(guildId);

      res.json({
        success: true,
        cases: cases.slice(0, 50) // Return last 50 cases
      });
    } catch (error) {
      console.error('Error fetching cases:', error);
      res.json({ success: false, error: 'Failed to fetch cases' });
    }
  });

  // API: Get server channels
  app.get('/api/server/:guildId/channels', checkAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);
      
      if (!guild) {
        return res.json({ success: false, error: 'Guild not found' });
      }

      // Check permissions
      const member = guild.members.cache.get(req.user.id);
      if (!member || !member.permissions.has('ManageGuild')) {
        return res.json({ success: false, error: 'No permission' });
      }

      const channels = guild.channels.cache
        .filter(ch => ch.type === 0) // Text channels only
        .map(ch => ({
          id: ch.id,
          name: ch.name
        }));

      res.json({
        success: true,
        channels
      });
    } catch (error) {
      console.error('Error fetching channels:', error);
      res.json({ success: false, error: 'Failed to fetch channels' });
    }
  });

  // API: Get server roles
  app.get('/api/server/:guildId/roles', checkAuth, async (req, res) => {
    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);
      
      if (!guild) {
        return res.json({ success: false, error: 'Guild not found' });
      }

      // Check permissions
      const member = guild.members.cache.get(req.user.id);
      if (!member || !member.permissions.has('ManageGuild')) {
        return res.json({ success: false, error: 'No permission' });
      }

      const roles = guild.roles.cache
        .filter(role => role.id !== guild.id) // Exclude @everyone
        .map(role => ({
          id: role.id,
          name: role.name
        }));

      res.json({
        success: true,
        roles
      });
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.json({ success: false, error: 'Failed to fetch roles' });
    }
  });

  // Start server
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`\n🌐 Dashboard running at http://localhost:${config.port}`);
  });

  return app;
};

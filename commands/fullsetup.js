const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

// Store setup data for undo functionality
const setupHistory = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fullsetup')
    .setDescription('Complete server setup with templates and customization')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a full server setup from a template')
        .addStringOption(option =>
          option.setName('template')
            .setDescription('Choose a server template')
            .setRequired(true)
            .addChoices(
              { name: '🤖 Bot Support & Coding', value: 'botsupport' },
              { name: '🎮 Gaming Community', value: 'gaming' },
              { name: '💬 General Community', value: 'community' },
              { name: '📚 Study/Education', value: 'study' },
              { name: '🎨 Creative/Art', value: 'creative' },
              { name: '⚙️ Minimal Setup', value: 'minimal' }
            ))
        .addBooleanOption(option =>
          option.setName('skip_achievements')
            .setDescription('Skip creating achievement roles (faster setup)')
            .setRequired(false))
        .addBooleanOption(option =>
          option.setName('skip_verification')
            .setDescription('Skip verification system setup')
            .setRequired(false))
        .addBooleanOption(option =>
          option.setName('skip_tickets')
            .setDescription('Skip ticket system setup')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('undo')
        .setDescription('Remove all items created by the last setup')
        .addStringOption(option =>
          option.setName('confirm')
            .setDescription('Type "CONFIRM" to proceed with deletion')
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'undo') {
      return this.handleUndo(interaction);
    }

    // Get options
    const template = interaction.options.getString('template');
    const skipAchievements = interaction.options.getBoolean('skip_achievements') || false;
    const skipVerification = interaction.options.getBoolean('skip_verification') || false;
    const skipTickets = interaction.options.getBoolean('skip_tickets') || false;

    // Instant reply with progress embed
    const progressEmbed = new EmbedBuilder()
      .setColor(0x007aff)
      .setTitle('🔧 Server Setup in Progress')
      .setDescription(`**Template:** ${this.getTemplateName(template)}\n\n⏳ Starting setup...`)
      .setTimestamp();

    await interaction.reply({ embeds: [progressEmbed], flags: 64 });

    try {
      const guild = interaction.guild;
      const setupData = {
        guildId: guild.id,
        timestamp: Date.now(),
        roles: [],
        channels: [],
        categories: []
      };

      let progress = [];
      const errors = [];

      // Update progress helper
      const updateProgress = async (message) => {
        progress.push(message);
        progressEmbed.setDescription(
          `**Template:** ${this.getTemplateName(template)}\n\n${progress.slice(-8).join('\n')}`
        );
        try {
          await interaction.editReply({ embeds: [progressEmbed] });
        } catch (e) {
          // Ignore edit errors
        }
      };

      await updateProgress('📋 Checking existing roles and channels...');

      // Get bot's highest role position for hierarchy
      const botMember = await guild.members.fetch(guild.members.me.id);
      const botHighestRole = botMember.roles.highest;
      let currentPosition = botHighestRole.position - 1;

      // ===== STEP 1: Staff Roles =====
      await updateProgress('👑 Creating staff roles...');
      const staffRoles = await this.createStaffRoles(guild, currentPosition, setupData, errors, template);
      currentPosition -= Object.keys(staffRoles).length;

      // ===== STEP 2: Mute Role =====
      await updateProgress('🔇 Creating mute role...');
      const muteRole = await this.createMuteRole(guild, currentPosition--, setupData, errors);

      // ===== STEP 3: Verification Role (if not skipped) =====
      let verificationRole = null;
      if (!skipVerification) {
        await updateProgress('✅ Creating verification system...');
        verificationRole = await this.createVerificationRole(guild, setupData, errors);
      }

      // ===== STEP 4: Achievement Roles (if not skipped) =====
      let achievementRoles = {};
      if (!skipAchievements) {
        await updateProgress('🏆 Creating achievement roles...');
        achievementRoles = await this.createAchievementRoles(guild, currentPosition, setupData, errors);
        currentPosition -= 15;
      }

      // ===== STEP 5: Log Channels =====
      await updateProgress('📁 Creating log channels...');
      const logChannels = await this.createLogChannels(guild, staffRoles, setupData, errors);

      // ===== STEP 6: Verification Channel (if not skipped) =====
      let verificationChannel = null;
      if (!skipVerification && verificationRole) {
        await updateProgress('🚪 Setting up verification...');
        verificationChannel = await this.createVerificationChannel(guild, verificationRole, setupData, errors);
      }

      // ===== STEP 7: Ticket System (if not skipped) =====
      let ticketChannels = null;
      if (!skipTickets) {
        await updateProgress('🎫 Creating ticket system...');
        ticketChannels = await this.createTicketSystem(guild, staffRoles, setupData, errors);
      }

      // ===== STEP 8: Template-Specific Channels =====
      await updateProgress('📺 Creating template channels...');
      const templateChannels = await this.createTemplateChannels(guild, template, verificationRole, setupData, errors);

      // ===== STEP 9: Configure Channel Permissions for Mute =====
      if (muteRole) {
        await updateProgress('🔧 Configuring mute permissions...');
        await this.configureMutePermissions(guild, muteRole);
      }

      // ===== STEP 10: Save to Database =====
      await updateProgress('💾 Saving configuration...');
      
      if (!skipAchievements && Object.keys(achievementRoles).length > 0) {
        await DatabaseHelper.setAchievementSettings(
          guild.id,
          achievementRoles.msg_100_role?.id,
          achievementRoles.msg_500_role?.id,
          achievementRoles.msg_1000_role?.id,
          achievementRoles.msg_5000_role?.id,
          achievementRoles.msg_10000_role?.id,
          achievementRoles.vc_30_role?.id,
          achievementRoles.vc_60_role?.id,
          achievementRoles.vc_500_role?.id,
          achievementRoles.vc_1000_role?.id,
          achievementRoles.vc_5000_role?.id,
          achievementRoles.react_50_role?.id,
          achievementRoles.react_250_role?.id,
          achievementRoles.react_1000_role?.id,
          achievementRoles.popular_100_role?.id,
          achievementRoles.popular_500_role?.id
        );
      }

      if (logChannels.modLog) {
        await DatabaseHelper.updateModLogChannel(guild.id, logChannels.modLog.id);
      }
      if (logChannels.serverLog) {
        await DatabaseHelper.updateOblivionLogChannel(guild.id, logChannels.serverLog.id);
      }

      if (muteRole) {
        const currentSettings = await DatabaseHelper.getGuildSettings(guild.id);
        await DatabaseHelper.setGuildSettings(
          guild.id,
          currentSettings?.prefix || '!',
          currentSettings?.welcome_channel || null,
          muteRole.id,
          currentSettings?.level_up_messages ?? 1,
          currentSettings?.achievement_messages ?? 1,
          currentSettings?.user_join_log ?? 0,
          currentSettings?.ignored_channels || '[]'
        );
      }

      await DatabaseHelper.updateLevelUpMessages(guild.id, 1);
      await DatabaseHelper.updateAchievementMessages(guild.id, 1);

      // Store setup history for undo
      setupHistory.set(guild.id, setupData);

      // ===== Final Summary =====
      await updateProgress('✨ Setup complete!');

      const summaryEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Server Setup Complete!')
        .setDescription(this.generateSummary(template, setupData, staffRoles, achievementRoles, logChannels, ticketChannels, verificationChannel, templateChannels, skipAchievements, skipVerification, skipTickets, errors, muteRole))
        .setFooter({ text: 'Use /fullsetup undo confirm:CONFIRM to remove all created items' })
        .setTimestamp();

      await interaction.editReply({ embeds: [summaryEmbed] });

    } catch (error) {
      console.error('Error in fullsetup command:', error);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Setup Failed')
        .setDescription(`An error occurred: ${error.message}\n\nPlease check bot permissions and try again.`)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },

  getTemplateName(template) {
    const names = {
      'botsupport': '🤖 Bot Support & Coding',
      'gaming': '🎮 Gaming Community',
      'community': '💬 General Community',
      'study': '📚 Study/Education',
      'creative': '🎨 Creative/Art',
      'minimal': '⚙️ Minimal Setup'
    };
    return names[template] || template;
  },

  async createStaffRoles(guild, startPosition, setupData, errors, template) {
    const roles = {};
    let position = startPosition;

    // Template-based color customization
    const colors = {
      botsupport: { owner: 0x5865F2, admin: 0x57F287, mod: 0xFEE75C },
      gaming: { owner: 0xFF0000, admin: 0xFF7700, mod: 0x00FF00 },
      community: { owner: 0x9B59B6, admin: 0x3498DB, mod: 0x2ECC71 },
      study: { owner: 0x1ABC9C, admin: 0x3498DB, mod: 0xE74C3C },
      creative: { owner: 0xE91E63, admin: 0x9C27B0, mod: 0xFF9800 },
      minimal: { owner: 0xFF0000, admin: 0xFF7700, mod: 0x00FF00 }
    };

    const templateColors = colors[template] || colors.minimal;

    try {
      roles.owner = await guild.roles.create({
        name: '👑 Owner',
        color: templateColors.owner,
        permissions: [PermissionFlagsBits.Administrator],
        position: position--,
        reason: 'Full server setup - Owner role'
      });
      setupData.roles.push(roles.owner.id);
    } catch (err) {
      errors.push(`Failed to create Owner role: ${err.message}`);
    }

    try {
      roles.admin = await guild.roles.create({
        name: '🛡️ Admin',
        color: templateColors.admin,
        permissions: [
          PermissionFlagsBits.ManageGuild,
          PermissionFlagsBits.ManageRoles,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.KickMembers,
          PermissionFlagsBits.BanMembers,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ModerateMembers
        ],
        position: position--,
        reason: 'Full server setup - Admin role'
      });
      setupData.roles.push(roles.admin.id);
    } catch (err) {
      errors.push(`Failed to create Admin role: ${err.message}`);
    }

    try {
      roles.moderator = await guild.roles.create({
        name: '⚔️ Moderator',
        color: templateColors.mod,
        permissions: [
          PermissionFlagsBits.KickMembers,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ModerateMembers
        ],
        position: position--,
        reason: 'Full server setup - Moderator role'
      });
      setupData.roles.push(roles.moderator.id);
    } catch (err) {
      errors.push(`Failed to create Moderator role: ${err.message}`);
    }

    return roles;
  },

  async createMuteRole(guild, position, setupData, errors) {
    try {
      const muteRole = await guild.roles.create({
        name: '🔇 Muted',
        color: 0x808080,
        permissions: [],
        position: position,
        reason: 'Full server setup - Mute role'
      });
      setupData.roles.push(muteRole.id);
      return muteRole;
    } catch (err) {
      errors.push(`Failed to create Mute role: ${err.message}`);
      return null;
    }
  },

  async createVerificationRole(guild, setupData, errors) {
    try {
      const verifyRole = await guild.roles.create({
        name: '✅ Verified',
        color: 0x00FF00,
        permissions: [],
        reason: 'Full server setup - Verification role'
      });
      setupData.roles.push(verifyRole.id);
      return verifyRole;
    } catch (err) {
      errors.push(`Failed to create Verification role: ${err.message}`);
      return null;
    }
  },

  async createAchievementRoles(guild, startPosition, setupData, errors) {
    const roles = {};
    let position = startPosition;

    const achievementData = [
      { key: 'msg_10000_role', name: '💎 Diamond Chatter', color: 0xB9F2FF },
      { key: 'msg_5000_role', name: '💎 Diamond Messages', color: 0xB9F2FF },
      { key: 'msg_1000_role', name: '🥇 Gold Chatter', color: 0xFFD700 },
      { key: 'msg_500_role', name: '🥇 Gold Messages', color: 0xFFD700 },
      { key: 'msg_100_role', name: '🥇 Gold Starter', color: 0xFFD700 },
      { key: 'vc_5000_role', name: '🥈 Silver VC Legend', color: 0xC0C0C0 },
      { key: 'vc_1000_role', name: '🥈 Silver Voice', color: 0xC0C0C0 },
      { key: 'vc_500_role', name: '🥈 Silver VC', color: 0xC0C0C0 },
      { key: 'vc_60_role', name: '🥈 Silver Hour', color: 0xC0C0C0 },
      { key: 'vc_30_role', name: '🥈 Silver Half', color: 0xC0C0C0 },
      { key: 'react_1000_role', name: '🥉 Bronze Reactor Pro', color: 0xCD7F32 },
      { key: 'react_250_role', name: '🥉 Bronze Reactions', color: 0xCD7F32 },
      { key: 'react_50_role', name: '🥉 Bronze React', color: 0xCD7F32 },
      { key: 'popular_500_role', name: '⚪ Gray Popular', color: 0x808080 },
      { key: 'popular_100_role', name: '⚪ Gray Liked', color: 0x808080 }
    ];

    for (const achievement of achievementData) {
      try {
        roles[achievement.key] = await guild.roles.create({
          name: achievement.name,
          color: achievement.color,
          permissions: [],
          position: position--,
          reason: `Full server setup - ${achievement.name}`
        });
        setupData.roles.push(roles[achievement.key].id);
      } catch (err) {
        errors.push(`Failed to create ${achievement.name}: ${err.message}`);
      }
    }

    return roles;
  },

  async createLogChannels(guild, staffRoles, setupData, errors) {
    const channels = {};

    try {
      // Create Logs category
      const logsCategory = await guild.channels.create({
        name: '📋 LOGS',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: guild.members.me.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          },
          ...(staffRoles.owner ? [{
            id: staffRoles.owner.id,
            allow: [PermissionFlagsBits.ViewChannel]
          }] : []),
          ...(staffRoles.admin ? [{
            id: staffRoles.admin.id,
            allow: [PermissionFlagsBits.ViewChannel]
          }] : []),
          ...(staffRoles.moderator ? [{
            id: staffRoles.moderator.id,
            allow: [PermissionFlagsBits.ViewChannel]
          }] : [])
        ],
        reason: 'Full server setup - Logs category'
      });
      setupData.categories.push(logsCategory.id);

      channels.modLog = await guild.channels.create({
        name: '🔨-mod-logs',
        type: ChannelType.GuildText,
        parent: logsCategory.id,
        reason: 'Full server setup - Mod logs channel'
      });
      setupData.channels.push(channels.modLog.id);

      channels.serverLog = await guild.channels.create({
        name: '📝-server-logs',
        type: ChannelType.GuildText,
        parent: logsCategory.id,
        reason: 'Full server setup - Server logs channel'
      });
      setupData.channels.push(channels.serverLog.id);

    } catch (err) {
      errors.push(`Failed to create log channels: ${err.message}`);
    }

    return channels;
  },

  async createVerificationChannel(guild, verificationRole, setupData, errors) {
    try {
      const verifyChannel = await guild.channels.create({
        name: '🚪-verify',
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.id,
            allow: [PermissionFlagsBits.ViewChannel],
            deny: [PermissionFlagsBits.SendMessages]
          },
          {
            id: verificationRole.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: guild.members.me.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          }
        ],
        reason: 'Full server setup - Verification channel'
      });
      setupData.channels.push(verifyChannel.id);

      // Send verification message
      const verifyEmbed = new EmbedBuilder()
        .setColor(0x007aff)
        .setTitle('🚪 Welcome to the Server!')
        .setDescription('Click the button below to verify and gain access to the server.')
        .setTimestamp();

      const verifyButton = new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel('✅ Verify')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(verifyButton);

      await verifyChannel.send({ embeds: [verifyEmbed], components: [row] });

      return verifyChannel;
    } catch (err) {
      errors.push(`Failed to create verification channel: ${err.message}`);
      return null;
    }
  },

  async createTicketSystem(guild, staffRoles, setupData, errors) {
    const channels = {};

    try {
      // Create Tickets category
      const ticketsCategory = await guild.channels.create({
        name: '🎫 TICKETS',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: guild.members.me.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
          },
          ...(staffRoles.owner ? [{
            id: staffRoles.owner.id,
            allow: [PermissionFlagsBits.ViewChannel]
          }] : []),
          ...(staffRoles.admin ? [{
            id: staffRoles.admin.id,
            allow: [PermissionFlagsBits.ViewChannel]
          }] : []),
          ...(staffRoles.moderator ? [{
            id: staffRoles.moderator.id,
            allow: [PermissionFlagsBits.ViewChannel]
          }] : [])
        ],
        reason: 'Full server setup - Tickets category'
      });
      setupData.categories.push(ticketsCategory.id);

      // Create ticket creation channel
      channels.ticketCreate = await guild.channels.create({
        name: '🎫-create-ticket',
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.id,
            allow: [PermissionFlagsBits.ViewChannel],
            deny: [PermissionFlagsBits.SendMessages]
          },
          {
            id: guild.members.me.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          }
        ],
        reason: 'Full server setup - Ticket creation channel'
      });
      setupData.channels.push(channels.ticketCreate.id);

      // Send ticket creation message
      const ticketEmbed = new EmbedBuilder()
        .setColor(0x007aff)
        .setTitle('🎫 Support Tickets')
        .setDescription('Need help? Click the button below to create a support ticket.\n\n' +
          '**When to create a ticket:**\n' +
          '• Report a user\n' +
          '• Ask staff a question\n' +
          '• Report a bug\n' +
          '• Request assistance')
        .setTimestamp();

      const ticketButton = new ButtonBuilder()
        .setCustomId('create_ticket')
        .setLabel('📩 Create Ticket')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(ticketButton);

      await channels.ticketCreate.send({ embeds: [ticketEmbed], components: [row] });

      channels.category = ticketsCategory;

    } catch (err) {
      errors.push(`Failed to create ticket system: ${err.message}`);
    }

    return channels;
  },

  async createTemplateChannels(guild, template, verificationRole, setupData, errors) {
    const channels = [];

    try {
      const templates = {
        botsupport: [
          { name: '📢-announcements', topic: 'Bot updates and server announcements' },
          { name: '📜-rules', topic: 'Server rules and guidelines' },
          { name: '📰-changelog', topic: 'Bot updates and patch notes' },
          { name: '🔗-invite-bot', topic: 'Invite Oblivion to your server!' },
          { name: '═══════════════', type: ChannelType.GuildCategory },
          { name: '💬-GENERAL', type: ChannelType.GuildCategory },
          { name: '💬-general-chat', topic: 'General discussion', category: 'general' },
          { name: '🤖-bot-commands', topic: 'Test bot commands here', category: 'general' },
          { name: '🎉-showcase', topic: 'Show off your servers and projects', category: 'general' },
          { name: '💡-suggestions', topic: 'Suggest new features for the bot', category: 'general' },
          { name: '═══════════════', type: ChannelType.GuildCategory },
          { name: '🆘-SUPPORT', type: ChannelType.GuildCategory },
          { name: '❓-help', topic: 'Get help with the bot', category: 'support' },
          { name: '🐛-bug-reports', topic: 'Report bugs and issues', category: 'support' },
          { name: '📚-tutorials', topic: 'Guides and tutorials', category: 'support' },
          { name: '❓-faq', topic: 'Frequently asked questions', category: 'support' },
          { name: '═══════════════', type: ChannelType.GuildCategory },
          { name: '👨‍💻-CODING', type: ChannelType.GuildCategory },
          { name: '💻-coding-chat', topic: 'General programming discussion', category: 'coding' },
          { name: '🐍-python', topic: 'Python programming help', category: 'coding' },
          { name: '🟨-javascript', topic: 'JavaScript/Node.js/Discord.js help', category: 'coding' },
          { name: '🌐-web-dev', topic: 'HTML, CSS, React, and web development', category: 'coding' },
          { name: '🔧-other-languages', topic: 'C++, Java, C#, and other languages', category: 'coding' },
          { name: '💾-code-snippets', topic: 'Share useful code snippets', category: 'coding' },
          { name: '🤝-collab', topic: 'Find collaborators for projects', category: 'coding' },
          { name: '═══════════════', type: ChannelType.GuildCategory },
          { name: '🔊-VOICE CHANNELS', type: ChannelType.GuildCategory },
          { name: '🎤 General Voice', type: ChannelType.GuildVoice, category: 'voice' },
          { name: '💻 Coding Session', type: ChannelType.GuildVoice, category: 'voice' },
          { name: '🆘 Help Voice', type: ChannelType.GuildVoice, category: 'voice' },
          { name: '🎮 Gaming', type: ChannelType.GuildVoice, category: 'voice' }
        ],
        gaming: [
          { name: '📢-announcements', topic: 'Server announcements and updates' },
          { name: '💬-general', topic: 'General discussion' },
          { name: '🎮-gaming', topic: 'Talk about games' },
          { name: '🎯-lfg', topic: 'Looking for group' },
          { name: '🔊-Voice Channels', type: ChannelType.GuildCategory },
          { name: '🎤 General', type: ChannelType.GuildVoice, category: true },
          { name: '🎮 Gaming 1', type: ChannelType.GuildVoice, category: true },
          { name: '🎮 Gaming 2', type: ChannelType.GuildVoice, category: true }
        ],
        community: [
          { name: '📢-announcements', topic: 'Server announcements' },
          { name: '📜-rules', topic: 'Server rules and guidelines' },
          { name: '💬-general', topic: 'General chat' },
          { name: '🤖-bot-commands', topic: 'Use bot commands here' },
          { name: '🎉-events', topic: 'Community events' },
          { name: '🔊-Voice Channels', type: ChannelType.GuildCategory },
          { name: '🎤 General', type: ChannelType.GuildVoice, category: true },
          { name: '🎵 Music', type: ChannelType.GuildVoice, category: true }
        ],
        study: [
          { name: '📢-announcements', topic: 'Important announcements' },
          { name: '📚-resources', topic: 'Study resources and materials' },
          { name: '💬-general', topic: 'General discussion' },
          { name: '❓-help', topic: 'Ask for help here' },
          { name: '🎯-study-sessions', topic: 'Organize study sessions' },
          { name: '🔊-Study Rooms', type: ChannelType.GuildCategory },
          { name: '📖 Study Room 1', type: ChannelType.GuildVoice, category: true },
          { name: '📖 Study Room 2', type: ChannelType.GuildVoice, category: true }
        ],
        creative: [
          { name: '📢-announcements', topic: 'Server updates' },
          { name: '🎨-showcase', topic: 'Share your work' },
          { name: '💬-general', topic: 'General chat' },
          { name: '💡-ideas', topic: 'Share ideas and feedback' },
          { name: '🔊-Voice Channels', type: ChannelType.GuildCategory },
          { name: '🎤 General', type: ChannelType.GuildVoice, category: true },
          { name: '🎨 Creative Session', type: ChannelType.GuildVoice, category: true }
        ],
        minimal: [
          { name: '📢-announcements', topic: 'Server announcements' },
          { name: '💬-general', topic: 'General chat' },
          { name: '🔊-Voice Channels', type: ChannelType.GuildCategory },
          { name: '🎤 General', type: ChannelType.GuildVoice, category: true }
        ]
      };

      const templateData = templates[template] || templates.minimal;
      let voiceCategory = null;
      let generalCategory = null;
      let supportCategory = null;
      let codingCategory = null;
      let currentCategory = null;

      for (const channelData of templateData) {
        try {
          if (channelData.name === '═══════════════') {
            // Skip separator
            continue;
          }

          if (channelData.type === ChannelType.GuildCategory) {
            currentCategory = await guild.channels.create({
              name: channelData.name,
              type: ChannelType.GuildCategory,
              permissionOverwrites: verificationRole ? [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: verificationRole.id, allow: [PermissionFlagsBits.ViewChannel] }
              ] : [],
              reason: 'Full server setup - Template category'
            });
            setupData.categories.push(currentCategory.id);

            // Store reference based on category type
            if (channelData.category === 'voice' || channelData.name.includes('VOICE')) {
              voiceCategory = currentCategory;
            } else if (channelData.name.includes('GENERAL')) {
              generalCategory = currentCategory;
            } else if (channelData.name.includes('SUPPORT')) {
              supportCategory = currentCategory;
            } else if (channelData.name.includes('CODING')) {
              codingCategory = currentCategory;
            }
          } else if (channelData.type === ChannelType.GuildVoice) {
            const parentCategory = channelData.category === 'voice' ? voiceCategory : currentCategory;
            const vc = await guild.channels.create({
              name: channelData.name,
              type: ChannelType.GuildVoice,
              parent: parentCategory?.id,
              permissionOverwrites: verificationRole ? [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: verificationRole.id, allow: [PermissionFlagsBits.ViewChannel] }
              ] : [],
              reason: 'Full server setup - Template voice channel'
            });
            setupData.channels.push(vc.id);
            channels.push(vc);
          } else {
            // Determine parent category
            let parentCategory = null;
            if (channelData.category === 'general') {
              parentCategory = generalCategory;
            } else if (channelData.category === 'support') {
              parentCategory = supportCategory;
            } else if (channelData.category === 'coding') {
              parentCategory = codingCategory;
            } else if (channelData.category === 'voice') {
              parentCategory = voiceCategory;
            } else {
              parentCategory = currentCategory;
            }

            const ch = await guild.channels.create({
              name: channelData.name,
              type: ChannelType.GuildText,
              topic: channelData.topic,
              parent: parentCategory?.id,
              permissionOverwrites: verificationRole ? [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: verificationRole.id, allow: [PermissionFlagsBits.ViewChannel] }
              ] : [],
              reason: 'Full server setup - Template channel'
            });
            setupData.channels.push(ch.id);
            channels.push(ch);
          }
        } catch (err) {
          errors.push(`Failed to create ${channelData.name}: ${err.message}`);
        }
      }

    } catch (err) {
      errors.push(`Failed to create template channels: ${err.message}`);
    }

    return channels;
  },

  async configureMutePermissions(guild, muteRole) {
    try {
      const channels = await guild.channels.fetch();
      for (const [, channel] of channels) {
        if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
          try {
            await channel.permissionOverwrites.create(muteRole, {
              SendMessages: false,
              AddReactions: false,
              Speak: false,
              Connect: false
            });
          } catch (err) {
            // Skip if permission denied
          }
        }
      }
    } catch (err) {
      // Ignore errors
    }
  },

  generateSummary(template, setupData, staffRoles, achievementRoles, logChannels, ticketChannels, verificationChannel, templateChannels, skipAchievements, skipVerification, skipTickets, errors, muteRole) {
    let summary = `**🎉 Setup Complete using ${this.getTemplateName(template)}**\n\n`;

    summary += `**📊 Summary:**\n`;
    summary += `• Roles Created: ${setupData.roles.length}\n`;
    summary += `• Channels Created: ${setupData.channels.length}\n`;
    summary += `• Categories Created: ${setupData.categories.length}\n\n`;

    summary += `**👥 Staff Roles:**\n`;
    if (staffRoles.owner) summary += `• ${staffRoles.owner.name}\n`;
    if (staffRoles.admin) summary += `• ${staffRoles.admin.name}\n`;
    if (staffRoles.moderator) summary += `• ${staffRoles.moderator.name}\n`;
    if (muteRole) summary += `• ${muteRole.name}\n`;

    if (!skipAchievements && Object.keys(achievementRoles).length > 0) {
      summary += `\n**🏆 Achievement Roles:** ${Object.keys(achievementRoles).length} roles created\n`;
    }

    if (!skipVerification && verificationChannel) {
      summary += `\n**✅ Verification:** Enabled in ${verificationChannel.name}\n`;
    }

    if (!skipTickets && ticketChannels) {
      summary += `\n**🎫 Ticket System:** Ready in ${ticketChannels.ticketCreate?.name || 'ticket channel'}\n`;
    }

    summary += `\n**📁 Channels:** ${setupData.channels.length + setupData.categories.length} channels/categories\n`;

    if (errors.length > 0) {
      summary += `\n**⚠️ Warnings:** ${errors.length} non-critical issue(s)\n`;
    }

    summary += `\n✨ Your server is ready! Configure settings with \`/settings\``;

    return summary;
  },

  async handleUndo(interaction) {
    const confirm = interaction.options.getString('confirm');
    
    if (confirm !== 'CONFIRM') {
      return interaction.reply({
        content: '❌ Please type "CONFIRM" exactly to proceed with deletion.',
        flags: 64
      });
    }

    const setupData = setupHistory.get(interaction.guild.id);

    if (!setupData) {
      return interaction.reply({
        content: '❌ No setup history found for this server. Nothing to undo.',
        flags: 64
      });
    }

    await interaction.reply({
      content: '🗑️ Starting cleanup... This may take a moment.',
      flags: 64
    });

    const deleted = { roles: 0, channels: 0, categories: 0 };
    const failed = [];

    try {
      // Delete channels first
      for (const channelId of setupData.channels) {
        try {
          const channel = await interaction.guild.channels.fetch(channelId);
          if (channel) {
            await channel.delete('Undoing fullsetup');
            deleted.channels++;
          }
        } catch (err) {
          failed.push(`Channel ${channelId}: ${err.message}`);
        }
      }

      // Delete categories
      for (const categoryId of setupData.categories) {
        try {
          const category = await interaction.guild.channels.fetch(categoryId);
          if (category) {
            await category.delete('Undoing fullsetup');
            deleted.categories++;
          }
        } catch (err) {
          failed.push(`Category ${categoryId}: ${err.message}`);
        }
      }

      // Delete roles
      for (const roleId of setupData.roles) {
        try {
          const role = await interaction.guild.roles.fetch(roleId);
          if (role) {
            await role.delete('Undoing fullsetup');
            deleted.roles++;
          }
        } catch (err) {
          failed.push(`Role ${roleId}: ${err.message}`);
        }
      }

      setupHistory.delete(interaction.guild.id);

      const resultEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Cleanup Complete')
        .setDescription(
          `**Deleted:**\n` +
          `• ${deleted.roles} roles\n` +
          `• ${deleted.channels} channels\n` +
          `• ${deleted.categories} categories\n\n` +
          (failed.length > 0 ? `**Failed:** ${failed.length} items (may already be deleted)` : '✨ All items removed successfully!')
        )
        .setTimestamp();

      await interaction.editReply({ content: null, embeds: [resultEmbed] });

    } catch (error) {
      console.error('Error in undo:', error);
      await interaction.editReply({
        content: `❌ Error during cleanup: ${error.message}`,
        embeds: []
      });
    }
  }
};

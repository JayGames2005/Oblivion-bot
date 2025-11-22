const { Events, ChannelType, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const DatabaseHelper = require('../database-helper');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Only handle button interactions in this file
    // Slash commands are handled in index.js
    if (!interaction.isButton()) return;

    // Handle giveaway entries
    if (interaction.customId === 'giveaway_enter') {
      // Get giveaway data
      const giveaway = interaction.client.giveaways?.get(interaction.message.id);
      
      if (!giveaway) {
        return interaction.reply({
          content: '❌ This giveaway is no longer active!',
          flags: 64
        });
      }

      // Check if already entered
      if (giveaway.entries.includes(interaction.user.id)) {
        return interaction.reply({
          content: '❌ You have already entered this giveaway!',
          flags: 64
        });
      }

      // Add entry
      giveaway.entries.push(interaction.user.id);

      await interaction.reply({
        content: `✅ You have been entered into the giveaway! Good luck! 🍀`,
        flags: 64
      });
    }

    // Handle verification button
    if (interaction.customId === 'verify_button') {
      try {
        // Find the verified role
        const verifiedRole = interaction.guild.roles.cache.find(r => r.name === '✅ Verified');
        
        if (!verifiedRole) {
          return interaction.reply({
            content: '❌ Verification role not found! Please contact an administrator.',
            flags: 64
          });
        }

        // Check if already verified
        if (interaction.member.roles.cache.has(verifiedRole.id)) {
          return interaction.reply({
            content: '✅ You are already verified!',
            flags: 64
          });
        }

        // Add verified role
        await interaction.member.roles.add(verifiedRole);

        await interaction.reply({
          content: `✅ You have been verified! Welcome to ${interaction.guild.name}! 🎉`,
          flags: 64
        });
      } catch (error) {
        console.error('Verification error:', error);
        await interaction.reply({
          content: '❌ Failed to verify. Please contact an administrator.',
          flags: 64
        });
      }
    }

    // Handle ticket creation button
    if (interaction.customId === 'create_ticket') {
      try {
        // Check if user already has an open ticket
        const existingTicket = interaction.guild.channels.cache.find(
          c => c.name === `ticket-${interaction.user.username.toLowerCase()}` && c.type === ChannelType.GuildText
        );

        if (existingTicket) {
          return interaction.reply({
            content: `❌ You already have an open ticket: ${existingTicket}`,
            flags: 64
          });
        }

        await interaction.reply({
          content: '🎫 Creating your ticket...',
          flags: 64
        });

        // Find tickets category
        const ticketsCategory = interaction.guild.channels.cache.find(
          c => c.name === '🎫 TICKETS' && c.type === ChannelType.GuildCategory
        );

        // Find staff roles
        const ownerRole = interaction.guild.roles.cache.find(r => r.name === '👑 Owner');
        const adminRole = interaction.guild.roles.cache.find(r => r.name === '🛡️ Admin');
        const modRole = interaction.guild.roles.cache.find(r => r.name === '⚔️ Moderator');

        // Create ticket channel
        const ticketChannel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: ticketsCategory?.id,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            },
            {
              id: interaction.client.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
            },
            ...(ownerRole ? [{
              id: ownerRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            }] : []),
            ...(adminRole ? [{
              id: adminRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            }] : []),
            ...(modRole ? [{
              id: modRole.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            }] : [])
          ],
          reason: `Support ticket for ${interaction.user.tag}`
        });

        // Create ticket embed
        const ticketEmbed = new EmbedBuilder()
          .setColor(0x007aff)
          .setTitle('🎫 Support Ticket')
          .setDescription(`**Ticket created by:** ${interaction.user}\n\nPlease describe your issue or question. Staff will be with you shortly!`)
          .setTimestamp()
          .setFooter({ text: 'Click the button below to close this ticket' });

        const closeButton = new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('🔒 Close Ticket')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(closeButton);

        await ticketChannel.send({
          content: `${interaction.user} ${ownerRole ? ownerRole : ''}${adminRole ? ' ' + adminRole : ''}${modRole ? ' ' + modRole : ''}`,
          embeds: [ticketEmbed],
          components: [row]
        });

        await interaction.editReply({
          content: `✅ Your ticket has been created: ${ticketChannel}`
        });

      } catch (error) {
        console.error('Ticket creation error:', error);
        await interaction.editReply({
          content: '❌ Failed to create ticket. Please contact an administrator.'
        });
      }
    }

    // Handle ticket close button
    if (interaction.customId === 'close_ticket') {
      try {
        const channel = interaction.channel;

        if (!channel.name.startsWith('ticket-')) {
          return interaction.reply({
            content: '❌ This can only be used in ticket channels!',
            flags: 64
          });
        }

        await interaction.reply({
          content: '🔒 Closing ticket in 5 seconds...'
        });

        setTimeout(async () => {
          try {
            await channel.delete('Ticket closed');
          } catch (err) {
            console.error('Failed to delete ticket channel:', err);
          }
        }, 5000);

      } catch (error) {
        console.error('Ticket close error:', error);
        await interaction.reply({
          content: '❌ Failed to close ticket.',
          flags: 64
        });
      }
    }
  }
};

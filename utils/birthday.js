// Utility for birthday checks and notifications
const DatabaseHelper = require('../database-helper');

module.exports = {
  async checkAndSendBirthdays(client) {
    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    // Assume DatabaseHelper.getAllBirthdays returns [{guild_id, user_id, date}]
    const all = await DatabaseHelper.getAllBirthdays(mmdd);
    for (const entry of all) {
      try {
        const guild = client.guilds.cache.get(entry.guild_id);
        if (!guild) continue;
        const member = await guild.members.fetch(entry.user_id).catch(() => null);
        if (member) {
          await member.send(`🎉 Happy Birthday, ${member.user.username}! 🎂`);
        }
      } catch (e) { /* ignore DM errors */ }
    }
  }
};

// Utility for handling custom commands in memory (for fast lookup)
const customCommandsCache = new Map(); // guildId -> [{trigger, response}]

module.exports = {
  getCommands(guildId) {
    return customCommandsCache.get(guildId) || [];
  },
  setCommands(guildId, commands) {
    customCommandsCache.set(guildId, commands);
  },
  addCommand(guildId, trigger, response) {
    const cmds = customCommandsCache.get(guildId) || [];
    cmds.push({ trigger, response });
    customCommandsCache.set(guildId, cmds);
  },
  removeCommand(guildId, trigger) {
    const cmds = (customCommandsCache.get(guildId) || []).filter(c => c.trigger !== trigger);
    customCommandsCache.set(guildId, cmds);
  }
};

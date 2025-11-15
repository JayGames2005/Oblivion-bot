const ms = require('ms');

/**
 * Parse duration string (e.g., "1d", "2h", "30m") to milliseconds
 */
function parseDuration(duration) {
  try {
    return ms(duration);
  } catch (error) {
    return null;
  }
}

/**
 * Format duration in milliseconds to human readable string
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

/**
 * Check if user has required permissions
 */
function hasPermission(member, permission) {
  return member.permissions.has(permission);
}

/**
 * Check if bot can moderate target user
 */
function canModerate(executorMember, target, guild) {
  // Can't moderate yourself
  if (executorMember.user.id === target.id) {
    return { canModerate: false, reason: 'You cannot moderate yourself!' };
  }

  // Can't moderate guild owner
  if (target.id === guild.ownerId) {
    return { canModerate: false, reason: 'You cannot moderate the server owner!' };
  }

  // Get target member
  const targetMember = guild.members.cache.get(target.id);

  if (targetMember) {
    // Can't moderate bots (except with Administrator permission)
    if (target.bot && !executorMember.permissions.has('Administrator')) {
      return { canModerate: false, reason: 'You cannot moderate bots!' };
    }

    // Check role hierarchy
    if (executorMember.roles.highest.position <= targetMember.roles.highest.position) {
      return { canModerate: false, reason: 'You cannot moderate someone with an equal or higher role!' };
    }
  }

  return { canModerate: true };
}

/**
 * Truncate string to max length
 */
function truncate(str, maxLength = 1024) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

module.exports = {
  parseDuration,
  formatDuration,
  hasPermission,
  canModerate,
  truncate
};

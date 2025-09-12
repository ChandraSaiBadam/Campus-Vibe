const crypto = require('crypto');

// Enhanced word lists for better username variety
const adjectives = [
  'Anonymous', 'Mysterious', 'Hidden', 'Secret', 'Unknown', 'Silent', 
  'Quiet', 'Calm', 'Bright', 'Swift', 'Smart', 'Clever', 'Wise', 
  'Bold', 'Cool', 'Sharp', 'Quick', 'Steady', 'Noble', 'Pure',
  'Active', 'Alert', 'Brave', 'Clear', 'Fresh', 'Happy', 'Kind',
  'Loyal', 'Proud', 'Strong', 'Unique', 'Vivid', 'Wild', 'Young'
];

const nouns = [
  'Student', 'Learner', 'Scholar', 'Thinker', 'Observer', 'Listener', 
  'Speaker', 'Writer', 'Reader', 'Dreamer', 'Explorer', 'Creator',
  'Builder', 'Helper', 'Leader', 'Friend', 'Mentor', 'Guide',
  'Seeker', 'Finder', 'Maker', 'Solver', 'Planner', 'Designer',
  'Artist', 'Poet', 'Coder', 'Hacker', 'Ninja', 'Wizard', 'Knight',
  'Guardian', 'Pioneer', 'Champion'
];

// Cache to store IP to username mappings
const ipUsernameCache = new Map();

/**
 * Generate a consistent username based on IP address
 * @param {string} ipAddress - The client's IP address
 * @returns {string} - A consistent username for this IP
 */
const generateUsernameFromIP = (ipAddress) => {
  // Check cache first
  if (ipUsernameCache.has(ipAddress)) {
    return ipUsernameCache.get(ipAddress);
  }

  // Create a hash from the IP address for deterministic randomness
  const hash = crypto.createHash('sha256').update(ipAddress).digest('hex');
  
  // Convert hash to numbers for selection
  const hashNum1 = parseInt(hash.substr(0, 8), 16);
  const hashNum2 = parseInt(hash.substr(8, 8), 16);
  const hashNum3 = parseInt(hash.substr(16, 8), 16);
  
  // Select words based on hash
  const adjective = adjectives[hashNum1 % adjectives.length];
  const noun = nouns[hashNum2 % nouns.length];
  const number = (hashNum3 % 999) + 1;
  
  const username = `${adjective}${noun}${number}`;
  
  // Cache the result
  ipUsernameCache.set(ipAddress, username);
  
  return username;
};

/**
 * Get real IP address from request, considering proxies
 * @param {object} socket - Socket.IO socket object
 * @returns {string} - The real IP address
 */
const getRealIP = (socket) => {
  // Try to get real IP from various headers (for proxies/load balancers)
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  const realIP = socket.handshake.headers['x-real-ip'];
  const cfConnectingIP = socket.handshake.headers['cf-connecting-ip'];
  
  let ip = socket.handshake.address;
  
  if (cfConnectingIP) {
    ip = cfConnectingIP;
  } else if (realIP) {
    ip = realIP;
  } else if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    ip = forwarded.split(',')[0].trim();
  }
  
  // Handle IPv6 mapped IPv4 addresses
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  
  // Fallback for localhost
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    // For localhost, use a combination of user agent for uniqueness
    const userAgent = socket.handshake.headers['user-agent'] || 'unknown';
    ip = `localhost_${crypto.createHash('md5').update(userAgent).digest('hex').substr(0, 8)}`;
  }
  
  return ip;
};

/**
 * Clear username cache (for testing or admin purposes)
 */
const clearUsernameCache = () => {
  ipUsernameCache.clear();
};

/**
 * Get current cache size
 */
const getCacheSize = () => {
  return ipUsernameCache.size;
};

module.exports = {
  generateUsernameFromIP,
  getRealIP,
  clearUsernameCache,
  getCacheSize
};

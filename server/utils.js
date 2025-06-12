/**
 * Shared utility functions for the Bitcoin arbitrage application
 */

/**
 * Get current time in Japan timezone formatted as ISO string
 * @returns {string} Formatted timestamp in Japan timezone
 */
function getJapanTime() {
  return new Date().toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/\//g, '-').replace(/ /g, 'T');
}

/**
 * Validate and sanitize numeric input parameters
 * @param {string|number} value - The value to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum allowed value
 * @param {number} options.max - Maximum allowed value
 * @param {number} options.default - Default value if invalid
 * @returns {number} Validated numeric value
 */
function validateNumericParam(value, options = {}) {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, default: defaultValue = 0 } = options;
  
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  const parsed = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  
  if (isNaN(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid numeric parameter. Must be between ${min} and ${max}.`);
  }
  
  return parsed;
}

/**
 * Sleep for specified milliseconds (for testing and rate limiting)
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format number as Japanese Yen
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatJPY(amount) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Calculate percentage difference between two values
 * @param {number} value1 - First value
 * @param {number} value2 - Second value
 * @returns {number} Percentage difference
 */
function calculatePercentageDifference(value1, value2) {
  if (value1 === 0 || value2 === 0) return 0;
  return Math.abs((value1 - value2) / ((value1 + value2) / 2)) * 100;
}

module.exports = {
  getJapanTime,
  validateNumericParam,
  sleep,
  formatJPY,
  calculatePercentageDifference
};
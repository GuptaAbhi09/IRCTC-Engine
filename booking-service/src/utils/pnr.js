/**
 * Generates a unique 10-digit human-readable PNR number (e.g., 8420194821)
 */
const generatePNR = () => {
  const prefix = Math.floor(100 + Math.random() * 900); // 3-digit prefix (100-999)
  const suffix = Math.floor(1000001 + Math.random() * 8999999); // 7-digit suffix
  return `${prefix}${suffix}`;
};

module.exports = { generatePNR };

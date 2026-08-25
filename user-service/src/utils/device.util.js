const crypto = require('crypto');

/**
 * Extracts explicit client device ID or generates a device fingerprint from req context
 * @param {import('express').Request} req 
 * @returns {string} Unique device identifier
 */
const getDeviceId = (req) => {
  // 1. Check if client explicitly sent deviceId in header or body
  const clientDeviceId = req.headers['x-device-id'] || req.body?.deviceId;
  if (clientDeviceId) {
    return clientDeviceId;
  }

  // 2. Fingerprint fallback: Hash User-Agent + IP address
  const userAgent = req.headers['user-agent'] || 'unknown-agent';
  const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';

  return crypto.createHash('md5').update(`${userAgent}-${ip}`).digest('hex');
};

module.exports = {
  getDeviceId,
};

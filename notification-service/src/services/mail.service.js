const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: false,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

/**
 * Helper to pause execution for a given milliseconds duration
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends Email via Nodemailer with up to 3 automatic retry attempts
 * @param {string} to Receiver email address
 * @param {string} subject Email subject line
 * @param {string} html HTML body content
 * @param {number} maxRetries Maximum retry attempts (default 3)
 */
const sendEmailWithRetry = async (to, subject, html, maxRetries = 3) => {
  // Development mode fallback
  if (config.env === 'development' && (!config.smtp.user || config.smtp.user === 'your_email@gmail.com')) {
    logger.info(`[DEV MODE] Email to: ${to} | Subject: ${subject}`);
    return true;
  }

  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      await transporter.sendMail({
        from: config.smtp.from,
        to,
        subject,
        html,
      });
      logger.info(`Email successfully sent to ${to} (Attempt ${attempt}/${maxRetries})`);
      return true;
    } catch (error) {
      logger.warn(`Failed sending email to ${to} (Attempt ${attempt}/${maxRetries}): ${error.message}`);
      
      if (attempt === maxRetries) {
        logger.error(`CRITICAL: Exceeded maximum retry attempts (${maxRetries}) for email to ${to}`);
        throw new Error(`Failed to send email after ${maxRetries} attempts`);
      }

      // Exponential backoff delay: 1st retry after 1s, 2nd retry after 2s
      const delayMs = attempt * 1000;
      await sleep(delayMs);
    }
  }
};

module.exports = {
  sendEmailWithRetry,
};

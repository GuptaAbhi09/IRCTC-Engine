const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: config.smtp.user ? {
    user: config.smtp.user,
    pass: config.smtp.pass,
  } : undefined,
});

/**
 * Sends an email using Nodemailer or logs in console during development
 * @param {string} to 
 * @param {string} subject 
 * @param {string} html 
 */
const sendEmail = async (to, subject, html) => {
  try {
    // for development only
    if (config.env === 'development' && (!config.smtp.user || config.smtp.user === 'your_email@gmail.com')) {
      logger.info(`[DEV MODE] Email to: ${to} | Subject: ${subject}`);
      return true;
    }

    // production mode: send actual email
    await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
    });
    logger.info(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    throw new Error('Failed to send verification email');
  }
};

module.exports = {
  sendEmail,
};

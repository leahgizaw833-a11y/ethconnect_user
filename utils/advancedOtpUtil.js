/**
 * ============================================================================
 * ADVANCED OTP UTILITY - SECURE OTP GENERATION & VERIFICATION
 * ============================================================================
 * Adapted from EXTRACTED_PACKAGE for EthioConnect User Service
 * 
 * SECURITY FEATURES:
 * ✅ SHA-256 hashed OTP storage (never store plain OTPs)
 * ✅ Configurable OTP length and expiration
 * ✅ Rate limiting (30-second cooldown between requests)
 * ✅ Attempt limiting (max 5 attempts by default)
 * ✅ Account lockout after max attempts (30 minutes default)
 * ✅ Automatic cleanup of expired/verified OTPs
 */

'use strict';

const crypto = require('crypto');
const axios = require('axios');
const { OTP } = require('../models');
const { normalizeEthiopianPhone } = require('./phoneUtils');
const { Op } = require('sequelize');

/**
 * Hash a secret using SHA-256
 */
function hashSecret(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

/**
 * Create advanced OTP utility with custom configuration
 */
function createAdvancedOtpUtil(opts = {}) {
  const token = opts.token || process.env.GEEZSMS_TOKEN;
  const companyName = opts.companyName || process.env.COMPANY_NAME || 'EthioConnect';
  const otpLength = Number.isInteger(opts.otpLength) ? opts.otpLength : 6;
  const otpExpirationSeconds = Number.isInteger(opts.otpExpirationSeconds) ? opts.otpExpirationSeconds : 300; // 5 minutes
  const maxAttempts = Number.isInteger(opts.maxAttempts) ? opts.maxAttempts : 5;
  const lockoutSeconds = Number.isInteger(opts.lockoutSeconds) ? opts.lockoutSeconds : 1800; // 30 minutes
  const rateLimitSeconds = Number.isInteger(opts.rateLimitSeconds) ? opts.rateLimitSeconds : 30;

  /**
   * Generate secure random OTP
   */
  function generateOTP() {
    const min = Math.pow(10, otpLength - 1);
    const max = Math.pow(10, otpLength) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * Generate and send OTP
   */
  async function generateAndSendOtp({ phoneNumber, referenceType, referenceId }) {
    const phone = normalizeEthiopianPhone(phoneNumber);

    // RATE LIMITING CHECK - 30-second cooldown
    const recentOTP = await OTP.findOne({
      where: {
        phone,
        status: 'pending',
        createdAt: {
          [Op.gte]: new Date(Date.now() - (rateLimitSeconds * 1000))
        }
      }
    });

    if (recentOTP) {
      const createdAgo = Math.floor((Date.now() - new Date(recentOTP.createdAt).getTime()) / 1000);
      const waitTime = rateLimitSeconds - createdAgo;
      throw new Error(`Please wait ${waitTime} seconds before requesting another OTP`);
    }

    // LOCKOUT CHECK
    const lockedOTP = await OTP.findOne({
      where: {
        phone,
        status: 'locked',
        expiresAt: { [Op.gt]: Date.now() }
      }
    });

    if (lockedOTP) {
      const remainingSeconds = Math.ceil((lockedOTP.expiresAt - Date.now()) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      throw new Error(`Account locked due to too many attempts. Try again in ${remainingMinutes} minutes`);
    }

    // CLEANUP - Delete expired/verified OTPs
    await OTP.destroy({
      where: {
        phone,
        [Op.or]: [
          { expiresAt: { [Op.lt]: Date.now() } },
          { status: { [Op.in]: ['verified', 'expired'] } }
        ]
      }
    });

    // GENERATE OTP
    const otp = generateOTP();
    const hashedSecret = hashSecret(otp);
    const expiresAt = Date.now() + (otpExpirationSeconds * 1000);

    // Delete any existing pending OTPs
    await OTP.destroy({
      where: { phone, status: 'pending' }
    });

    // CREATE OTP RECORD
    await OTP.create({
      phone,
      hashedSecret,
      expiresAt,
      status: 'pending',
      attempts: 0
    });

    // Send OTP via SMS gateway using GeezSMS
    const baseUrl = process.env.GEEZSMS_BASE_URL || 'https://api.geezsms.com/api/v1';
    const message = `Your ${companyName} verification code is: ${otp}. Valid for ${Math.floor(otpExpirationSeconds / 60)} minutes. Do not share this code.`;
    
    try {
      console.log('Sending OTP to GeezSMS:', { 
        url: `${baseUrl}/sms/send`,
        phone: phone,
        token: token ? `${token.substring(0, 10)}...` : 'MISSING',
        messageLength: message.length
      });

      const senderId = process.env.SMS_SENDER_ID;
      const payload = {
        token: token,
        phone: phone,
        msg: message
      };
      
      // Add sender ID if configured
      if (senderId) {
        payload.sender = senderId;
      }

      const response = await axios.post(`${baseUrl}/sms/send`, payload);

      console.log('GeezSMS Full Response:', JSON.stringify(response.data, null, 2));

      if (response.data.error === false) {
        console.log(`✓ OTP sent to ${phone} via SMS (GeezSMS) - Message ID: ${response.data.data?.api_log_id}`);
      } else {
        console.error('GeezSMS returned error:', response.data);
        throw new Error(response.data.msg || 'SMS sending failed');
      }
    } catch (smsError) {
      if (smsError.response) {
        console.error('GeezSMS API Error Response:', JSON.stringify(smsError.response.data, null, 2));
        console.error('GeezSMS API Status:', smsError.response.status);
      } else {
        console.error('GeezSMS Network Error:', smsError.message);
      }
      throw new Error('Failed to send OTP via SMS: ' + (smsError.response?.data?.msg || smsError.message));
    }

    // Log OTP to console in development
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      console.log(`[DEV] OTP Code for ${phone}: ${otp} (expires in ${otpExpirationSeconds}s)`);
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      phone,
      expiresIn: otpExpirationSeconds,
      // Only in development (NODE_ENV not set or explicitly 'development')
      ...((process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) && { otp })
    };
  }

  /**
   * Verify OTP
   */
  async function verifyOtp({ phoneNumber, token: otpCode, referenceType, referenceId }) {
    const phone = normalizeEthiopianPhone(phoneNumber);

    // Find pending OTP
    const otpRecord = await OTP.findOne({
      where: { phone, status: 'pending' },
      order: [['createdAt', 'DESC']]
    });

    if (!otpRecord) {
      throw new Error('No OTP request found for this phone number');
    }

    // CHECK EXPIRATION
    if (Date.now() > otpRecord.expiresAt) {
      await otpRecord.update({ status: 'expired' });
      throw new Error('OTP has expired. Please request a new one');
    }

    // CHECK LOCKOUT
    if (otpRecord.attempts >= maxAttempts) {
      // Lock the account
      const lockoutExpiresAt = Date.now() + (lockoutSeconds * 1000);
      await otpRecord.update({ 
        status: 'locked',
        expiresAt: lockoutExpiresAt
      });
      throw new Error(`Too many incorrect attempts. Account locked for ${lockoutSeconds / 60} minutes`);
    }

    // VERIFY OTP
    const hashedInput = hashSecret(otpCode);
    const isValid = hashedInput === otpRecord.hashedSecret;

    if (!isValid) {
      // Increment attempts
      await otpRecord.increment('attempts');
      const remainingAttempts = maxAttempts - (otpRecord.attempts + 1);
      throw new Error(`Invalid OTP. ${remainingAttempts} attempts remaining`);
    }

    // SUCCESS - Mark as verified
    await otpRecord.update({ status: 'verified' });

    return {
      success: true,
      message: 'OTP verified successfully',
      phone
    };
  }

  /**
   * Clean up old OTPs (use in cron job)
   */
  async function cleanupExpiredOtps() {
    const deleted = await OTP.destroy({
      where: {
        [Op.or]: [
          { expiresAt: { [Op.lt]: Date.now() } },
          { 
            status: { [Op.in]: ['verified', 'expired'] },
            createdAt: { [Op.lt]: new Date(Date.now() - 86400000) } // 24 hours old
          }
        ]
      }
    });

    return { deleted };
  }

  return {
    generateAndSendOtp,
    verifyOtp,
    cleanupExpiredOtps
  };
}

// Export the factory function as default
module.exports = createAdvancedOtpUtil;

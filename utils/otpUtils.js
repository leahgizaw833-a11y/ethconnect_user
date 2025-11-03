const crypto = require('crypto');
const { sendSms } = require('./smsService');
const { normalizePhone, isValidPhone } = require('./phoneUtils');

function defaultOptions() {
  return {
    otpLength: 6,
    otpExpirationSeconds: 300,
    maxAttempts: 3,
    lockoutSeconds: 1800,
    companyName: process.env.COMPANY_NAME || 'App',
    requestCooldownSeconds: 30
  };
}

function hashSecret(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function digitsOnly(e164) {
  return String(e164).replace(/\D/g, '');
}

function nowMs() {
  return Date.now();
}

/**
 * createAdvancedOtpUtil(opts)
 * Uses models.Otp (Sequelize) when available; falls back to in-memory Map otherwise.
 */
function createAdvancedOtpUtil(opts = {}) {
  const cfg = { ...defaultOptions(), ...opts };

  // In-memory fallback store (key -> { hashedSecret, expiresAt, attempts, lockedUntil, phoneNumber, createdAt })
  const store = new Map();

  // Try to require models lazily — avoid top-level circular requires
  let models = null;
  let Sequelize = null;
  try {
    const m = require('../models');
    models = m && m.Otp ? m : null;
    // Sequelize.Op may be required
    Sequelize = require('sequelize');
  } catch (e) {
    models = null;
    Sequelize = null;
  }

  function _key(referenceType, referenceId) {
    return `${referenceType}:${referenceId}`;
  }

  function _generateCode(len = cfg.otpLength) {
    const min = 10 ** (len - 1);
    const max = 10 ** len - 1;
    const n = Math.floor(min + Math.random() * (max - min + 1));
    return String(n).padStart(len, '0');
  }

  // Internal helper to persist OTP in DB
  async function _dbCreateOtp({ phoneDigits, hashedSecret, expiresAt, referenceType, referenceId }) {
    // models expected shape: Otp with fields phone, hashedSecret, expiresAt, attempts, status, referenceType, referenceId, createdAt
    return models.Otp.create({
      phone: phoneDigits,
      hashedSecret,
      expiresAt,
      attempts: 0,
      status: 'pending',
      referenceType,
      referenceId
    });
  }

  // Internal helper to find pending OTP in DB
  async function _dbFindPending({ phoneDigits, referenceType, referenceId }) {
    const Op = Sequelize.Op;
    return models.Otp.findOne({
      where: {
        phone: phoneDigits,
        referenceType,
        referenceId,
        status: 'pending',
        expiresAt: { [Op.gt]: nowMs() }
      },
      order: [['createdAt', 'DESC']]
    });
  }

  // Internal cleanup for expired/old OTPs in DB
  async function _dbCleanup(phoneDigits, referenceType, referenceId) {
    const Op = Sequelize.Op;
    return models.Otp.destroy({
      where: {
        phone: phoneDigits,
        referenceType,
        referenceId,
        [Op.or]: [
          { expiresAt: { [Op.lt]: nowMs() } },
          { status: { [Op.in]: ['verified', 'expired'] } }
        ]
      }
    });
  }

  // Public API: generateAndSendOtp
  async function generateAndSendOtp({ referenceType, referenceId, phoneNumber, message }) {
    if (!referenceType || typeof referenceId === 'undefined' || referenceId === null) {
      throw new Error('referenceType and referenceId required');
    }

    // Normalize and validate phone if provided
    let phoneE164 = null;
    let phoneDigits = null;
    if (phoneNumber) {
      if (!isValidPhone(phoneNumber)) throw new Error('Invalid phone number');
      phoneE164 = normalizePhone(phoneNumber);
      phoneDigits = digitsOnly(phoneE164);
    }

    // If DB models available, use DB flows (rate-limit, lockout, cleanup)
    if (models && models.Otp) {
      // If phone not provided, cannot create OTP tied to phone in DB
      if (!phoneDigits) throw new Error('phoneNumber is required when using DB-backed OTP');

      // Rate-limit / cooldown: if a pending OTP created recently (< requestCooldownSeconds), deny
      const existing = await _dbFindPending({ phoneDigits, referenceType, referenceId });
      if (existing) {
        const createdAtMs = existing.createdAt ? new Date(existing.createdAt).getTime() : null;
        if (createdAtMs) {
          const ageSec = (nowMs() - createdAtMs) / 1000;
          if (ageSec < cfg.requestCooldownSeconds) {
            throw new Error(`Please wait ${Math.ceil(cfg.requestCooldownSeconds - ageSec)} seconds before requesting another OTP`);
          }
        }
        // remove the old pending and continue (to allow refresh)
        await existing.destroy();
      }

      // Check locked status
      const locked = await models.Otp.findOne({
        where: {
          phone: phoneDigits,
          referenceType,
          referenceId,
          status: 'locked',
          expiresAt: { [Sequelize.Op.gt]: nowMs() }
        }
      });
      if (locked) {
        const remaining = Math.ceil((locked.expiresAt - nowMs()) / 1000);
        throw new Error(`Account locked. Try again in ${remaining} seconds`);
      }

      // Cleanup old entries
      await _dbCleanup(phoneDigits, referenceType, referenceId);

      // Generate
      const code = _generateCode();
      const hashedSecret = hashSecret(code);
      const expiresAt = nowMs() + cfg.otpExpirationSeconds * 1000;

      // Persist
      await _dbCreateOtp({ phoneDigits, hashedSecret, expiresAt, referenceType, referenceId });

      // Send SMS
      const smsMessage = message || `${cfg.companyName} verification code: ${code}`;
      let sendResult = { success: false, info: null, used: null };
      try {
        const resp = await sendSms(phoneE164, smsMessage);
        sendResult = { success: !!resp.success, info: resp.info, used: resp.used || null };
      } catch (err) {
        sendResult = { success: false, info: err.message || String(err) };
      }

      // Return: never reveal code in production
      const respObj = {
        success: true,
        message: 'OTP generated',
        referenceType,
        referenceId,
        sent: !!sendResult.success,
        expiresIn: cfg.otpExpirationSeconds
      };
      if (sendResult.used) respObj.sentPayload = sendResult.used;
      if (sendResult.info) respObj.providerInfo = sendResult.info;
      return respObj;
    }

    // Fall back to in-memory store
    const key = _key(referenceType, referenceId);
    const now = nowMs();

    // Rate-limit
    const existingRec = store.get(key);
    if (existingRec) {
      const ageSec = (now - (existingRec.createdAt || now)) / 1000;
      if (ageSec < cfg.requestCooldownSeconds) {
        throw new Error(`Please wait ${Math.ceil(cfg.requestCooldownSeconds - ageSec)} seconds before requesting another OTP`);
      }
    }

    // Generate and store hashed secret
    const code = _generateCode();
    const hashedSecret = hashSecret(code);
    const rec = {
      hashedSecret,
      expiresAt: now + cfg.otpExpirationSeconds * 1000,
      attempts: 0,
      lockedUntil: 0,
      phoneNumber: phoneE164 || null,
      createdAt: now
    };
    store.set(key, rec);

    // send sms
    const smsMessage = message || `${cfg.companyName} verification code: ${code}`;
    let sendResult = { success: false, info: null, used: null };
    if (phoneE164) {
      try {
        const resp = await sendSms(phoneE164, smsMessage);
        sendResult = { success: !!resp.success, info: resp.info, used: resp.used || null };
      } catch (err) {
        sendResult = { success: false, info: err.message || String(err) };
      }
    }

    const resp = { success: true, message: 'OTP generated', referenceType, referenceId, sent: !!sendResult.success, expiresIn: cfg.otpExpirationSeconds };
    if (sendResult.used) resp.sentPayload = sendResult.used;
    if (sendResult.info) resp.providerInfo = sendResult.info;
    return resp;
  }

  // Public API: verifyOtp
  async function verifyOtp({ referenceType, referenceId, token }) {
    if (!referenceType || typeof referenceId === 'undefined' || referenceId === null || !token) {
      throw new Error('referenceType, referenceId and token required');
    }

    // DB-backed flow
    if (models && models.Otp) {
      const phoneDigits = null; // DB lookup uses referenceType+referenceId scope
      // find pending OTP
      const Op = Sequelize.Op;
      const otp = await models.Otp.findOne({
        where: {
          referenceType,
          referenceId,
          status: 'pending'
        },
        order: [['createdAt', 'DESC']]
      });
      if (!otp) throw new Error('No valid OTP found');

      // Check locked
      if (otp.status === 'locked' && otp.expiresAt > nowMs()) {
        const remaining = Math.ceil((otp.expiresAt - nowMs()) / 1000);
        throw new Error(`Too many attempts. Account locked for ${Math.ceil(cfg.lockoutSeconds / 60)} minutes (try again in ${remaining} seconds)`);
      }

      // Expiry
      if (nowMs() > otp.expiresAt) {
        await otp.update({ status: 'expired' });
        throw new Error('OTP has expired');
      }

      // Increment attempts
      await otp.increment('attempts');
      const currentAttempts = (otp.attempts || 0) + 1; // incremented above, DB returns new value on instance sometimes; safe to use attempts+1

      const isValid = hashSecret(String(token)) === otp.hashedSecret;
      if (isValid) {
        await otp.update({ status: 'verified' });
        // Optionally remove older otps for that phone/ref
        await models.Otp.destroy({
          where: {
            referenceType,
            referenceId
          }
        });
        return { success: true, message: 'OTP verified successfully' };
      }

      // wrong code
      if (currentAttempts >= cfg.maxAttempts) {
        await otp.update({ status: 'locked', expiresAt: nowMs() + cfg.lockoutSeconds * 1000 });
        throw new Error(`Too many attempts. Account locked for ${Math.ceil(cfg.lockoutSeconds / 60)} minutes`);
      }

      // persist attempts incremented
      throw new Error('Invalid OTP');
    }

    // In-memory fallback verify
    const key = _key(referenceType, referenceId);
    const rec = store.get(key);
    const now = nowMs();
    if (!rec) throw new Error('OTP not found or expired');
    if (rec.lockedUntil && now < rec.lockedUntil) throw new Error('Too many attempts, temporarily locked');
    if (now > rec.expiresAt) {
      store.delete(key);
      throw new Error('OTP expired');
    }

    rec.attempts = (rec.attempts || 0) + 1;
    if (hashSecret(String(token)) === rec.hashedSecret) {
      store.delete(key);
      return { success: true, message: 'OTP verified successfully' };
    }

    if (rec.attempts >= cfg.maxAttempts) {
      rec.lockedUntil = now + cfg.lockoutSeconds * 1000;
      store.set(key, rec);
      throw new Error('Maximum attempts exceeded, account locked temporarily');
    }

    store.set(key, rec);
    throw new Error('Invalid OTP');
  }

  return { generateAndSendOtp, verifyOtp, _store: store, _cfg: cfg };
}

// Backwards-compatible exports
module.exports = createAdvancedOtpUtil;
module.exports.createAdvancedOtpUtil = createAdvancedOtpUtil;

const { User, Profile } = require('../models');
const { isValidPhone, normalizePhone } = require('../utils/phoneUtils');
const bcrypt = require('bcryptjs');
const createAdvancedOtpUtil = require('../utils/otpUtils');
const { signAccessToken, signRefreshToken, verify } = require('../utils/jwtUtils');
const Sequelize = require('sequelize');
const fs = require('fs');
const path = require('path');

// initialize OTP util once
const otpUtil = createAdvancedOtpUtil({
  otpLength: Number(process.env.OTP_LENGTH) || 6,
  otpExpirationSeconds: Number(process.env.OTP_EXPIRATION_SECONDS) || 300,
  maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 3,
  lockoutSeconds: Number(process.env.OTP_LOCKOUT_SECONDS) || 1800,
  companyName: process.env.COMPANY_NAME || 'EthioConnect'
});

class AuthController {

  generateTokens(user) {
    const accessToken = signAccessToken(
      { id: user.id, username: user.username, email: user.email, phone: user.phone, authProvider: user.authProvider }
    );

    const refreshToken = signRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  async register(req, res) {
    try {
      const { username, email, phone, password, authProvider = 'password' } = req.body;
      if (!password) return res.status(400).json({ success: false, message: 'Password is required' });
      if (phone && !isValidPhone(phone)) return res.status(400).json({ success: false, message: 'Invalid phone number' });

      const normalizedPhone = phone ? normalizePhone(phone) : null;

      const existingUser = await User.findOne({
        where: {
          [Sequelize.Op.or]: [
            username ? { username } : null,
            email ? { email } : null,
            normalizedPhone ? { phone: normalizedPhone } : null
          ].filter(Boolean)
        }
      });

      if (existingUser) {
        const field = existingUser.username === username ? 'Username' :
                      existingUser.email === email ? 'Email' : 'Phone number';
        return res.status(400).json({ success: false, message: `${field} is already taken.` });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({ username: username || null, email: email || null, phone: normalizedPhone, passwordHash, authProvider, isVerified: false, status: 'active' });
      await Profile.create({ userId: user.id, fullName: null });

      const tokens = this.generateTokens(user);
      const userData = user.toJSON();
      delete userData.passwordHash;

      res.status(201).json({ success: true, message: 'User registered successfully', user: userData, ...tokens });

    } catch (error) {
      console.error('Registration error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0].path;
        return res.status(400).json({ success: false, message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken.` });
      }
      res.status(400).json({ success: false, message: error.message || 'Registration failed' });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
      if (user.status !== 'active') return res.status(403).json({ success: false, message: 'Account inactive or suspended' });

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Invalid email or password' });

      await user.update({ lastLogin: new Date() });
      const tokens = this.generateTokens(user);
      const userData = user.toJSON();
      delete userData.passwordHash;

      res.json({ success: true, message: 'Login successful', user: userData, ...tokens });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  }

  async loginWithToken(req, res) {
    try {
      const { phone, token } = req.body;
      const normalizedPhone = normalizePhone(phone);
      console.log('Normalized phone:', normalizedPhone);

      const user = await User.findOne({ where: { phone: normalizedPhone } });
      if (!user) {
        console.log('User not found for phone:', normalizedPhone);
        return res.status(404).json({ success: false, message: 'No account found for this phone' });
      }

      let payload;
      try {
        payload = verify(token);
        console.log('Token payload:', payload);
      } catch (err) {
        console.error('Token verification failed:', err.message);
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
      }

      if (payload.id !== user.id) {
        console.log('Token ID does not match user ID:', payload.id, user.id);
        return res.status(401).json({ success: false, message: 'Token does not belong to this user' });
      }

      const tokens = this.generateTokens(user);
      console.log('Generated tokens:', tokens);

      const userData = user.toJSON();
      delete userData.passwordHash;

      res.json({ success: true, message: 'Login with token successful', user: userData, ...tokens });

    } catch (error) {
      console.error('Token login error:', error);
      res.status(500).json({ success: false, message: 'Token login failed' });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });

      let payload;
      try {
        payload = verify(refreshToken);
      } catch { return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' }); }

      if (payload.type !== 'refresh') return res.status(400).json({ success: false, message: 'Invalid token type' });

      const user = await User.findByPk(payload.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const tokens = this.generateTokens(user);
      const userData = user.toJSON();
      delete userData.passwordHash;

      res.json({ success: true, message: 'Access token refreshed', user: userData, ...tokens });

    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ success: false, message: 'Refresh token failed' });
    }
  }

  async getCurrentUser(req, res) {
    try {
      const user = await User.findByPk(req.user.id, { attributes: { exclude: ['passwordHash'] }, include: [{ model: Profile, as: 'profile' }] });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, data: { user } });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve user' });
    }
  }

  async checkUsername(req, res) {
    try {
      const { username } = req.params;
      const user = await User.findOne({ where: { username } });
      res.json({ success: true, available: !user });
    } catch (error) {
      console.error('Check username error:', error);
      res.status(500).json({ success: false, message: 'Failed to check username' });
    }
  }

  /**
   * Search users
   */
  async searchUsers(req, res) {
    try {
      const { q, limit = 10, offset = 0 } = req.query;
      const users = await User.findAll({
        where: {
          [Sequelize.Op.or]: [
            { username: { [Sequelize.Op.like]: `%${q}%` } },
            { email: { [Sequelize.Op.like]: `%${q}%` } },
            { phone: { [Sequelize.Op.like]: `%${q}%` } }
          ]
        },
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search users',
        error: error.message
      });
    }
  }

  // --- Added missing methods so userRoutes can bind to them ---

  async getUserById(req, res) {
    try {
      const { userId } = req.params;
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['passwordHash'] },
        include: [{ model: Profile, as: 'profile' }]
      });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, data: { user } });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ success: false, message: 'Failed to get user', error: error.message });
    }
  }

  async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      const allowed = ['active', 'inactive', 'suspended'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const user = await User.findByPk(userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      user.status = status;
      await user.save();

      const userData = user.toJSON();
      delete userData.passwordHash;

      res.json({ success: true, message: 'User status updated', data: { user: userData } });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({ success: false, message: 'Failed to update user status', error: error.message });
    }
  }

  async getUserStats(req, res) {
    try {
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { status: 'active' } });
      const inactiveUsers = await User.count({ where: { status: 'inactive' } });
      const suspendedUsers = await User.count({ where: { status: 'suspended' } });

      res.json({
        success: true,
        data: { totalUsers, activeUsers, inactiveUsers, suspendedUsers }
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ success: false, message: 'Failed to get user statistics', error: error.message });
    }
  }

  /**
   * Request OTP — creates user if needed and delegates to otp util.
   */
  async requestOTP(req, res) {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });
      if (!isValidPhone(phone)) return res.status(400).json({ success: false, message: 'Invalid phone number' });

      const normalizedPhone = normalizePhone(phone);
      let user = await User.findOne({ where: { phone: normalizedPhone } });

      if (!user) {
        const randomPassword = Math.random().toString(36).slice(2, 12) + '!A1';
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        user = await User.create({ username: null, phone: normalizedPhone, passwordHash: hashedPassword, authProvider: 'phone', status: 'active', isVerified: false });
        await Profile.create({ userId: user.id, fullName: null });
      }

      // Use OTP util to generate and send the OTP (stores only hashed secret)
      const otpResult = await otpUtil.generateAndSendOtp({ referenceType: 'User', referenceId: user.id, phoneNumber: normalizedPhone });

      // Persist attempt for diagnostics (provider info may be present in non-prod)
      try {
        const logsDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
        const logPath = path.join(logsDir, 'sms_attempts.log');
        const entry = { ts: new Date().toISOString(), userId: user.id, phone: normalizedPhone, otpResult };
        fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
      } catch (logErr) {
        console.error('Failed to write SMS attempt log:', logErr);
      }

      // Response: do not expose OTP code in production
      const resp = { success: true, message: 'OTP generated', sent: !!otpResult.sent };
      if ((process.env.NODE_ENV || '').toLowerCase() !== 'production') {
        resp.providerInfo = otpResult.providerInfo || otpResult.providerInfo; // may be undefined
      }

      return res.status(200).json(resp);
    } catch (error) {
      console.error('Request OTP error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to send OTP' });
    }
  }

  /**
   * Verify OTP — delegate verification to otp util, update user and issue tokens.
   */
  async verifyOTP(req, res) {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP required' });

      const normalizedPhone = normalizePhone(phone);
      const user = await User.findOne({ where: { phone: normalizedPhone } });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      // Verify via OTP util (throws on failure)
      await otpUtil.verifyOtp({ referenceType: 'User', referenceId: user.id, token: otp });

      // Mark verified and update last login
      await user.update({ isVerified: true, lastLogin: new Date() });

      const accessToken = signAccessToken({ id: user.id, username: user.username, email: user.email, phone: user.phone, authProvider: user.authProvider });
      const refreshToken = signRefreshToken(user.id);

      const userData = user.toJSON();
      delete userData.passwordHash;

      res.status(200).json({ success: true, message: 'OTP verified, account activated', user: userData, accessToken, refreshToken });
    } catch (error) {
      console.error('Verify OTP error:', error);
      const msg = error.message || 'Failed to verify OTP';
      // map some otp util messages to status codes (rate limit / locked)
      if (msg.toLowerCase().includes('locked') || msg.toLowerCase().includes('attempts')) {
        return res.status(429).json({ success: false, message: msg });
      }
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('not found')) {
        return res.status(400).json({ success: false, message: msg });
      }
      return res.status(400).json({ success: false, message: msg });
    }
  }

  /**
   * Login with OTP (verify then sign-in)
   */
  async loginWithOtp(req, res) {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP required' });

      const normalizedPhone = normalizePhone(phone);
      const user = await User.findOne({ where: { phone: normalizedPhone } });
      if (!user) return res.status(404).json({ success: false, message: 'No account found' });

      // verify OTP
      await otpUtil.verifyOtp({ referenceType: 'User', referenceId: user.id, token: otp });

      // update user
      await user.update({ isVerified: true, lastLogin: new Date() });

      const accessToken = signAccessToken({ id: user.id, username: user.username, email: user.email, phone: user.phone, authProvider: user.authProvider });
      const refreshToken = signRefreshToken(user.id);

      const userData = user.toJSON();
      delete userData.passwordHash;

      res.json({ success: true, message: 'Login with OTP successful', user: userData, accessToken, refreshToken });
    } catch (error) {
      console.error('OTP Login error:', error);
      const msg = error.message || 'OTP login failed';
      if (msg.toLowerCase().includes('locked') || msg.toLowerCase().includes('attempts')) {
        return res.status(429).json({ success: false, message: msg });
      }
      return res.status(400).json({ success: false, message: msg });
    }
  }

  /**
   * Resend OTP — re-generate and send OTP for an existing user
   */
  async resendOTP(req, res) {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });
      if (!isValidPhone(phone)) return res.status(400).json({ success: false, message: 'Invalid phone number' });

      const normalizedPhone = normalizePhone(phone);
      const user = await User.findOne({ where: { phone: normalizedPhone } });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const otpResult = await otpUtil.generateAndSendOtp({ referenceType: 'User', referenceId: user.id, phoneNumber: normalizedPhone });

      // Persist attempt for diagnostics
      try {
        const logsDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
        const logPath = path.join(logsDir, 'sms_attempts.log');
        const entry = { ts: new Date().toISOString(), action: 'resend', userId: user.id, phone: normalizedPhone, otpResult };
        fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
      } catch (logErr) {
        console.error('Failed to write SMS resend log:', logErr);
      }

      const resp = { success: true, message: 'OTP resent', sent: !!otpResult.sent };
      if ((process.env.NODE_ENV || '').toLowerCase() !== 'production' && otpResult.providerInfo) {
        resp.providerInfo = otpResult.providerInfo;
        if (otpResult.sentPayload) resp.sentPayload = otpResult.sentPayload;
      }

      return res.status(200).json(resp);
    } catch (error) {
      console.error('Resend OTP error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to resend OTP' });
    }
  }

}

module.exports = new AuthController();
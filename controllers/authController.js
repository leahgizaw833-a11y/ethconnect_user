const { User, Profile, Role, UserRole } = require('../models');
const { isValidPhone, normalizePhone } = require('../utils/phoneUtils');
const bcrypt = require('bcryptjs');
const createAdvancedOtpUtil = require('../utils/advancedOtpUtil');
const { signAccessToken, signRefreshToken, verify } = require('../utils/jwtUtils');
const Sequelize = require('sequelize');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

// initialize OTP util once
const otpUtil = createAdvancedOtpUtil({
  otpLength: Number(process.env.OTP_LENGTH) || 6,
  otpExpirationSeconds: Number(process.env.OTP_EXPIRATION_SECONDS) || 300,
  maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
  lockoutSeconds: Number(process.env.OTP_LOCKOUT_SECONDS) || 1800,
  companyName: process.env.COMPANY_NAME || 'EthioConnect',
  rateLimitSeconds: Number(process.env.OTP_REQUEST_COOLDOWN_SECONDS) || 30
});

/**
 * Generate JWT tokens with full user and profile information
 */
async function generateTokens(user, profile = null) {
    // Fetch profile if not provided
    if (!profile) {
      profile = await Profile.findOne({ where: { userId: user.id } });
    }

    // Fetch user roles
    const userRoles = await UserRole.findAll({
      where: { userId: user.id },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['name']
      }]
    });

    const roles = userRoles.map(ur => ur.role.name);

    // Create comprehensive token payload
    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      authProvider: user.authProvider,
      isVerified: user.isVerified,
      status: user.status,
      roles: roles,
      profile: profile ? {
        fullName: profile.fullName,
        profession: profile.profession,
        verificationStatus: profile.verificationStatus,
        photoUrl: profile.photoUrl,
        bio: profile.bio
      } : null
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(user.id);

    logger.info('Tokens generated', { userId: user.id, username: user.username });

    return { accessToken, refreshToken };
  }

async function register(req, res) {
    try {
      const { username, email, phone, password, role, authProvider = 'password' } = req.body;
      
      // Validate required fields
      if (!username) return res.status(400).json({ success: false, message: 'Username is required' });
      if (!password) return res.status(400).json({ success: false, message: 'Password is required' });
      if (phone && !isValidPhone(phone)) return res.status(400).json({ success: false, message: 'Invalid phone number' });

      const normalizedPhone = phone ? normalizePhone(phone) : null;

      // Check for existing user
      const existingUser = await User.findOne({
        where: {
          [Sequelize.Op.or]: [
            { username },
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

      // Hash password and create user
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({ 
        username, 
        email: email || null, 
        phone: normalizedPhone, 
        passwordHash, 
        authProvider, 
        isVerified: false, 
        status: 'active' 
      });

      // Create profile
      await Profile.create({ userId: user.id });

      // Assign role if provided (exclude admin role from public registration)
      if (role) {
        // Prevent users from registering with admin role
        if (role === 'admin') {
          logger.warn('Attempted admin registration blocked', {
            username: username,
            email: email
          });
          return res.status(403).json({ 
            success: false, 
            message: 'Cannot register with admin role. Admin accounts must be created by existing admins.' 
          });
        }

        const roleRecord = await Role.findOne({ where: { name: role } });
        if (roleRecord) {
          await UserRole.create({ userId: user.id, roleId: roleRecord.id });
        } else {
          // Create role if it doesn't exist (for employer, employee, doctor, user)
          const validRoles = ['employer', 'employee', 'doctor', 'user'];
          if (validRoles.includes(role)) {
            const newRole = await Role.create({ name: role });
            await UserRole.create({ userId: user.id, roleId: newRole.id });
          }
        }
      }

      const tokens = await generateTokens(user);
      const userData = user.toJSON();
      delete userData.passwordHash;

      logger.info('User registered successfully', {
        userId: user.id,
        username: user.username,
        email: user.email
      });

      res.status(201).json({ 
        success: true, 
        message: 'User registered successfully', 
        data: {
          user: userData, 
          accessToken: tokens.accessToken
        }
      });

    } catch (error) {
      logger.error('Registration error', {
        error: error.message,
        stack: error.stack
      });
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0].path;
        return res.status(400).json({ success: false, message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken.` });
      }
      res.status(400).json({ success: false, message: error.message || 'Registration failed' });
    }
  }

async function login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
      if (user.status !== 'active') return res.status(403).json({ success: false, message: 'Account inactive or suspended' });

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Invalid email or password' });

      await user.update({ lastLogin: new Date() });
      
      // Get user roles
      const userRoles = await UserRole.findAll({
        where: { userId: user.id },
        include: [{
          model: Role,
          as: 'role',
          attributes: ['id', 'name']
        }]
      });

      const tokens = await generateTokens(user);
      const userData = user.toJSON();
      delete userData.passwordHash;
      
      // Add roles to user data
      userData.roles = userRoles.map(ur => ur.role.name);

      logger.info('User login successful', {
        userId: user.id,
        username: user.username,
        email: user.email
      });

      res.json({ 
        success: true, 
        message: 'Login successful', 
        data: {
          user: userData,
          accessToken: tokens.accessToken
        }
      });

    } catch (error) {
      logger.error('Login error', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  }

async function loginWithToken(req, res) {
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

      const tokens = generateTokens(user);
      console.log('Generated tokens:', tokens);

      const userData = user.toJSON();
      delete userData.passwordHash;

      res.json({ success: true, message: 'Login with token successful', user: userData, ...tokens });

    } catch (error) {
      console.error('Token login error:', error);
      res.status(500).json({ success: false, message: 'Token login failed' });
    }
  }

async function refreshToken(req, res) {
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

      const tokens = generateTokens(user);
      const userData = user.toJSON();
      delete userData.passwordHash;

      res.json({ success: true, message: 'Access token refreshed', user: userData, ...tokens });

    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ success: false, message: 'Refresh token failed' });
    }
  }

async function getCurrentUser(req, res) {
    try {
      const user = await User.findByPk(req.user.id, { attributes: { exclude: ['passwordHash'] }, include: [{ model: Profile, as: 'profile' }] });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, data: { user } });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve user' });
    }
  }

/**
 * Admin login - checks if user has admin role
 */
async function adminLogin(req, res) {
  try {
    console.log('Admin login attempt:', req.body.email);
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check user status
    if (user.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Account inactive or suspended' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if user has admin role
    const userRoles = await UserRole.findAll({
      where: { userId: user.id },
      include: [{
        model: Role,
        as: 'role',
        where: { name: 'admin' }
      }]
    });

    if (!userRoles || userRoles.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate tokens
    const tokens = await generateTokens(user);
    const userData = user.toJSON();
    delete userData.passwordHash;

    // Add roles to response
    userData.roles = userRoles.map(ur => ur.role.name);

    logger.info('Admin login successful', {
      adminId: user.id,
      username: user.username,
      email: user.email
    });

    res.json({ 
      success: true, 
      message: 'Admin login successful', 
      data: {
        user: userData,
        accessToken: tokens.accessToken
      }
    });

  } catch (error) {
    logger.error('Admin login error', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Create a new admin user (admin only)
 */
async function createAdmin(req, res) {
  try {
    const { username, email, password, phone } = req.body;

    logger.info('Create admin request', {
      adminId: req.user.id,
      newAdminUsername: username
    });

    // Validate required fields
    if (!username) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username is required' 
      });
    }
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    if (!password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required' 
      });
    }

    const normalizedPhone = phone ? normalizePhone(phone) : null;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Sequelize.Op.or]: [
          { username },
          { email },
          normalizedPhone ? { phone: normalizedPhone } : null
        ].filter(Boolean)
      }
    });

    if (existingUser) {
      const field = existingUser.username === username ? 'Username' :
                    existingUser.email === email ? 'Email' : 'Phone number';
      return res.status(400).json({ 
        success: false, 
        message: `${field} is already taken` 
      });
    }

    // Get or create admin role
    let adminRole = await Role.findOne({ where: { name: 'admin' } });
    if (!adminRole) {
      adminRole = await Role.create({ name: 'admin' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const adminUser = await User.create({
      username,
      email,
      phone: normalizedPhone,
      passwordHash,
      authProvider: 'password',
      isVerified: true,
      status: 'active'
    });

    // Create profile
    await Profile.create({ userId: adminUser.id });

    // Assign admin role
    await UserRole.create({
      userId: adminUser.id,
      roleId: adminRole.id
    });

    // Remove password from response
    const userResponse = adminUser.toJSON();
    delete userResponse.passwordHash;
    userResponse.roles = ['admin'];

    logger.info('Admin user created successfully', {
      adminId: adminUser.id,
      username: adminUser.username,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: { user: userResponse }
    });

  } catch (error) {
    logger.error('Create admin error', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0].path;
      return res.status(400).json({ 
        success: false, 
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken` 
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: error.message
    });
  }
}



  // --- Added missing methods so userRoutes can bind to them ---

async function getUserById(req, res) {
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


async function getUserStats(req, res) {
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
 * Get all users with userId and roleId (admin only)
 */
async function getAllUsers(req, res) {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'phone', 'status', 'isVerified', 'createdAt'],
      include: [{
        model: UserRole,
        as: 'userRoles',
        attributes: ['roleId'],
        include: [{
          model: Role,
          as: 'role',
          attributes: ['id', 'name']
        }]
      }]
    });

    // Format the response to include userId and roleId
    const formattedUsers = users.map(user => {
      const userData = user.toJSON();
      return {
        userId: userData.id,
        username: userData.username,
        email: userData.email,
        phone: userData.phone,
        status: userData.status,
        isVerified: userData.isVerified,
        createdAt: userData.createdAt,
        roles: userData.userRoles.map(ur => ({
          roleId: ur.roleId,
          roleName: ur.role.name
        }))
      };
    });

    logger.info('All users retrieved', {
      adminId: req.user.id,
      totalUsers: formattedUsers.length
    });

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: formattedUsers,
        total: formattedUsers.length
      }
    });
  } catch (error) {
    logger.error('Get all users error', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
}

  /**
   * Request OTP — creates user if needed and delegates to otp util.
   */
async function requestOTP(req, res) {
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

      // Response aligned with OTP guide and SMS message
      const resp = {
        success: true,
        message: 'OTP sent successfully',
        phoneNumber: normalizedPhone,
        expiresIn: otpResult.expiresIn || Number(process.env.OTP_EXPIRATION_SECONDS) || 300
      };
			return res.status(200).json(resp);
		} catch (error) {
			console.error('Request OTP error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to send OTP' });
		}
	}

  /**
   * Verify OTP — delegate verification to otp util, update user and issue tokens.
   */
async function verifyOTP(req, res) {
		try {
			const { phone, otp } = req.body;
			if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP required' });

			const normalizedPhone = normalizePhone(phone);
			const user = await User.findOne({ 
        where: { phone: normalizedPhone },
        include: [{ model: Profile, as: 'profile' }]
      });
			if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      // Verify via OTP util (throws on failure)
      await otpUtil.verifyOtp({ referenceType: 'User', referenceId: user.id, token: otp, phoneNumber: normalizedPhone });

      // Mark verified and update last login
				await user.update({ isVerified: true, lastLogin: new Date() });

				const accessToken = signAccessToken({ id: user.id, username: user.username, email: user.email, phone: user.phone, authProvider: user.authProvider });
				const refreshToken = signRefreshToken(user.id);

      const userData = {
        id: user.id,
        phone: user.phone,
        name: user.profile?.fullName || user.username || null
      };

      res.status(200).json({ 
        success: true, 
        message: 'OTP verified successfully', 
        data: {
          accessToken,
          refreshToken,
          user: userData
        }
      });
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
   * Login with phone using existing authentication (no OTP required)
   * User must already be authenticated with valid tokens
   */
async function loginWithOtp(req, res) {
		try {
			const { phone } = req.body;
			if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });

			const normalizedPhone = normalizePhone(phone);
			const user = await User.findOne({ 
        where: { phone: normalizedPhone },
        include: [{ model: Profile, as: 'profile' }]
      });
			if (!user) return res.status(404).json({ success: false, message: 'No account found' });

      // Verify the authenticated user matches the phone number
      if (req.user.id !== user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Phone number does not match authenticated user' 
        });
      }

      // Update last login
				await user.update({ lastLogin: new Date() });

      // Generate fresh tokens with full user data
				const tokens = await generateTokens(user);

      const userData = user.toJSON();
      delete userData.passwordHash;

      logger.info('OTP login successful', {
        userId: user.id,
        phone: user.phone
      });

      res.json({ 
        success: true, 
        message: 'Login successful', 
        data: {
          user: userData,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      });
    } catch (error) {
      logger.error('OTP login error', {
        error: error.message,
        stack: error.stack
      });
      return res.status(500).json({ 
        success: false, 
        message: error.message || 'Login failed' 
      });
    }
}

  /**
   * Resend OTP — re-generate and send OTP for an existing user
   */
async function resendOTP(req, res) {
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

      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        phoneNumber: normalizedPhone,
        expiresIn: otpResult.expiresIn || Number(process.env.OTP_EXPIRATION_SECONDS) || 300
      });
		} catch (error) {
      console.error('Resend OTP error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to resend OTP' });
    }
}

module.exports = {
  generateTokens,
  register,
  login,
  loginWithToken,
  loginWithPhone: async function(req, res) {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });
      if (!isValidPhone(phone)) return res.status(400).json({ success: false, message: 'Invalid phone number' });

      const normalizedPhone = normalizePhone(phone);
      const user = await User.findOne({ where: { phone: normalizedPhone } });
      if (!user) return res.status(404).json({ success: false, message: 'No account found' });
      if (!user.isVerified) return res.status(403).json({ success: false, message: 'Phone not verified' });

      await user.update({ lastLogin: new Date() });
      const accessToken = signAccessToken({ id: user.id, username: user.username, email: user.email, phone: user.phone, authProvider: user.authProvider });
      const refreshToken = signRefreshToken(user.id);

      res.set('Authorization', `Bearer ${accessToken}`);
      res.set('X-Refresh-Token', refreshToken);

      const userData = user.toJSON();
      delete userData.passwordHash;
      return res.json({ success: true, message: 'Login successful', user: userData });
    } catch (error) {
      console.error('Phone login error:', error);
      return res.status(500).json({ success: false, message: 'Login failed' });
    }
  },
  refreshToken,
  getCurrentUser,
  adminLogin,
  createAdmin,
  getUserById,
  getUserStats,
  getAllUsers,
  requestOTP,
  verifyOTP,
  loginWithOtp,
  resendOTP
};
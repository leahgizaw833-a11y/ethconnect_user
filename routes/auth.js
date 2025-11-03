const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { User, Profile, OTP } = require('../models');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { generateToken } = require('../utils/jwtUtils');
const { normalizeEthiopianPhone, isValidEthiopianPhone } = require('../utils/phoneUtils');
const { generateOTP, hashOTP, verifyOTP, getOTPExpiration, isOTPExpired } = require('../utils/otpUtils');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 120 }).withMessage('Username must be 3-120 characters'),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('phone').optional().custom((value) => {
    if (value && !isValidEthiopianPhone(value)) {
      throw new Error('Invalid Ethiopian phone number');
    }
    return true;
  }),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { username, email, phone, password, fullName } = req.body;

    // Check if username exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check if email exists
    if (email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // Check if phone exists
    if (phone) {
      const normalizedPhone = normalizeEthiopianPhone(phone);
      const existingPhone = await User.findOne({ where: { phone: normalizedPhone } });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered'
        });
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      username,
      email: email || null,
      phone: phone ? normalizeEthiopianPhone(phone) : null,
      passwordHash,
      authProvider: 'password',
      isVerified: false,
      status: 'active'
    });

    // Create profile
    await Profile.create({
      userId: user.id,
      fullName: fullName || username
    });

    // Generate token
    const token = generateToken(user.id);

    // Return user data (without password)
    const userData = user.toJSON();
    delete userData.passwordHash;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user: userData },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', [
  body('identifier').notEmpty().withMessage('Username, email, or phone required'),
  body('password').notEmpty().withMessage('Password required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Find user by username, email, or phone
    let user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username: identifier },
          { email: identifier },
          { phone: normalizeEthiopianPhone(identifier) || identifier }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check user status
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}`
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate token
    const token = generateToken(user.id);

    // Return user data (without password)
    const userData = user.toJSON();
    delete userData.passwordHash;

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: userData },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/auth/otp/request
 * @desc    Request OTP for phone number
 * @access  Public
 */
router.post('/otp/request', [
  body('phone').custom((value) => {
    if (!isValidEthiopianPhone(value)) {
      throw new Error('Invalid Ethiopian phone number');
    }
    return true;
  }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { phone } = req.body;
    const normalizedPhone = normalizeEthiopianPhone(phone);

    // Generate OTP
    const otp = generateOTP();
    const hashedSecret = await hashOTP(otp);
    const expiresAt = getOTPExpiration(10); // 10 minutes

    // Delete any existing pending OTPs for this phone
    await OTP.destroy({
      where: {
        phone: normalizedPhone,
        status: 'pending'
      }
    });

    // Create OTP record
    await OTP.create({
      phone: normalizedPhone,
      hashedSecret,
      expiresAt,
      status: 'pending',
      attempts: 0
    });

    // TODO: Send OTP via SMS gateway (e.g., GeezSMS)
    console.log(`OTP for ${normalizedPhone}: ${otp}`); // For development only

    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone: normalizedPhone,
        expiresIn: '10 minutes'
      },
      // Only in development
      ...(process.env.NODE_ENV === 'development' && { otp })
    });
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/auth/otp/verify
 * @desc    Verify OTP and login/register user
 * @access  Public
 */
router.post('/otp/verify', [
  body('phone').custom((value) => {
    if (!isValidEthiopianPhone(value)) {
      throw new Error('Invalid Ethiopian phone number');
    }
    return true;
  }),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const normalizedPhone = normalizeEthiopianPhone(phone);

    // Find pending OTP
    const otpRecord = await OTP.findOne({
      where: {
        phone: normalizedPhone,
        status: 'pending'
      },
      order: [['createdAt', 'DESC']]
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'No OTP request found for this phone number'
      });
    }

    // Check if OTP is expired
    if (isOTPExpired(otpRecord.expiresAt)) {
      await otpRecord.update({ status: 'expired' });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    // Check if locked due to too many attempts
    if (otpRecord.attempts >= 5) {
      await otpRecord.update({ status: 'locked' });
      return res.status(400).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new OTP'
      });
    }

    // Verify OTP
    const isValid = await verifyOTP(otp, otpRecord.hashedSecret);
    
    if (!isValid) {
      await otpRecord.increment('attempts');
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        attemptsRemaining: 5 - (otpRecord.attempts + 1)
      });
    }

    // Mark OTP as verified
    await otpRecord.update({ status: 'verified' });

    // Find or create user
    let user = await User.findOne({ where: { phone: normalizedPhone } });

    if (!user) {
      // Create new user with phone authentication
      const username = `user_${normalizedPhone.replace(/\D/g, '').slice(-9)}`;
      user = await User.create({
        username,
        phone: normalizedPhone,
        passwordHash: await hashPassword(Math.random().toString(36)), // Random password
        authProvider: 'phone',
        isVerified: true,
        status: 'active'
      });

      // Create profile
      await Profile.create({
        userId: user.id,
        fullName: username
      });
    } else {
      // Update verification status
      await user.update({
        isVerified: true,
        lastLogin: new Date()
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Return user data
    const userData = user.toJSON();
    delete userData.passwordHash;

    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: { user: userData },
      token
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        {
          model: Profile,
          as: 'profile'
        }
      ]
    });

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/auth/check-username/:username
 * @desc    Check if username is available
 * @access  Public
 */
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ where: { username } });
    
    res.json({
      success: true,
      data: {
        available: !user,
        username
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check username',
      error: error.message
    });
  }
});

module.exports = router;

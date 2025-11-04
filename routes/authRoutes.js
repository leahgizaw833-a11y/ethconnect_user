const express = require('express');
const authController = require('../controllers/authController');
const { body } = require('express-validator');
const router = express.Router();
const { isValidPhone } = require('../utils/phoneUtils');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { handleValidationErrors } = require('../middleware/validation');
// Admin/debug controllers removed for SMS resend cleanup

router.post('/register', [
  body('username').optional().trim().isLength({ min: 3, max: 120 }),
  body('email').optional().isEmail(),
  body('phone').optional().custom(value => { if (value && !isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  body('password').isLength({ min: 6 }),
  handleValidationErrors
], authController.register);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
  handleValidationErrors
], authController.login);

// === OTP routes restored ===
router.post('/otp/request', [
  body('phone').custom(value => { if (!isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  handleValidationErrors
], authController.requestOTP);

// Aliases matching OTP guide docs
router.post('/request-otp', [
  body('phone').custom(value => { if (!isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  handleValidationErrors
], authController.requestOTP);

router.post('/otp/resend', [
  body('phone').custom(value => { if (!isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  handleValidationErrors
], authController.resendOTP); // new route

router.post('/otp/verify', [
  body('phone').custom(value => { if (!isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  body('otp').isLength({ min: 6, max: 6 }),
  handleValidationErrors
], authController.verifyOTP);

router.post('/verify-otp', [
  body('phone').custom(value => { if (!isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  body('otp').isLength({ min: 6, max: 6 }),
  handleValidationErrors
], authController.verifyOTP);

router.post('/otp/login', [
  body('phone').custom(value => { if (!isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  body('otp').isLength({ min: 6, max: 6 }),
  handleValidationErrors
], authController.loginWithOtp);
// Phone-number-only login (after verification), returns tokens via headers
router.post('/phone-login', [
  body('phone').custom(value => { if (!isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  handleValidationErrors
], authController.loginWithPhone);
// === end OTP routes ===

router.post('/token-login', [
  body('phone').custom(value => { if (!isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  body('token').notEmpty(),
  handleValidationErrors
], authController.loginWithToken);

router.post('/refresh-token', [
  body('refreshToken').notEmpty(),
  handleValidationErrors
], authController.refreshToken);

router.get('/me', authenticateToken, authController.getCurrentUser);

// Admin and debug routes removed

module.exports = router;

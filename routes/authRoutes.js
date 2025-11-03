const express = require('express');
const authController = require('../controllers/authController');
const { body } = require('express-validator');
const router = express.Router();
const { isValidPhone } = require('../utils/phoneUtils');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { handleValidationErrors } = require('../middleware/validation');
const adminController = require('../controllers/adminController');
const debugController = require('../controllers/debugController');

router.post('/register', [
  body('username').optional().trim().isLength({ min: 3, max: 120 }),
  body('email').optional().isEmail(),
  body('phone').optional().custom(value => { if (value && !isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  body('password').isLength({ min: 6 }),
  handleValidationErrors
], authController.register.bind(authController));

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
  handleValidationErrors
], authController.login.bind(authController));

// === OTP routes restored ===
router.post('/otp/request', [
  body('phone').custom(value => { if (!isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  handleValidationErrors
], authController.requestOTP.bind(authController));

router.post('/otp/resend', [
  body('phone').custom(value => { if (!isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  handleValidationErrors
], authController.resendOTP.bind(authController)); // new route

router.post('/otp/verify', [
  body('phone').custom(value => { if (!isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  body('otp').isLength({ min: 6, max: 6 }),
  handleValidationErrors
], authController.verifyOTP.bind(authController));

router.post('/otp/login', [
  body('phone').custom(value => { if (!isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  body('otp').isLength({ min: 6, max: 6 }),
  handleValidationErrors
], authController.loginWithOtp.bind(authController));
// === end OTP routes ===

router.post('/token-login', [
  body('phone').custom(value => { if (!isValidPhone(value)) throw new Error('Invalid phone'); return true; }),
  body('token').notEmpty(),
  handleValidationErrors
], authController.loginWithToken.bind(authController));

router.post('/refresh-token', [
  body('refreshToken').notEmpty(),
  handleValidationErrors
], authController.refreshToken.bind(authController));

router.get('/me', authenticateToken, authController.getCurrentUser.bind(authController));
router.get('/check-username/:username', authController.checkUsername.bind(authController));

// Admin debug route to inspect SMS attempts (protected)
router.get('/admin/sms-attempts',
  authenticateToken,
  requireRole('admin'),
  adminController.getSmsAttempts.bind(adminController)
);

// Admin route to resend a logged SMS attempt
router.post('/admin/resend', [
  authenticateToken,
  requireRole('admin'),
  body('api_log_id').optional(),
  body('index').optional(),
  handleValidationErrors
], adminController.resendSmsAttempt.bind(adminController));

// New: return last attempts for authenticated user
router.get('/debug/my-sms-attempts',
  authenticateToken,
  debugController.getMySmsAttempts.bind(debugController)
);

module.exports = router;

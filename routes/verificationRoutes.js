const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @route   POST /api/v1/verifications
 * @desc    Submit verification request
 * @access  Private
 */
router.post('/',
  authenticateToken,
  [
    body('type').isIn(['kyc', 'doctor_license', 'teacher_cert', 'business_license', 'employer_cert', 'other'])
      .withMessage('Invalid verification type'),
    body('documentUrl').notEmpty().withMessage('Document URL is required'),
    body('notes').optional().isLength({ max: 1000 }),
    handleValidationErrors
  ],
  verificationController.submitVerification.bind(verificationController)
);

/**
 * @route   GET /api/v1/verifications
 * @desc    Get current user's verification requests
 * @access  Private
 */
router.get('/', authenticateToken, verificationController.getMyVerifications.bind(verificationController));

/**
 * @route   GET /api/v1/verifications/pending
 * @desc    Get all pending verifications (admin only)
 * @access  Private (Admin)
 */
router.get('/pending',
  authenticateToken,
  requireRole('admin'),
  verificationController.getPendingVerifications.bind(verificationController)
);

/**
 * @route   PUT /api/v1/verifications/:verificationId
 * @desc    Update verification status (admin only)
 * @access  Private (Admin)
 */
router.put('/:verificationId',
  authenticateToken,
  requireRole('admin'),
  [
    body('status').isIn(['approved', 'rejected']).withMessage('Invalid status'),
    body('notes').optional().isLength({ max: 1000 }),
    handleValidationErrors
  ],
  verificationController.updateVerification.bind(verificationController)
);

/**
 * @route   GET /api/v1/verifications/user/:userId
 * @desc    Get user's verifications (admin only)
 * @access  Private (Admin)
 */
router.get('/user/:userId',
  authenticateToken,
  requireRole('admin'),
  verificationController.getUserVerifications.bind(verificationController)
);

module.exports = router;

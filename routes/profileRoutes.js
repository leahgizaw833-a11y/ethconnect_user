const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @route   PUT /api/v1/profiles
 * @desc    Update current user's profile
 * @access  Private
 */
router.put('/',
  authenticateToken,
  [
    body('fullName').optional().isLength({ max: 160 }),
    body('bio').optional().isLength({ max: 1000 }),
    body('profession').optional().isLength({ max: 120 }),
    body('languages').optional().isArray(),
    body('gender').optional().isIn(['male', 'female', 'other']),
    body('age').optional().isInt({ min: 18, max: 120 }),
    body('religion').optional().isLength({ max: 100 }),
    body('ethnicity').optional().isLength({ max: 100 }),
    body('education').optional().isLength({ max: 120 }),
    body('interests').optional().isArray(),
    handleValidationErrors
  ],
  profileController.updateProfile
);

/**
 * @route   GET /api/v1/profiles
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/', authenticateToken, profileController.getCurrentUserProfile);

module.exports = router;

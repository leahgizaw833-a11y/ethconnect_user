const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { Profile, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @route   GET /api/v1/profiles/:userId
 * @desc    Get user profile
 * @access  Public
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await Profile.findOne({
      where: { userId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'isVerified', 'status']
      }]
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: { profile }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
});

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
  async (req, res) => {
    try {
      const allowedFields = [
        'fullName', 'bio', 'profession', 'languages', 'photoUrl',
        'gender', 'age', 'religion', 'ethnicity', 'education', 'interests'
      ];

      const updateData = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      const profile = await Profile.findOne({ where: { userId: req.user.id } });

      if (!profile) {
        // Create profile if it doesn't exist
        const newProfile = await Profile.create({
          userId: req.user.id,
          ...updateData
        });

        return res.json({
          success: true,
          message: 'Profile created successfully',
          data: { profile: newProfile }
        });
      }

      await profile.update(updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { profile }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/v1/profiles
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      where: { userId: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: { profile }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
});

module.exports = router;

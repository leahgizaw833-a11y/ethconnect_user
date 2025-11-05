const { Profile, User } = require('../models');
const logger = require('../config/logger');

/**
 * Get current user's profile
 */
async function getCurrentUserProfile(req, res) {
  try {
    logger.info('Get profile request', { userId: req.user.id });

    const profile = await Profile.findOne({
      where: { userId: req.user.id }
    });

    if (!profile) {
      logger.warn('Profile not found', { userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    logger.info('Profile retrieved successfully', { userId: req.user.id });
    res.json({
      success: true,
      data: { profile }
    });
  } catch (error) {
    logger.error('Get profile error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
}

/**
 * Update current user's profile
 */
async function updateProfile(req, res) {
  try {
    logger.info('Update profile request', {
      userId: req.user.id,
      fields: Object.keys(req.body)
    });

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

      logger.info('Profile created successfully', {
        userId: req.user.id,
        profileId: newProfile.id
      });

      return res.json({
        success: true,
        message: 'Profile created successfully',
        data: { profile: newProfile }
      });
    }

    await profile.update(updateData);

    logger.info('Profile updated successfully', {
      userId: req.user.id,
      profileId: profile.id
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { profile }
    });
  } catch (error) {
    logger.error('Update profile error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
}

module.exports = {
  getCurrentUserProfile,
  updateProfile
};

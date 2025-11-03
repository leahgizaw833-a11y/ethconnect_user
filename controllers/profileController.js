// const { Profile } = require('../models');
const { Profile } = require('../models');
const { User } = require('../models');

class ProfileController {
  /**
   * Get user profile by user ID
   */
  async getProfileByUserId(req, res) {
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
  }

  /**
   * Get current user's profile
   */
  async getCurrentUserProfile(req, res) {
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
  }

  /**
   * Update current user's profile
   */
  async updateProfile(req, res) {
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
}

module.exports = new ProfileController();

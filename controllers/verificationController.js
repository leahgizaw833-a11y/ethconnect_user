const { Verification, User, Profile } = require('../models');

class VerificationController {
  /**
   * Submit verification request
   */
  async submitVerification(req, res) {
    try {
      const { type, documentUrl, notes } = req.body;

      // Check if there's already a pending verification of this type
      const existingVerification = await Verification.findOne({
        where: {
          userId: req.user.id,
          type,
          status: 'pending'
        }
      });

      if (existingVerification) {
        return res.status(400).json({
          success: false,
          message: 'You already have a pending verification request of this type'
        });
      }

      const verification = await Verification.create({
        userId: req.user.id,
        type,
        documentUrl,
        notes: notes || null,
        status: 'pending'
      });

      res.status(201).json({
        success: true,
        message: 'Verification request submitted successfully',
        data: { verification }
      });
    } catch (error) {
      console.error('Submit verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit verification request',
        error: error.message
      });
    }
  }

  /**
   * Get current user's verification requests
   */
  async getMyVerifications(req, res) {
    try {
      const verifications = await Verification.findAll({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: { verifications }
      });
    } catch (error) {
      console.error('Get verifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get verifications',
        error: error.message
      });
    }
  }

  /**
   * Get all pending verifications (admin only)
   */
  async getPendingVerifications(req, res) {
    try {
      const verifications = await Verification.findAll({
        where: { status: 'pending' },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
          include: [{
            model: Profile,
            as: 'profile',
            attributes: ['fullName', 'profession']
          }]
        }],
        order: [['createdAt', 'ASC']]
      });

      res.json({
        success: true,
        data: { verifications }
      });
    } catch (error) {
      console.error('Get pending verifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pending verifications',
        error: error.message
      });
    }
  }

  /**
   * Update verification status (admin only)
   */
  async updateVerification(req, res) {
    try {
      const { verificationId } = req.params;
      const { status, notes } = req.body;

      const verification = await Verification.findByPk(verificationId);

      if (!verification) {
        return res.status(404).json({
          success: false,
          message: 'Verification request not found'
        });
      }

      await verification.update({
        status,
        notes: notes || verification.notes,
        verifiedBy: req.user.id,
        verifiedAt: new Date()
      });

      // Update user's profile verification status if approved
      if (status === 'approved') {
        const profile = await Profile.findOne({
          where: { userId: verification.userId }
        });

        if (profile) {
          let newVerificationStatus = 'kyc';
          
          if (['doctor_license', 'teacher_cert', 'business_license', 'employer_cert'].includes(verification.type)) {
            newVerificationStatus = 'professional';
          }

          // Check if user has both KYC and professional verification
          const hasKyc = await Verification.findOne({
            where: {
              userId: verification.userId,
              type: 'kyc',
              status: 'approved'
            }
          });

          const hasProfessional = await Verification.findOne({
            where: {
              userId: verification.userId,
              type: ['doctor_license', 'teacher_cert', 'business_license', 'employer_cert'],
              status: 'approved'
            }
          });

          if (hasKyc && hasProfessional) {
            newVerificationStatus = 'full';
          }

          await profile.update({ verificationStatus: newVerificationStatus });
        }
      }

      res.json({
        success: true,
        message: `Verification ${status} successfully`,
        data: { verification }
      });
    } catch (error) {
      console.error('Update verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update verification',
        error: error.message
      });
    }
  }

  /**
   * Get user's verifications (admin only)
   */
  async getUserVerifications(req, res) {
    try {
      const { userId } = req.params;

      const verifications = await Verification.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: { verifications }
      });
    } catch (error) {
      console.error('Get user verifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user verifications',
        error: error.message
      });
    }
  }
}

module.exports = new VerificationController();

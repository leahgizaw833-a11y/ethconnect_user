const { Verification, User, Profile, Role, UserRole } = require('../models');
const logger = require('../config/logger');

/**
 * Submit verification request with file upload
 */
async function submitVerification(req, res) {
    try {
      const { type, notes } = req.body;
      
      logger.info('Submit verification request', {
        userId: req.user.id,
        type,
        hasFile: !!req.file
      });

      // Check if file was uploaded
      if (!req.file) {
        logger.warn('Verification submission without file', { userId: req.user.id });
        return res.status(400).json({
          success: false,
          message: 'Document file is required'
        });
      }

      // Get document URL from uploaded file
      const documentUrl = `/uploads/verifications/${req.file.filename}`;

      // Check if there's already a pending verification of this type
      const existingVerification = await Verification.findOne({
        where: {
          userId: req.user.id,
          type,
          status: 'pending'
        }
      });

      if (existingVerification) {
        logger.warn('Duplicate verification submission', {
          userId: req.user.id,
          type
        });
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

      logger.info('Verification submitted successfully', {
        verificationId: verification.id,
        userId: req.user.id,
        type
      });

      res.status(201).json({
        success: true,
        message: 'Verification request submitted successfully',
        data: { verification }
      });
    } catch (error) {
      logger.error('Submit verification error', {
        error: error.message,
        stack: error.stack,
        userId: req.user.id
      });
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
async function getMyVerifications(req, res) {
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
async function getPendingVerifications(req, res) {
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
async function updateVerification(req, res) {
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

      // Update user's profile verification status and assign role if approved
      if (status === 'approved') {
        const profile = await Profile.findOne({
          where: { userId: verification.userId }
        });

        if (profile) {
          let newVerificationStatus = 'kyc';
          let roleToAssign = null;
          
          // Determine verification status and role based on document type
          if (verification.type === 'doctor_license') {
            newVerificationStatus = 'professional';
            roleToAssign = 'doctor';
          } else if (verification.type === 'teacher_cert') {
            newVerificationStatus = 'professional';
            roleToAssign = 'teacher';
          } else if (verification.type === 'business_license') {
            newVerificationStatus = 'professional';
            roleToAssign = 'employer';
          } else if (verification.type === 'employer_cert') {
            newVerificationStatus = 'professional';
            roleToAssign = 'employer';
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

          // Automatically assign role based on verification type
          if (roleToAssign) {
            let role = await Role.findOne({ where: { name: roleToAssign } });
            
            // Create role if it doesn't exist
            if (!role) {
              role = await Role.create({ name: roleToAssign });
            }

            // Check if user already has this role
            const existingUserRole = await UserRole.findOne({
              where: {
                userId: verification.userId,
                roleId: role.id
              }
            });

            // Assign role if not already assigned
            if (!existingUserRole) {
              await UserRole.create({
                userId: verification.userId,
                roleId: role.id
              });
            }
          }
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
async function getUserVerifications(req, res) {
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

module.exports = {
  submitVerification,
  getMyVerifications,
  getPendingVerifications,
  updateVerification,
  getUserVerifications
};

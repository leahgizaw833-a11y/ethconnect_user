const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { Verification, User, Profile } = require('../models');
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
  async (req, res) => {
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
);

/**
 * @route   GET /api/v1/verifications
 * @desc    Get current user's verification requests
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
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
});

/**
 * @route   GET /api/v1/verifications/pending
 * @desc    Get all pending verifications (admin only)
 * @access  Private (Admin)
 */
router.get('/pending',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
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
  async (req, res) => {
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
);

/**
 * @route   GET /api/v1/verifications/user/:userId
 * @desc    Get user's verifications (admin only)
 * @access  Private (Admin)
 */
router.get('/user/:userId',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
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
);

module.exports = router;

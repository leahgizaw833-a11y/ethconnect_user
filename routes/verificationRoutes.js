const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/verifications/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images and documents are allowed'));
  }
});

/**
 * @route   POST /api/v1/verifications
 * @desc    Submit verification request with document upload
 * @access  Private
 */
router.post('/',
  authenticateToken,
  upload.single('document'),
  [
    body('type').isIn(['kyc', 'doctor_license', 'teacher_cert', 'business_license', 'employer_cert', 'other'])
      .withMessage('Invalid verification type'),
    body('notes').optional().isLength({ max: 1000 }),
    handleValidationErrors
  ],
  verificationController.submitVerification
);

/**
 * @route   GET /api/v1/verifications
 * @desc    Get current user's verification requests
 * @access  Private
 */
router.get('/', authenticateToken, verificationController.getMyVerifications);

/**
 * @route   GET /api/v1/verifications/pending
 * @desc    Get all pending verifications (admin only)
 * @access  Private (Admin)
 */
router.get('/pending',
  authenticateToken,
  requireRole('admin'),
  verificationController.getPendingVerifications
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
  verificationController.updateVerification
);

/**
 * @route   GET /api/v1/verifications/user/:userId
 * @desc    Get user's verifications (admin only)
 * @access  Private (Admin)
 */
router.get('/user/:userId',
  authenticateToken,
  requireRole('admin'),
  verificationController.getUserVerifications
);

module.exports = router;

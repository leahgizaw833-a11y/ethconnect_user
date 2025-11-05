const express = require('express');
const router = express.Router();
const connectionController = require('../controllers/connectionController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const {
  sendConnectionRequestSchema,
  respondToConnectionSchema,
  removeConnectionSchema
} = require('../validators/connectionValidators');

/**
 * @route   POST /api/v1/connections/request
 * @desc    Send connection request to another user
 * @access  Private
 */
router.post('/request',
  authenticateToken,
  validateRequest(sendConnectionRequestSchema),
  connectionController.sendConnectionRequest
);

/**
 * @route   PUT /api/v1/connections/:id/respond
 * @desc    Respond to connection request (accept/reject)
 * @access  Private
 */
router.put('/:id/respond',
  authenticateToken,
  validateRequest(respondToConnectionSchema),
  connectionController.respondToConnection
);

/**
 * @route   GET /api/v1/connections
 * @desc    Get user's accepted connections
 * @access  Private
 */
router.get('/',
  authenticateToken,
  connectionController.getConnections
);

/**
 * @route   GET /api/v1/connections/pending
 * @desc    Get pending connection requests (received)
 * @access  Private
 */
router.get('/pending',
  authenticateToken,
  connectionController.getPendingRequests
);

/**
 * @route   GET /api/v1/connections/sent
 * @desc    Get sent connection requests
 * @access  Private
 */
router.get('/sent',
  authenticateToken,
  connectionController.getSentRequests
);

/**
 * @route   DELETE /api/v1/connections/:id
 * @desc    Remove connection (unfriend)
 * @access  Private
 */
router.delete('/:id',
  authenticateToken,
  validateRequest(removeConnectionSchema),
  connectionController.removeConnection
);

module.exports = router;

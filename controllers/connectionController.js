const { Connection, User, Profile } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const axios = require('axios');

// Communication Service URL from environment
const COMMUNICATION_SERVICE_URL = process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:5000';

/**
 * Helper function to trigger notification in Communication Service
 */
async function triggerNotification(type, payload) {
  try {
    const response = await axios.post(
      `${COMMUNICATION_SERVICE_URL}/api/notifications/trigger`,
      {
        type,
        ...payload
      },
      {
        timeout: 5000 // 5 second timeout
      }
    );
    
    logger.info('Notification triggered successfully', { type, response: response.data });
    return response.data;
  } catch (error) {
    // Log error but don't fail the request
    logger.error('Failed to trigger notification', {
      type,
      error: error.message,
      url: `${COMMUNICATION_SERVICE_URL}/api/notifications/trigger`
    });
    // Don't throw - notification failure shouldn't block connection creation
  }
}

/**
 * Send connection request
 * POST /api/connections/request
 */
async function sendConnectionRequest(req, res) {
  try {
    const { receiverId } = req.body;
    const requesterId = req.user.id;

    logger.info('Send connection request', { requesterId, receiverId });

    // Validate: Cannot send request to self
    if (requesterId === receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send connection request to yourself'
      });
    }

    // Check if receiver exists
    const receiver = await User.findByPk(receiverId, {
      include: [{ model: Profile, as: 'profile' }]
    });

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      where: {
        [Op.or]: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId }
        ]
      }
    });

    if (existingConnection) {
      if (existingConnection.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Connection request already pending'
        });
      }
      if (existingConnection.status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'You are already connected with this user'
        });
      }
      if (existingConnection.status === 'rejected') {
        // Allow resending after rejection
        await existingConnection.update({
          requesterId,
          receiverId,
          status: 'pending',
          respondedAt: null
        });

        // Trigger notification
        const requester = await User.findByPk(requesterId, {
          include: [{ model: Profile, as: 'profile' }]
        });

        await triggerNotification('connection_request', {
          receiverId,
          connection: {
            id: existingConnection.id,
            status: 'pending'
          },
          requester: {
            id: requester.id,
            username: requester.username,
            displayName: requester.profile?.fullName || requester.username,
            photoURL: requester.profile?.photoUrl
          }
        });

        logger.info('Connection request resent', { connectionId: existingConnection.id });
        return res.status(200).json({
          success: true,
          message: 'Connection request sent successfully',
          data: { connection: existingConnection }
        });
      }
    }

    // Create new connection request
    const connection = await Connection.create({
      requesterId,
      receiverId,
      status: 'pending'
    });

    // Get requester details for notification
    const requester = await User.findByPk(requesterId, {
      include: [{ model: Profile, as: 'profile' }]
    });

    // Trigger notification to Communication Service
    await triggerNotification('connection_request', {
      receiverId,
      connection: {
        id: connection.id,
        status: connection.status
      },
      requester: {
        id: requester.id,
        username: requester.username,
        displayName: requester.profile?.fullName || requester.username,
        photoURL: requester.profile?.photoUrl
      }
    });

    logger.info('Connection request sent successfully', { connectionId: connection.id });
    res.status(201).json({
      success: true,
      message: 'Connection request sent successfully',
      data: { connection }
    });
  } catch (error) {
    logger.error('Send connection request error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to send connection request',
      error: error.message
    });
  }
}

/**
 * Respond to connection request (accept/reject)
 * PUT /api/connections/:id/respond
 */
async function respondToConnection(req, res) {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const userId = req.user.id;

    logger.info('Respond to connection request', { connectionId: id, action, userId });

    const connection = await Connection.findByPk(id);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found'
      });
    }

    // Validate: Only receiver can respond
    if (connection.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to respond to this request'
      });
    }

    // Validate: Can only respond to pending requests
    if (connection.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Connection request already ${connection.status}`
      });
    }

    // Update connection status
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    await connection.update({
      status: newStatus,
      respondedAt: new Date()
    });

    // If accepted, trigger notification to requester
    if (newStatus === 'accepted') {
      const accepter = await User.findByPk(userId, {
        include: [{ model: Profile, as: 'profile' }]
      });

      await triggerNotification('connection_accepted', {
        requesterId: connection.requesterId,
        connection: {
          id: connection.id,
          status: 'accepted'
        },
        accepter: {
          id: accepter.id,
          username: accepter.username,
          displayName: accepter.profile?.fullName || accepter.username,
          photoURL: accepter.profile?.photoUrl
        }
      });
    }

    logger.info('Connection request responded', { connectionId: id, status: newStatus });
    res.json({
      success: true,
      message: `Connection request ${newStatus} successfully`,
      data: { connection }
    });
  } catch (error) {
    logger.error('Respond to connection error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to respond to connection request',
      error: error.message
    });
  }
}

/**
 * Get user's connections (accepted only)
 * GET /api/connections
 */
async function getConnections(req, res) {
  try {
    const userId = req.user.id;

    logger.info('Get connections', { userId });

    const connections = await Connection.findAll({
      where: {
        [Op.or]: [
          { requesterId: userId },
          { receiverId: userId }
        ],
        status: 'accepted'
      },
      order: [['createdAt', 'DESC']]
    });

    // Get connected user details
    const connectionsWithUsers = await Promise.all(
      connections.map(async (connection) => {
        const connectedUserId = connection.requesterId === userId 
          ? connection.receiverId 
          : connection.requesterId;

        const connectedUser = await User.findByPk(connectedUserId, {
          attributes: ['id', 'username', 'email'],
          include: [{ model: Profile, as: 'profile' }]
        });

        return {
          id: connection.id,
          connectedAt: connection.respondedAt,
          user: connectedUser
        };
      })
    );

    logger.info('Connections retrieved', { userId, count: connections.length });
    res.json({
      success: true,
      data: { 
        connections: connectionsWithUsers,
        count: connectionsWithUsers.length
      }
    });
  } catch (error) {
    logger.error('Get connections error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get connections',
      error: error.message
    });
  }
}

/**
 * Get pending connection requests (received)
 * GET /api/connections/pending
 */
async function getPendingRequests(req, res) {
  try {
    const userId = req.user.id;

    logger.info('Get pending requests', { userId });

    const pendingRequests = await Connection.findAll({
      where: {
        receiverId: userId,
        status: 'pending'
      },
      order: [['createdAt', 'DESC']]
    });

    // Get requester details
    const requestsWithUsers = await Promise.all(
      pendingRequests.map(async (request) => {
        const requester = await User.findByPk(request.requesterId, {
          attributes: ['id', 'username', 'email'],
          include: [{ model: Profile, as: 'profile' }]
        });

        return {
          id: request.id,
          requestedAt: request.createdAt,
          requester
        };
      })
    );

    logger.info('Pending requests retrieved', { userId, count: pendingRequests.length });
    res.json({
      success: true,
      data: { 
        requests: requestsWithUsers,
        count: requestsWithUsers.length
      }
    });
  } catch (error) {
    logger.error('Get pending requests error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get pending requests',
      error: error.message
    });
  }
}

/**
 * Get sent connection requests
 * GET /api/connections/sent
 */
async function getSentRequests(req, res) {
  try {
    const userId = req.user.id;

    logger.info('Get sent requests', { userId });

    const sentRequests = await Connection.findAll({
      where: {
        requesterId: userId,
        status: 'pending'
      },
      order: [['createdAt', 'DESC']]
    });

    // Get receiver details
    const requestsWithUsers = await Promise.all(
      sentRequests.map(async (request) => {
        const receiver = await User.findByPk(request.receiverId, {
          attributes: ['id', 'username', 'email'],
          include: [{ model: Profile, as: 'profile' }]
        });

        return {
          id: request.id,
          sentAt: request.createdAt,
          receiver
        };
      })
    );

    logger.info('Sent requests retrieved', { userId, count: sentRequests.length });
    res.json({
      success: true,
      data: { 
        requests: requestsWithUsers,
        count: requestsWithUsers.length
      }
    });
  } catch (error) {
    logger.error('Get sent requests error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get sent requests',
      error: error.message
    });
  }
}

/**
 * Remove connection (unfriend)
 * DELETE /api/connections/:id
 */
async function removeConnection(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    logger.info('Remove connection', { connectionId: id, userId });

    const connection = await Connection.findByPk(id);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found'
      });
    }

    // Validate: Only participants can remove connection
    if (connection.requesterId !== userId && connection.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to remove this connection'
      });
    }

    await connection.destroy();

    logger.info('Connection removed successfully', { connectionId: id });
    res.json({
      success: true,
      message: 'Connection removed successfully'
    });
  } catch (error) {
    logger.error('Remove connection error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to remove connection',
      error: error.message
    });
  }
}

module.exports = {
  sendConnectionRequest,
  respondToConnection,
  getConnections,
  getPendingRequests,
  getSentRequests,
  removeConnection
};

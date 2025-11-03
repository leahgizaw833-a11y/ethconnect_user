/**
 * ============================================================================
 * ADVANCED JWT UTILITIES - ACCESS & REFRESH TOKEN MANAGEMENT
 * ============================================================================
 * Adapted from EXTRACTED_PACKAGE for EthioConnect User Service
 * 
 * FEATURES:
 * ✅ JWT access tokens with configurable expiration
 * ✅ Secure refresh tokens with bcrypt hashing
 * ✅ Automatic token rotation for security
 * ✅ Token versioning support
 * ✅ Database-backed refresh token storage
 */

'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { RefreshToken } = require('../models');
const { Op} = require('sequelize');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 7;

/**
 * Convert payload to full user claims
 */
function toFullClaims(payload) {
  return {
    userId: payload.userId || payload.id,
    username: payload.username || null,
    email: payload.email || null,
    phone: payload.phone || null,
    isVerified: payload.isVerified || false,
    status: payload.status || 'active',
    authProvider: payload.authProvider || 'password',
    type: payload.type || 'user',
    tv: payload.tokenVersion || 1, // Token version
  };
}

/**
 * Generate JWT access token for user with full information
 */
function generateAccessToken(payload) {
  const claims = toFullClaims(payload);
  return jwt.sign(claims, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

/**
 * Generate access token with custom claims
 */
function generateAccessTokenWithClaims(fullPayload) {
  return jwt.sign(fullPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token, secret = JWT_SECRET) {
  return jwt.verify(token, secret);
}

/**
 * Generate cryptographically secure random token string
 */
function generateRandomTokenString(bytes = 48) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a token using bcrypt
 */
async function hashToken(token) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(token, salt);
}

/**
 * Compare plain token with hashed token
 */
async function compareHashedToken(token, hashed) {
  return bcrypt.compare(token, hashed);
}

/**
 * Add days to a date
 */
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Issue a new refresh token
 * 
 * Creates a secure random refresh token, hashes it, and stores in database.
 * The plain token is returned to the client, hash is stored in DB.
 */
async function issueRefreshToken({ userId, metadata = null }) {
  try {
    const rawToken = generateRandomTokenString(32);
    const hashedToken = await hashToken(rawToken);
    const expiresAt = addDays(new Date(), REFRESH_TOKEN_TTL_DAYS);
    
    const record = await RefreshToken.create({ 
      userId, 
      hashedToken, 
      expiresAt, 
      metadata
    });
    
    console.log(`[JWT] Refresh token issued for user: ${userId}`);
    
    return { token: rawToken, record };
  } catch (error) {
    console.error('[JWT] Refresh token issue failed:', error.message);
    throw error;
  }
}

/**
 * Rotate refresh token (revoke old, issue new)
 * 
 * Implements secure token rotation. When a client uses a refresh token,
 * we revoke the old one and issue a new one.
 */
async function rotateRefreshToken({ token, userId }) {
  try {
    // Find all active tokens for user
    const rows = await RefreshToken.findAll({ 
      where: { 
        userId, 
        revokedAt: null,
        expiresAt: { [Op.gt]: new Date() }
      } 
    });
    
    // Find matching token
    let current = null;
    for (const r of rows) {
      if (await compareHashedToken(token, r.hashedToken)) { 
        current = r; 
        break; 
      }
    }
    
    if (!current) {
      console.log('[JWT] Refresh token not found or already used');
      return null;
    }
    
    // Check expiration
    if (new Date(current.expiresAt) < new Date()) {
      console.log('[JWT] Refresh token expired');
      return null;
    }

    // Issue new token
    const { token: newRaw, record: newRec } = await issueRefreshToken({ userId });
    
    // Revoke old token
    await current.update({
      revokedAt: new Date(),
      replacedByTokenId: newRec.id
    });
    
    console.log(`[JWT] Refresh token rotated for user: ${userId}`);
    return { newToken: newRaw, newRecord: newRec };
  } catch (error) {
    console.error('[JWT] Token rotation failed:', error.message);
    throw error;
  }
}

/**
 * Verify refresh token and generate new access token
 */
async function refreshAccessToken(refreshToken, userId) {
  const rotated = await rotateRefreshToken({ token: refreshToken, userId });
  
  if (!rotated) {
    throw new Error('Invalid or expired refresh token');
  }
  
  // Generate new access token
  const accessToken = generateAccessToken({ userId });
  
  return {
    accessToken,
    refreshToken: rotated.newToken
  };
}

/**
 * Revoke a refresh token (for logout)
 */
async function revokeRefreshToken(token, userId) {
  const rows = await RefreshToken.findAll({ 
    where: { 
      userId, 
      revokedAt: null 
    } 
  });
  
  for (const r of rows) {
    if (await compareHashedToken(token, r.hashedToken)) {
      await r.update({ revokedAt: new Date() });
      console.log(`[JWT] Refresh token revoked for user: ${userId}`);
      return true;
    }
  }
  
  return false;
}

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 */
async function revokeAllRefreshTokens(userId) {
  const updated = await RefreshToken.update(
    { revokedAt: new Date() },
    { 
      where: { 
        userId, 
        revokedAt: null 
      } 
    }
  );
  
  console.log(`[JWT] All refresh tokens revoked for user: ${userId}`);
  return updated[0]; // Number of rows updated
}

/**
 * Clean up expired refresh tokens (use in cron job)
 */
async function cleanupExpiredTokens() {
  const deleted = await RefreshToken.destroy({
    where: {
      [Op.or]: [
        { expiresAt: { [Op.lt]: new Date() } },
        { 
          revokedAt: { [Op.not]: null },
          updatedAt: { [Op.lt]: new Date(Date.now() - 86400000 * 7) } // 7 days old
        }
      ]
    }
  });
  
  console.log(`[JWT] Cleaned up ${deleted} expired refresh tokens`);
  return { deleted };
}

/**
 * Generate access and refresh token pair
 */
async function generateTokenPair(payload) {
  const userId = payload.userId || payload.id;
  const accessToken = generateAccessToken(payload);
  const { token: refreshToken } = await issueRefreshToken({
    userId,
    metadata: { type: payload.type }
  });
  
  return {
    accessToken,
    refreshToken
  };
}

/**
 * Socket.IO authentication middleware
 */
function socketAuth(socket, next) {
  try {
    let raw = socket.handshake.auth?.token
      || socket.handshake.query?.token
      || socket.handshake.headers?.authorization;
    
    if (!raw) return next();
    
    // Remove Bearer prefix and whitespace
    const token = String(raw)
      .replace(/^\s+|\s+$/g, '')
      .replace(/^(Bearer|JWT|Token)\s+/i, '');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to socket
    socket.user = {
      id: decoded.userId ? String(decoded.userId) : undefined,
      type: decoded.type || 'user',
      tv: decoded.tv || 1,
    };
    socket.authToken = `Bearer ${token}`;
    
    return next();
  } catch (e) {
    return next();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = require('./jwtUtils');

/**
 * ============================================================================
 * AUTHENTICATION VALIDATORS - JOI VALIDATION SCHEMAS
 * ============================================================================
 * 
 * This module provides Joi validation schemas for authentication endpoints.
 * All schemas are **exactly aligned** with the current `authController.js`.
 * 
 * SUPPORTED ENDPOINTS:
 * - POST /api/auth/register
 * - POST /api/auth/login          → email + password only
 * - POST /api/auth/request-otp
 * - POST /api/auth/verify-otp
 * 
 * USAGE:
 * ```javascript
 * const { validateRequest } = require('./middleware/validator');
 * const { loginSchema } = require('./validators/authValidators');
 * 
 * router.post('/login', validateRequest(loginSchema), authController.login);
 * ```
 */

'use strict';

const Joi = require('joi');
const { PHONE_REGEX } = require('../utils/phone');

/**
 * Validation schema for user registration
 * 
 * @example
 * POST /api/auth/register
 * {
 *   "username": "John",
 *   "email": "john@example.com",
 *   "phone": "0912345678",
 *   "password": "SecurePass123!"
 * }
 */
const registerSchema = Joi.object({
  params: Joi.object({}).unknown(true),
  query: Joi.object({}).unknown(true),
  body: Joi.object({
    username: Joi.string()
      .min(2)
      .max(50)
      .trim()
      .optional()
      .messages({
        'string.min': 'Username must be at least 2 characters',
        'string.max': 'Username must not exceed 50 characters'
      }),

    email: Joi.string()
      .email({ tlds: { allow: false } })
      .optional()
      .messages({
        'string.email': 'Invalid email format'
      }),

    phone: Joi.string()
      .pattern(PHONE_REGEX)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid phone number. Use 09XXXXXXXX, 07XXXXXXXX, or +2519XXXXXXXX'
      }),

    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
      }),

    authProvider: Joi.string()
      .valid('password', 'phone')
      .default('password')
      .optional()
  }).required()
    .or('email', 'phone') // At least one of email or phone
    .messages({
      'object.missing': 'At least one of email or phone is required'
    }),
  headers: Joi.object().unknown(true)
});

/**
 * Validation schema for login (email + password only)
 * 
 * @example
 * POST /api/auth/login
 * {
 *   "email": "john@example.com",
 *   "password": "SecurePass123!"
 * }
 */
const loginSchema = Joi.object({
  params: Joi.object({}).unknown(true),
  query: Joi.object({}).unknown(true),
  body: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        'string.email': 'Invalid email format',
        'any.required': 'Email is required'
      }),

    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
      })
  }).required(),
  headers: Joi.object().unknown(true)
});

/**
 * Validation schema for OTP request
 * 
 * @example
 * POST /api/auth/request-otp
 * {
 *   "phone": "0912345678"
 * }
 */
const requestOtpSchema = Joi.object({
  params: Joi.object({}).unknown(true),
  query: Joi.object({}).unknown(true),
  body: Joi.object({
    phone: Joi.string()
      .pattern(PHONE_REGEX)
      .required()
      .messages({
        'string.pattern.base': 'Invalid phone number format. Use 09XXXXXXXX, 07XXXXXXXX, or +2519XXXXXXXX',
        'any.required': 'Phone number is required'
      })
  }).required(),
  headers: Joi.object().unknown(true)
});

/**
 * Validation schema for OTP verification
 * 
 * @example
 * POST /api/auth/verify-otp
 * {
 *   "phone": "0912345678",
 *   "otp": "123456"
 * }
 */
const verifyOtpSchema = Joi.object({
  params: Joi.object({}).unknown(true),
  query: Joi.object({}).unknown(true),
  body: Joi.object({
    phone: Joi.string()
      .pattern(PHONE_REGEX)
      .required()
      .messages({
        'string.pattern.base': 'Invalid phone number format',
        'any.required': 'Phone number is required'
      }),

    otp: Joi.string()
      .length(6)
      .pattern(/^[0-9]{6}$/)
      .required()
      .messages({
        'string.length': 'OTP must be exactly 6 digits',
        'string.pattern.base': 'OTP must contain only numbers',
        'any.required': 'OTP is required'
      })
  }).required(),
  headers: Joi.object().unknown(true)
});

/**
 * Validation schema for checking username availability
 * 
 * @example
 * GET /api/auth/check-username/johndoe
 */
const checkUsernameSchema = Joi.object({
  params: Joi.object({
    username: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'any.required': 'Username is required in URL',
        'string.min': 'Username too short',
        'string.max': 'Username too long'
      })
  }).required(),
  query: Joi.object({}).unknown(true),
  body: Joi.object({}).unknown(true),
  headers: Joi.object().unknown(true)
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  registerSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  checkUsernameSchema
};
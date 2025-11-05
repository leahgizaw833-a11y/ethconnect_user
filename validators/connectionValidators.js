/**
 * ============================================================================
 * CONNECTION VALIDATORS - JOI VALIDATION SCHEMAS
 * ============================================================================
 * 
 * This module provides Joi validation schemas for connection endpoints.
 * 
 * SUPPORTED ENDPOINTS:
 * - POST /api/connections/request
 * - PUT /api/connections/:id/respond
 * - DELETE /api/connections/:id
 * 
 * USAGE:
 * ```javascript
 * const { validateRequest } = require('./middleware/validator');
 * const { sendConnectionRequestSchema } = require('./validators/connectionValidators');
 * 
 * router.post('/request', validateRequest(sendConnectionRequestSchema), connectionController.sendRequest);
 * ```
 */

'use strict';

const Joi = require('joi');

/**
 * Validation schema for sending connection request
 * 
 * @example
 * POST /api/connections/request
 * {
 *   "receiverId": "user-uuid-here"
 * }
 */
const sendConnectionRequestSchema = Joi.object({
  params: Joi.object({}).unknown(true),
  query: Joi.object({}).unknown(true),
  body: Joi.object({
    receiverId: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.empty': 'Receiver ID is required',
        'string.guid': 'Receiver ID must be a valid UUID',
        'any.required': 'Receiver ID is required'
      })
  })
});

/**
 * Validation schema for responding to connection request
 * 
 * @example
 * PUT /api/connections/:id/respond
 * {
 *   "action": "accept" // or "reject"
 * }
 */
const respondToConnectionSchema = Joi.object({
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.empty': 'Connection ID is required',
        'string.guid': 'Connection ID must be a valid UUID',
        'any.required': 'Connection ID is required'
      })
  }),
  query: Joi.object({}).unknown(true),
  body: Joi.object({
    action: Joi.string()
      .valid('accept', 'reject')
      .required()
      .messages({
        'string.empty': 'Action is required',
        'any.only': 'Action must be either "accept" or "reject"',
        'any.required': 'Action is required'
      })
  })
});

/**
 * Validation schema for removing connection
 * 
 * @example
 * DELETE /api/connections/:id
 */
const removeConnectionSchema = Joi.object({
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.empty': 'Connection ID is required',
        'string.guid': 'Connection ID must be a valid UUID',
        'any.required': 'Connection ID is required'
      })
  }),
  query: Joi.object({}).unknown(true),
  body: Joi.object({}).unknown(true)
});

module.exports = {
  sendConnectionRequestSchema,
  respondToConnectionSchema,
  removeConnectionSchema
};

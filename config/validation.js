const Joi = require('joi');

// Custom sanitization function
const sanitizeString = (value, helpers) => {
  if (typeof value !== 'string') return value;
  
  // Remove HTML tags and dangerous characters
  return value
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
};

// Common validation schemas
const schemas = {
  // User Registration
  register: Joi.object({
    username: Joi.string()
      .min(3)
      .max(120)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .custom(sanitizeString)
      .required()
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, underscores, and hyphens',
        'string.min': 'Username must be at least 3 characters',
        'string.max': 'Username cannot exceed 120 characters',
      }),
    email: Joi.string()
      .email()
      .max(255)
      .lowercase()
      .custom(sanitizeString)
      .optional()
      .allow(null, ''),
    phone: Joi.string()
      .pattern(/^\+251[79]\d{8}$/)
      .optional()
      .allow(null, '')
      .messages({
        'string.pattern.base': 'Phone must be valid Ethiopian number (+251...)',
      }),
    password: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters',
      }),
    role: Joi.string()
      .valid('employer', 'employee', 'doctor', 'user')
      .optional(),
    authProvider: Joi.string()
      .valid('password', 'google', 'apple', 'phone')
      .default('password'),
  }).or('email', 'phone'),

  // User Login
  login: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .custom(sanitizeString)
      .required(),
    password: Joi.string()
      .required(),
  }),

  // Admin Login
  adminLogin: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .custom(sanitizeString)
      .required(),
    password: Joi.string()
      .required(),
  }),

  // Create Admin
  createAdmin: Joi.object({
    username: Joi.string()
      .min(3)
      .max(120)
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .custom(sanitizeString)
      .required(),
    email: Joi.string()
      .email()
      .max(255)
      .lowercase()
      .custom(sanitizeString)
      .required(),
    password: Joi.string()
      .min(6)
      .max(128)
      .required(),
    phone: Joi.string()
      .pattern(/^\+251[79]\d{8}$/)
      .optional()
      .allow(null, ''),
  }),

  // Profile Update
  updateProfile: Joi.object({
    fullName: Joi.string()
      .max(160)
      .custom(sanitizeString)
      .optional(),
    bio: Joi.string()
      .max(1000)
      .custom(sanitizeString)
      .optional(),
    profession: Joi.string()
      .max(120)
      .custom(sanitizeString)
      .optional(),
    languages: Joi.array()
      .items(Joi.string().max(10))
      .max(10)
      .optional(),
    photoUrl: Joi.string()
      .uri()
      .max(500)
      .optional(),
    gender: Joi.string()
      .valid('male', 'female', 'other')
      .optional(),
    age: Joi.number()
      .integer()
      .min(18)
      .max(120)
      .optional(),
    religion: Joi.string()
      .max(100)
      .custom(sanitizeString)
      .optional(),
    ethnicity: Joi.string()
      .max(100)
      .custom(sanitizeString)
      .optional(),
    education: Joi.string()
      .max(120)
      .custom(sanitizeString)
      .optional(),
    interests: Joi.array()
      .items(Joi.string().max(50).custom(sanitizeString))
      .max(20)
      .optional(),
  }),

  // Verification Submission
  submitVerification: Joi.object({
    type: Joi.string()
      .valid('kyc', 'doctor_license', 'teacher_cert', 'business_license', 'employer_cert', 'other')
      .required(),
    notes: Joi.string()
      .max(1000)
      .custom(sanitizeString)
      .optional()
      .allow(null, ''),
  }),

  // Update Verification Status
  updateVerification: Joi.object({
    status: Joi.string()
      .valid('approved', 'rejected')
      .required(),
    notes: Joi.string()
      .max(1000)
      .custom(sanitizeString)
      .optional()
      .allow(null, ''),
  }),

  // OTP Request
  requestOTP: Joi.object({
    phone: Joi.string()
      .pattern(/^\+251[79]\d{8}$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone must be valid Ethiopian number (+251...)',
      }),
  }),

  // OTP Verify
  verifyOTP: Joi.object({
    phone: Joi.string()
      .pattern(/^\+251[79]\d{8}$/)
      .required(),
    otp: Joi.string()
      .length(6)
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        'string.length': 'OTP must be 6 digits',
        'string.pattern.base': 'OTP must contain only numbers',
      }),
  }),

  // OTP Login
  otpLogin: Joi.object({
    phone: Joi.string()
      .pattern(/^\+251[79]\d{8}$/)
      .required(),
    otp: Joi.string()
      .length(6)
      .pattern(/^\d{6}$/)
      .required(),
  }),

  // Refresh Token
  refreshToken: Joi.object({
    refreshToken: Joi.string()
      .required(),
  }),

  // Create Role
  createRole: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-z_]+$/)
      .custom(sanitizeString)
      .required()
      .messages({
        'string.pattern.base': 'Role name must be lowercase letters and underscores only',
      }),
  }),

  // Update User Status
  updateUserStatus: Joi.object({
    status: Joi.string()
      .valid('active', 'inactive', 'suspended')
      .required(),
  }),

  // UUID Parameter
  uuidParam: Joi.object({
    id: Joi.string()
      .uuid()
      .required(),
  }),
};

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: '',
        },
      },
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Replace request data with sanitized values
    req[property] = value;
    next();
  };
};

module.exports = {
  schemas,
  validate,
};

const { validationResult } = require('express-validator');

function handleValidationErrors(req, res, next) {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({
				success: false,
				message: 'Validation failed',
				errors: errors.array()
			});
		}
		return next();
	} catch (err) {
		console.error('Validation middleware error:', err);
		return res.status(500).json({ success: false, message: 'Validation middleware error' });
	}
}

/**
 * Joi validation middleware
 * @param {Object} schema - Joi schema object
 */
function validateRequest(schema) {
	return (req, res, next) => {
		const { error } = schema.validate({
			body: req.body,
			query: req.query,
			params: req.params
		}, { abortEarly: false });

		if (error) {
			const errors = error.details.map(detail => ({
				field: detail.path.join('.'),
				message: detail.message
			}));

			return res.status(400).json({
				success: false,
				message: 'Validation failed',
				errors
			});
		}

		next();
	};
}

module.exports = { handleValidationErrors, validateRequest };

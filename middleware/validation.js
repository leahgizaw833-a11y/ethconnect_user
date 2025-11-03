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

module.exports = { handleValidationErrors };

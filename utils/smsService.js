const axios = require('axios');

function _stringify(info) {
	 if (info && typeof info === 'object') {
		 try { return JSON.stringify(info); } catch (e) { return String(info); }
	 }
	 return String(info);
}

/**
 * sendSms - send SMS using GeezSMS /sms/send endpoint.
 * Throws if provider not configured or request fails.
 * Returns { success: true, info, status, used } on success where `used` is { url, payload }.
 */
async function sendSms(phoneNumber, message) {
	const providerBase = (process.env.GEEZSMS_BASE_URL || process.env.GEEZSMS_URL || '').replace(/\/+$/, '');
	const providerToken = process.env.GEEZSMS_TOKEN;
	if (!providerBase || !providerToken) {
		throw new Error('SMS provider not configured: set GEEZSMS_BASE_URL (or GEEZSMS_URL) and GEEZSMS_TOKEN in your environment');
	}

	const url = `${providerBase}/sms/send`;

	// Normalize phone for provider: remove all non-digits (provider usually expects digits, e.g. 2519xxxxxxx)
	const providerPhone = String(phoneNumber).replace(/\D/g, '');

	const payload = {
		phone: providerPhone,
		msg: message
	};

	// Normalize sender id: prefer GEEZSMS_SHORTCODE_ID then SMS_SENDER_ID
	const rawSender = process.env.GEEZSMS_SHORTCODE_ID ?? process.env.SMS_SENDER_ID;
	if (typeof rawSender !== 'undefined' && rawSender !== null && String(rawSender).trim() !== '') {
		const parsed = parseInt(String(rawSender).trim(), 10);
		if (!Number.isNaN(parsed)) {
			// numeric shortcode/sender id required by provider
			payload.sender_id = parsed;
		} else {
			// provider may accept a textual sender (try 'sender' field)
			payload.sender = String(rawSender).trim();
		}
	}

	const headers = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${providerToken}`,
		'X-GeezSMS-Key': providerToken
	};

	try {
		const resp = await axios.post(url, payload, { headers, timeout: 15000 });
		// treat 2xx as success
		if (resp.status >= 200 && resp.status < 300) {
			// return used payload and url for diagnostics
			return { success: true, info: resp.data, status: resp.status, used: { url, payload } };
		}
		// non-2xx — surface body
		const body = _stringify(resp.data);
		throw new Error(`SMS provider returned status ${resp.status}: ${body}`);
	} catch (err) {
		const status = err?.response?.status;
		const body = err?.response?.data ?? err.message ?? String(err);
		const bodyStr = _stringify(body);
		// log detailed info for debugging
		console.error('SMS provider error', { url, status, body: bodyStr, attemptedPayload: payload });
		if (status) throw new Error(`SMS provider error (status ${status}): ${bodyStr}`);
		throw new Error(`SMS provider error: ${bodyStr}`);
	}
}

module.exports = { sendSms };

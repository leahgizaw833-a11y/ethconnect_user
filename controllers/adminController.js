const fs = require('fs');
const path = require('path');
const { sendSms } = require('../utils/smsService');

class AdminController {
	// GET /auth/admin/sms-attempts?limit=20
	async getSmsAttempts(req, res) {
		try {
			const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);
			const logPath = path.join(__dirname, '..', 'logs', 'sms_attempts.log');
			if (!fs.existsSync(logPath)) {
				return res.json({ success: true, data: [] });
			}

			const raw = fs.readFileSync(logPath, 'utf8');
			const lines = raw.split('\n').filter(Boolean);
			const selected = lines.slice(-limit).reverse(); // latest first

			const parsed = selected.map(line => {
				try { return JSON.parse(line); }
				catch (e) { return { raw: line }; }
			});

			return res.json({ success: true, data: parsed });
		} catch (error) {
			console.error('Get SMS attempts error:', error);
			return res.status(500).json({ success: false, message: 'Failed to read sms attempts' });
		}
	}

	// POST /auth/admin/resend
	// body: { api_log_id?: number, index?: number } (index = 0 means most recent)
	async resendSmsAttempt(req, res) {
		try {
			const { api_log_id, index } = req.body;
			const logPath = path.join(__dirname, '..', 'logs', 'sms_attempts.log');
			if (!fs.existsSync(logPath)) return res.status(404).json({ success: false, message: 'No SMS attempt logs found' });

			const raw = fs.readFileSync(logPath, 'utf8');
			const lines = raw.split('\n').filter(Boolean).map(line => {
				try { return JSON.parse(line); } catch (e) { return null; }
			}).filter(Boolean);

			if (!lines.length) return res.status(404).json({ success: false, message: 'No SMS attempts available' });

			let target = null;

			if (typeof api_log_id !== 'undefined' && api_log_id !== null) {
				// find by provider api_log_id in providerInfo or provider.data
				target = lines.find(l => {
					const info = l.provider || l.otpResult?.providerInfo || l.providerInfo || null;
					const data = info && info.info && info.info.data ? info.info.data : (info && info.data ? info.data : null);
					return data && (data.api_log_id === api_log_id || String(data.api_log_id) === String(api_log_id));
				});
			}

			if (!target && typeof index !== 'undefined' && index !== null) {
				// index 0 => newest
				const idx = Number(index);
				if (Number.isNaN(idx)) return res.status(400).json({ success: false, message: 'Invalid index' });
				const rev = lines.slice().reverse();
				if (idx < 0 || idx >= rev.length) return res.status(400).json({ success: false, message: 'Index out of range' });
				target = rev[idx];
			}

			// fallback: if neither provided, pick last
			if (!target) target = lines[lines.length - 1];

			// attempt to extract a payload
			const payloadCandidate = target.sentPayload || (target.provider && target.provider.used && target.provider.used.payload) || (target.otpResult && target.otpResult.sentPayload && target.otpResult.sentPayload.payload) || null;
			if (!payloadCandidate || !payloadCandidate.phone || !payloadCandidate.msg) {
				return res.status(400).json({ success: false, message: 'No sent payload found in selected log entry' });
			}

			// call sendSms with the same payload (phone may be digits or e164)
			const phone = payloadCandidate.phone;
			const msg = payloadCandidate.msg;

			let sendResult;
			try {
				sendResult = await sendSms(phone, msg);
			} catch (err) {
				// log resend failure and return error
				const entry = { ts: new Date().toISOString(), action: 'resend_failed', userId: target.userId || null, phone: phone, providerError: err.message || String(err), sourceLog: target };
				try { fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8'); } catch (_) { /* ignore */ }
				return res.status(502).json({ success: false, message: 'Resend failed', error: err.message || String(err) });
			}

			// log successful resend
			try {
				const entry = { ts: new Date().toISOString(), action: 'resend_success', userId: target.userId || null, phone: phone, provider: sendResult, sourceLog: target };
				fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
			} catch (logErr) {
				console.error('Failed to write resend log:', logErr);
			}

			return res.json({ success: true, message: 'Resend attempt completed', provider: sendResult });
		} catch (error) {
			console.error('Resend SMS attempt error:', error);
			return res.status(500).json({ success: false, message: 'Resend failed', error: error.message || String(error) });
		}
	}
}

module.exports = new AdminController();

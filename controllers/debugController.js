const fs = require('fs');
const path = require('path');

class DebugController {
  // GET /auth/debug/my-sms-attempts?limit=20
  async getMySmsAttempts(req, res) {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);
      const logPath = path.join(__dirname, '..', 'logs', 'sms_attempts.log');
      if (!fs.existsSync(logPath)) {
        return res.json({ success: true, data: [] });
      }

      const raw = fs.readFileSync(logPath, 'utf8');
      const lines = raw.split('\n').filter(Boolean);
      const parsed = lines.map(line => {
        try { return JSON.parse(line); } catch (e) { return { raw: line }; }
      }).reverse(); // newest first

      // filter by authenticated user id or phone
      const userId = req.user && req.user.id;
      const userPhone = req.user && req.user.phone;
      const filtered = parsed.filter(entry => {
        if (!entry) return false;
        if (userId && entry.userId && String(entry.userId) === String(userId)) return true;
        if (userPhone && entry.phone && String(entry.phone).replace(/\D/g,'') === String(userPhone).replace(/\D/g,'')) return true;
        // also allow entries where otpResult.referenceId matches userId
        if (entry.otpResult && entry.otpResult.referenceId && String(entry.otpResult.referenceId) === String(userId)) return true;
        return false;
      }).slice(0, limit);

      return res.json({ success: true, data: filtered });
    } catch (error) {
      console.error('Get my SMS attempts error:', error);
      return res.status(500).json({ success: false, message: 'Failed to read sms attempts' });
    }
  }
}

module.exports = new DebugController();

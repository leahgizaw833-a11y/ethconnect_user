const axios = require('axios');

/**
 * Single SMS Utility - GeezSMS Integration
 */
class SingleSMSUtil {
    constructor(config) {
        this.token = config.token;
        this.baseUrl = config.baseUrl || 'https://api.geezsms.com/api/v1';
        this.senderId = config.senderId;
        this.shortcodeId = config.shortcodeId;
    }

    async sendSingleSMS({ phone, msg }) {
        try {
            const payload = {
                token: this.token,
                phone: phone,
                msg: msg
            };

            // Add optional fields if configured
            if (this.senderId) {
                payload.sender = this.senderId;
            }
            if (this.shortcodeId) {
                payload.shortcode = this.shortcodeId;
            }

            const response = await axios.post(`${this.baseUrl}/sms/send`, payload);

            if (response.data.error === false) {
                return {
                    success: true,
                    messageId: response.data.data?.api_log_id,
                    message: response.data.msg
                };
            } else {
                throw new Error(response.data.msg || 'SMS sending failed');
            }
        } catch (error) {
            if (error.response) {
                throw new Error(error.response.data.msg || 'Failed to send SMS');
            }
            throw error;
        }
    }
}

async function createSingleSMSUtil(config) {
    return new SingleSMSUtil(config);
}

module.exports = require('./smsService');

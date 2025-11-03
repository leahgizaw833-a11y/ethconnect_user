const axios = require('axios');
require('dotenv').config();

async function testGeezSMS() {
  const token = process.env.GEEZSMS_TOKEN;
  const phone = '+251941893993'; // Your phone number
  const baseUrl = process.env.GEEZSMS_BASE_URL || 'https://api.geezsms.com/api/v1';

  console.log('Testing GeezSMS with:');
  console.log('- Token:', token ? token.substring(0, 10) + '...' : 'MISSING');
  console.log('- Phone:', phone);
  console.log('- URL:', baseUrl);
  console.log('\nSending test SMS...\n');

  try {
    const response = await axios.post(`${baseUrl}/sms/send`, {
      token: token,
      phone: phone,
      msg: 'TEST: If you receive this, your GeezSMS is working!',
      sender: process.env.SMS_SENDER_ID || undefined
    });

    console.log('✅ SUCCESS!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\nCheck your phone for the test message!');
    console.log('If you still don\'t receive it, contact GeezSMS support.');

  } catch (error) {
    console.error('❌ ERROR!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testGeezSMS();

/**
 * Normalize Ethiopian phone number to E.164 format (+251XXXXXXXXX)
 */
const normalizeEthiopianPhone = (phone) => {
  if (!phone) return null;

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Handle different formats
  if (cleaned.startsWith('251')) {
    // Already in 251XXXXXXXXX format
    return '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    // 09XXXXXXXX or 07XXXXXXXX format
    return '+251' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    // 9XXXXXXXX format
    return '+251' + cleaned;
  } else if (cleaned.length === 12 && cleaned.startsWith('251')) {
    // 251XXXXXXXXX format
    return '+' + cleaned;
  }

  // Invalid format
  return null;
};

/**
 * Validate Ethiopian phone number
 */
const isValidEthiopianPhone = (phone) => {
  const normalized = normalizeEthiopianPhone(phone);
  if (!normalized) return false;

  // Should be +251 followed by 9 digits starting with 9 or 7
  const pattern = /^\+251[97]\d{8}$/;
  return pattern.test(normalized);
};

/**
 * Format phone number for display
 */
const formatPhoneForDisplay = (phone) => {
  const normalized = normalizeEthiopianPhone(phone);
  if (!normalized) return phone;

  // Format as +251 9XX XXX XXX
  const match = normalized.match(/^\+251(\d{3})(\d{3})(\d{3})$/);
  if (match) {
    return `+251 ${match[1]} ${match[2]} ${match[3]}`;
  }

  return normalized;
};

/**
 * Alternative validation (stricter pattern matching)
 */
const isValidPhone = (input) => {
  if (!input || typeof input !== 'string') return false;
  
  const digits = input.replace(/\D/g, '');
  
  const patterns = [
    /^09\d{8}$/,        // 09XXXXXXXX
    /^07\d{8}$/,        // 07XXXXXXXX
    /^2519\d{8}$/,      // 2519XXXXXXXX
    /^2517\d{8}$/,      // 2517XXXXXXXX
    /^9\d{8}$/,         // 9XXXXXXXX
    /^7\d{8}$/          // 7XXXXXXXX
  ];
  
  return patterns.some(pattern => pattern.test(digits));
};

/**
 * Alternative normalization (stricter error handling)
 */
const normalizePhone = (input) => {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid phone number input');
  }
  
  let digits = input.replace(/\D/g, '');
  
  if (digits.length === 13 && digits.startsWith('2510')) {
    digits = '251' + digits.slice(4); // Fix extra 0
  } else if (digits.length === 10 && (digits.startsWith('09') || digits.startsWith('07'))) {
    digits = '251' + digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('251')) {
    // Already correct
  } else if (digits.length === 9 && (digits.startsWith('9') || digits.startsWith('7'))) {
    digits = '251' + digits;
  } else {
    throw new Error('Invalid Ethiopian phone format');
  }
  
  if (digits.length !== 12 || !digits.startsWith('251')) {
    throw new Error('Failed to normalize phone');
  }
  
  return '+' + digits;
};

module.exports = {
  normalizeEthiopianPhone,
  isValidEthiopianPhone,
  formatPhoneForDisplay,
  isValidPhone,
  normalizePhone
};

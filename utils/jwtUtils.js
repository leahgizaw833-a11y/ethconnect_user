const jwt = require('jsonwebtoken');

function _getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

function sign(payload, options = {}) {
  return jwt.sign(payload, _getSecret(), options);
}

function verify(token) {
  return jwt.verify(token, _getSecret());
}

function decode(token) {
  return jwt.decode(token);
}

function signAccessToken(userPayload, expiresIn = '15m') {
  return sign(userPayload, { expiresIn });
}

function signRefreshToken(userId, expiresIn = '7d') {
  return sign({ id: userId, type: 'refresh' }, { expiresIn });
}

module.exports = {
  sign,
  verify,
  decode,
  signAccessToken,
  signRefreshToken
};
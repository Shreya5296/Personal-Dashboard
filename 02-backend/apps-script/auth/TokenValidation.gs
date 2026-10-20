/**
 * TokenValidation: Zero-GCP cryptographic session token engine.
 * Generates and validates HMAC-SHA256 signed session tokens using server-held secret key.
 */

function computeHmacSignature(value, secretKey) {
  if (!value || !secretKey) return '';
  if (typeof Utilities !== 'undefined' && typeof Utilities.computeHmacSha256Signature === 'function') {
    var rawSig = Utilities.computeHmacSha256Signature(value, secretKey);
    var hex = '';
    for (var i = 0; i < rawSig.length; i++) {
      var byteVal = rawSig[i];
      if (byteVal < 0) byteVal += 256;
      var h = byteVal.toString(16);
      if (h.length === 1) hex += '0';
      hex += h;
    }
    return hex;
  }
  if (typeof require !== 'undefined') {
    var crypto = require('crypto');
    return crypto.createHmac('sha256', secretKey).update(value).digest('hex');
  }
  return '';
}

function base64EncodeString(str) {
  if (typeof Utilities !== 'undefined' && typeof Utilities.base64Encode === 'function') {
    return Utilities.base64Encode(str);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  return '';
}

function base64DecodeString(base64) {
  if (typeof Utilities !== 'undefined' && typeof Utilities.base64Decode === 'function') {
    return Utilities.newBlob(Utilities.base64Decode(base64)).getDataAsString();
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf-8');
  }
  return '';
}

function createHmacSessionToken(email, secretKey, ttlSeconds) {
  var nowSec = Math.floor(Date.now() / 1000);
  var ttl = ttlSeconds || (8 * 3600); // 8-hour default validity
  var nonce = (typeof Utilities !== 'undefined' && typeof Utilities.getUuid === 'function')
    ? Utilities.getUuid()
    : (Math.random().toString(36).substring(2) + Date.now().toString(36));

  var payload = {
    email: email.toLowerCase().trim(),
    actorId: 'usr_' + email.toLowerCase().trim(),
    iss: 'personal-dashboard-backend',
    iat: nowSec,
    exp: nowSec + ttl,
    nonce: nonce
  };

  var payloadJson = JSON.stringify(payload);
  var payloadBase64 = base64EncodeString(payloadJson);
  var signature = computeHmacSignature(payloadBase64, secretKey);

  return payloadBase64 + '.' + signature;
}

function validateHmacSessionToken(token, secretKey, allowlist) {
  if (!token || typeof token !== 'string') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Missing session token' };
  }

  var parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Malformed session token' };
  }

  var payloadBase64 = parts[0];
  var providedSig = parts[1];

  var expectedSig = computeHmacSignature(payloadBase64, secretKey);
  if (!expectedSig || providedSig.length !== expectedSig.length) {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Invalid token signature' };
  }

  var diff = 0;
  for (var i = 0; i < providedSig.length; i++) {
    diff |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  if (diff !== 0) {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Invalid token signature' };
  }

  var payloadJson = base64DecodeString(payloadBase64);
  if (!payloadJson) {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Failed to decode token payload' };
  }

  var payload = null;
  try {
    payload = JSON.parse(payloadJson);
  } catch (e) {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Corrupt token payload' };
  }

  if (payload.iss !== 'personal-dashboard-backend') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Invalid token issuer' };
  }

  var nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || Number(payload.exp) < nowSec) {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Session token has expired' };
  }

  if (!payload.email || typeof payload.email !== 'string') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Token missing email identity' };
  }

  var cleanEmail = payload.email.toLowerCase().trim();
  if (allowlist && Array.isArray(allowlist) && allowlist.length > 0) {
    if (allowlist.indexOf(cleanEmail) === -1) {
      return { valid: false, code: 'FORBIDDEN', message: 'Identity is not authorized' };
    }
  }

  return {
    valid: true,
    email: cleanEmail,
    actorId: payload.actorId || ('usr_' + cleanEmail)
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createHmacSessionToken: createHmacSessionToken,
    validateHmacSessionToken: validateHmacSessionToken,
    computeHmacSignature: computeHmacSignature
  };
}

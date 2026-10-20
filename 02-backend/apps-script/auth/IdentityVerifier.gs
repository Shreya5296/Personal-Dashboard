/**
 * IdentityVerifier: Cryptographic token verification service.
 * Verifies server-issued HMAC-SHA256 session tokens against the secret key and admin allowlist.
 * Zero GCP dependency: Does not require Google Cloud Console or external OAuth endpoints.
 */

var _validateHmac = typeof validateHmacSessionToken === 'function' ? validateHmacSessionToken : (typeof require !== 'undefined' ? require('./TokenValidation.gs').validateHmacSessionToken : null);
var _getAllowlist = typeof getAdminAllowlist === 'function' ? getAdminAllowlist : (typeof require !== 'undefined' ? require('./AdminAuthorization.gs').getAdminAllowlist : null);

var _testMockAuthEnabled = false;

function setTestMockAuthEnabled(enabled) {
  _testMockAuthEnabled = !!enabled;
}

function verifyIdentityToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Missing identity token' };
  }

  // Reject mock tokens in production runtime unconditionally
  if (token.indexOf('mock_token_for_') === 0 || token === 'mock_admin_token') {
    if (typeof UrlFetchApp !== 'undefined') {
      return { valid: false, code: 'UNAUTHORIZED', message: 'Synthetic mock tokens are rejected in production runtime' };
    }
    if (_testMockAuthEnabled || (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test')) {
      var email = token.replace('mock_token_for_', '').replace('mock_admin_token', 'ashreya0502@gmail.com').toLowerCase().trim();
      return { valid: true, email: email, actorId: 'usr_' + email };
    }
    return { valid: false, code: 'UNAUTHORIZED', message: 'Mock authentication is disabled' };
  }

  var secretKey = null;
  if (typeof PropertiesService !== 'undefined') {
    var props = PropertiesService.getScriptProperties();
    if (props) {
      secretKey = props.getProperty('ADMIN_AUTH_KEY') || props.getProperty('ADMIN_SECRET_KEY');
    }
  }

  // Fallback for test runner in Node.js
  if (!secretKey && typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
    secretKey = 'test_admin_secret_key_123';
  }

  if (!secretKey) {
    return { valid: false, code: 'CONFIGURATION_ERROR', message: 'ADMIN_AUTH_KEY is not configured in Script Properties' };
  }

  var allowlist = _getAllowlist ? _getAllowlist() : ['ashreya0502@gmail.com'];
  if (_validateHmac) {
    return _validateHmac(token, secretKey, allowlist);
  }

  return { valid: false, code: 'UNAUTHORIZED', message: 'Token validator unavailable' };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    verifyIdentityToken: verifyIdentityToken,
    setTestMockAuthEnabled: setTestMockAuthEnabled
  };
}

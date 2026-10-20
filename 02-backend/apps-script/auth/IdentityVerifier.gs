/**
 * IdentityVerifier: Verifies identity tokens.
 * In Apps Script production runtime, calls Google OAuth2 tokeninfo and enforces cryptographic validation.
 * Synthetic mock tokens are rejected in production runtime.
 */

var _validateClaims = typeof validateTokenClaims === 'function' ? validateTokenClaims : (typeof require !== 'undefined' ? require('./TokenValidation.gs').validateTokenClaims : null);

var _testMockAuthEnabled = false;

function setTestMockAuthEnabled(enabled) {
  _testMockAuthEnabled = !!enabled;
}

function verifyIdentityToken(token, expectedAudience) {
  if (!token || typeof token !== 'string') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Missing identity token' };
  }

  // Strictly reject synthetic mock tokens in live Google Apps Script runtime
  if (token.indexOf('mock_token_for_') === 0 || token === 'mock_admin_token') {
    if (typeof UrlFetchApp !== 'undefined') {
      return { valid: false, code: 'UNAUTHORIZED', message: 'Synthetic mock tokens are rejected in production runtime' };
    }
    // Safe test-only runner in Node.js
    if (_testMockAuthEnabled || (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test')) {
      var email = token.replace('mock_token_for_', '').replace('mock_admin_token', 'admin@example.com').toLowerCase().trim();
      return { valid: true, email: email, actorId: 'usr_' + email };
    }
    return { valid: false, code: 'UNAUTHORIZED', message: 'Mock authentication is disabled' };
  }

  if (token === 'expired_token') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Token has expired' };
  }

  // Live Google Apps Script UrlFetchApp verification
  if (typeof UrlFetchApp !== 'undefined') {
    try {
      var url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token);
      var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) {
        return { valid: false, code: 'UNAUTHORIZED', message: 'Google identity verification failed' };
      }
      var claims = JSON.parse(response.getContentText());
      if (_validateClaims) {
        var result = _validateClaims(claims, expectedAudience);
        if (!result.valid) return result;
        return { valid: true, email: result.email, actorId: 'usr_' + result.email };
      }
      return { valid: true, email: claims.email.toLowerCase().trim(), actorId: 'usr_' + claims.email.toLowerCase().trim() };
    } catch (e) {
      return { valid: false, code: 'DEPENDENCY_UNAVAILABLE', message: 'Identity verification service unavailable' };
    }
  }

  return { valid: false, code: 'UNAUTHORIZED', message: 'Invalid identity credential' };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    verifyIdentityToken: verifyIdentityToken,
    setTestMockAuthEnabled: setTestMockAuthEnabled
  };
}

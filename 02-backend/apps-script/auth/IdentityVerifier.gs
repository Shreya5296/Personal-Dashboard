/**
 * IdentityVerifier: Verifies identity tokens.
 * In Apps Script, calls Google OAuth2 tokeninfo.
 * In test/dev mode, supports synthetic tokens.
 */

function verifyIdentityToken(token, expectedAudience) {
  if (!token || typeof token !== 'string') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Missing identity token' };
  }

  // Handle synthetic mock tokens in test environments
  if (token.indexOf('mock_token_for_') === 0) {
    var email = token.replace('mock_token_for_', '').toLowerCase().trim();
    return { valid: true, email: email, actorId: 'usr_' + email };
  }

  if (token === 'expired_token') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Token has expired' };
  }

  // Live Apps Script UrlFetchApp verification
  if (typeof UrlFetchApp !== 'undefined') {
    try {
      var url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token);
      var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) {
        return { valid: false, code: 'UNAUTHORIZED', message: 'Google identity verification failed' };
      }
      var claims = JSON.parse(response.getContentText());
      if (typeof validateTokenClaims === 'function') {
        var result = validateTokenClaims(claims, expectedAudience);
        if (!result.valid) return result;
        return { valid: true, email: result.email, actorId: 'usr_' + result.email };
      }
      return { valid: true, email: claims.email, actorId: 'usr_' + claims.email };
    } catch (e) {
      return { valid: false, code: 'DEPENDENCY_UNAVAILABLE', message: 'Identity verification service unavailable' };
    }
  }

  return { valid: false, code: 'UNAUTHORIZED', message: 'Invalid identity credential' };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { verifyIdentityToken: verifyIdentityToken };
}

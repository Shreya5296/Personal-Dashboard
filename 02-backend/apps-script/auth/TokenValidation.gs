/**
 * TokenValidation: Validates Google identity token claims, audience, issuer, expiry, and email status.
 */

function validateTokenClaims(claims, expectedAudience) {
  if (!claims || typeof claims !== 'object') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Missing token claims' };
  }

  // 1. Expiration check
  var nowSec = Math.floor(Date.now() / 1000);
  if (!claims.exp || Number(claims.exp) < nowSec) {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Token has expired' };
  }

  // 2. Issuer check
  var validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!claims.iss || validIssuers.indexOf(claims.iss) === -1) {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Invalid token issuer' };
  }

  // 3. Email presence check
  if (!claims.email || typeof claims.email !== 'string') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Token is missing email claim' };
  }

  // 4. Verified email check
  if (claims.email_verified !== true && claims.email_verified !== 'true') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Google account email is not verified' };
  }

  // 5. Audience check (against configured Google OAuth Client ID)
  if (expectedAudience) {
    if (!claims.aud || claims.aud !== expectedAudience) {
      return { valid: false, code: 'UNAUTHORIZED', message: 'Token audience does not match configured client ID' };
    }
  }

  return {
    valid: true,
    email: claims.email.toLowerCase().trim()
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateTokenClaims: validateTokenClaims };
}

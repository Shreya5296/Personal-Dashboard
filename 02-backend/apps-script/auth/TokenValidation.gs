/**
 * TokenValidation: Validates token claims, expiry, and issuer.
 */

function validateTokenClaims(claims, expectedAudience) {
  if (!claims || typeof claims !== 'object') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Missing token claims' };
  }

  // Expiry check
  if (claims.exp) {
    var nowSec = Math.floor(Date.now() / 1000);
    if (claims.exp < nowSec) {
      return { valid: false, code: 'UNAUTHORIZED', message: 'Token has expired' };
    }
  }

  // Audience check
  if (expectedAudience && claims.aud !== expectedAudience) {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Token audience does not match' };
  }

  // Issuer check
  if (claims.iss) {
    var validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (validIssuers.indexOf(claims.iss) === -1) {
      return { valid: false, code: 'UNAUTHORIZED', message: 'Invalid token issuer' };
    }
  }

  if (!claims.email) {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Token is missing email claim' };
  }

  return { valid: true, email: claims.email.toLowerCase().trim() };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateTokenClaims: validateTokenClaims };
}

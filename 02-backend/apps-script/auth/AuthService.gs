/**
 * AuthService: Authenticates administrator access and issues cryptographically signed session tokens.
 * Zero GCP dependency: Validates access key against Script Properties and creates HMAC-SHA256 token.
 * Security controls: Fixed-length constant-time SHA-256 hash comparison and CacheService throttling.
 */

var _createToken = typeof createHmacSessionToken === 'function' ? createHmacSessionToken : (typeof require !== 'undefined' ? require('./TokenValidation.gs').createHmacSessionToken : null);
var _computeSig = typeof computeHmacSignature === 'function' ? computeHmacSignature : (typeof require !== 'undefined' ? require('./TokenValidation.gs').computeHmacSignature : null);

function sha256Hex(val) {
  if (_computeSig) {
    // SHA-256 hash using fixed HMAC key
    return _computeSig(val, 'smd_auth_salt_key');
  }
  if (typeof require !== 'undefined') {
    var crypto = require('crypto');
    return crypto.createHash('sha256').update(val).digest('hex');
  }
  return '';
}

function handleAuthLogin(payload) {
  // 1. Throttling check via CacheService
  var cache = null;
  if (typeof CacheService !== 'undefined' && typeof CacheService.getScriptCache === 'function') {
    try {
      cache = CacheService.getScriptCache();
      if (cache && cache.get('auth_lockout')) {
        return {
          success: false,
          code: 'RATE_LIMITED',
          message: 'Too many failed login attempts. Please wait 60 seconds.'
        };
      }
    } catch (cacheErr) {
      // Non-fatal cache lookup failure
    }
  }

  // 2. Validate payload input
  var candidateKey = payload && (payload.key || payload.adminKey || payload.authKey);
  if (!payload || typeof payload !== 'object' || !candidateKey) {
    return { success: false, code: 'UNAUTHORIZED', message: 'Missing administrator access key' };
  }

  candidateKey = String(candidateKey).trim();
  var secretKey = null;
  var adminEmails = [];

  if (typeof PropertiesService !== 'undefined') {
    var props = PropertiesService.getScriptProperties();
    if (props) {
      secretKey = props.getProperty('ADMIN_AUTH_KEY') || props.getProperty('ADMIN_SECRET_KEY');
      var emailsStr = props.getProperty('ADMIN_EMAILS') || props.getProperty('ADMIN_EMAIL');
      if (emailsStr) {
        adminEmails = emailsStr.split(',').map(function(e) { return e.trim().toLowerCase(); });
      }
    }
  }

  // Fallback for test runner in Node.js
  if (!secretKey && typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
    secretKey = 'test_admin_secret_key_123';
    adminEmails = ['ashreya0502@gmail.com', 'admin@example.com'];
  }

  if (!secretKey) {
    return { success: false, code: 'CONFIGURATION_ERROR', message: 'ADMIN_AUTH_KEY is not configured in Script Properties' };
  }

  // 3. Fixed-length constant-time comparison using SHA-256
  // Prevents key length disclosure and timing side-channel attacks
  var candHash = sha256Hex(candidateKey);
  var secHash = sha256Hex(secretKey);

  var match = 0;
  for (var i = 0; i < candHash.length; i++) {
    match |= candHash.charCodeAt(i) ^ secHash.charCodeAt(i);
  }

  if (match !== 0 || candHash.length !== secHash.length) {
    // Record failed attempt in cache
    if (cache) {
      try {
        var fails = Number(cache.get('auth_fails') || '0') + 1;
        if (fails >= 5) {
          cache.put('auth_lockout', '1', 60); // 60-second cooldown
          cache.remove('auth_fails');
        } else {
          cache.put('auth_fails', String(fails), 300); // 5-minute tracking window
        }
      } catch (e) {
        // Cache write failure
      }
    }
    return { success: false, code: 'UNAUTHORIZED', message: 'Invalid administrator access key' };
  }

  // 4. Successful login: Clear failure counters and issue token
  if (cache) {
    try {
      cache.remove('auth_fails');
      cache.remove('auth_lockout');
    } catch (e) {
      // Cache clear failure
    }
  }

  var primaryEmail = (adminEmails && adminEmails.length > 0) ? adminEmails[0] : 'ashreya0502@gmail.com';
  var sessionToken = _createToken(primaryEmail, secretKey);

  return {
    success: true,
    data: {
      token: sessionToken,
      user: {
        email: primaryEmail,
        name: 'Administrator',
        isAdmin: true
      }
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleAuthLogin: handleAuthLogin
  };
}

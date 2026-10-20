/**
 * AuthService: Authenticates administrator access and issues cryptographically signed session tokens.
 * Zero GCP dependency: Validates access key against Script Properties and creates HMAC-SHA256 token.
 */

var _createToken = typeof createHmacSessionToken === 'function' ? createHmacSessionToken : (typeof require !== 'undefined' ? require('./TokenValidation.gs').createHmacSessionToken : null);

function handleAuthLogin(payload) {
  if (!payload || typeof payload !== 'object' || !payload.key) {
    return { success: false, code: 'UNAUTHORIZED', message: 'Missing administrator access key' };
  }

  var candidateKey = String(payload.key).trim();
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

  // Constant-time key comparison to prevent timing side-channel attacks
  if (candidateKey.length !== secretKey.length) {
    return { success: false, code: 'UNAUTHORIZED', message: 'Invalid administrator access key' };
  }

  var match = 0;
  for (var i = 0; i < candidateKey.length; i++) {
    match |= candidateKey.charCodeAt(i) ^ secretKey.charCodeAt(i);
  }

  if (match !== 0) {
    return { success: false, code: 'UNAUTHORIZED', message: 'Invalid administrator access key' };
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

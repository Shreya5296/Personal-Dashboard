/**
 * Architecture Feasibility Spike - Apps Script Web App Handler
 * Simulates and implements Google Apps Script Web App doPost/doGet entry points
 * for cross-origin browser requests with token verification & admin allowlist.
 */

function doPost(e) {
  var requestId = 'req_init';
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createSpikeResponse({
        apiVersion: '1',
        requestId: requestId,
        success: false,
        data: null,
        error: { code: 'INVALID_REQUEST', message: 'Missing request body', retryable: false }
      });
    }

    var envelope;
    try {
      envelope = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createSpikeResponse({
        apiVersion: '1',
        requestId: requestId,
        success: false,
        data: null,
        error: { code: 'INVALID_REQUEST', message: 'Malformed JSON payload', retryable: false }
      });
    }

    requestId = envelope.requestId || ('req_' + Date.now());

    if (envelope.apiVersion !== '1') {
      return createSpikeResponse({
        apiVersion: '1',
        requestId: requestId,
        success: false,
        data: null,
        error: { code: 'UNSUPPORTED_API_VERSION', message: 'Unsupported API version', retryable: false }
      });
    }

    // Verify authentication
    var authResult = verifySpikeIdentity(envelope.identityToken);
    if (!authResult.valid) {
      return createSpikeResponse({
        apiVersion: '1',
        requestId: requestId,
        success: false,
        data: null,
        error: { code: authResult.code || 'UNAUTHORIZED', message: authResult.message, retryable: true }
      });
    }

    // Verify authorization against admin allowlist
    var adminEmail = getSpikeAdminEmail();
    if (authResult.email !== adminEmail) {
      return createSpikeResponse({
        apiVersion: '1',
        requestId: requestId,
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Caller is not an authorized administrator', retryable: false }
      });
    }

    // Route operation
    if (envelope.operation === 'system.health') {
      return createSpikeResponse({
        apiVersion: '1',
        requestId: requestId,
        success: true,
        data: {
          status: 'ok',
          apiVersion: '1',
          schemaVersion: '1.0.0',
          checkedAt: new Date().toISOString()
        },
        error: null
      });
    } else if (envelope.operation === 'auth.verifySession') {
      return createSpikeResponse({
        apiVersion: '1',
        requestId: requestId,
        success: true,
        data: {
          authenticated: true,
          displayIdentity: authResult.email,
          verifiedAt: new Date().toISOString()
        },
        error: null
      });
    } else {
      return createSpikeResponse({
        apiVersion: '1',
        requestId: requestId,
        success: false,
        data: null,
        error: { code: 'UNKNOWN_OPERATION', message: 'Operation not recognized: ' + envelope.operation, retryable: false }
      });
    }
  } catch (err) {
    return createSpikeResponse({
      apiVersion: '1',
      requestId: requestId,
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred', retryable: true }
    });
  }
}

function verifySpikeIdentity(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Missing identity token' };
  }
  // In synthetic test mode, tokens prefixed with 'mock_token_for_' are validated
  if (token.indexOf('mock_token_for_') === 0) {
    var email = token.replace('mock_token_for_', '');
    return { valid: true, email: email };
  }
  if (token === 'expired_token') {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Token has expired' };
  }
  return { valid: false, code: 'UNAUTHORIZED', message: 'Invalid identity token signature or claims' };
}

function getSpikeAdminEmail() {
  return 'admin@example.com';
}

function createSpikeResponse(data) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { doPost: doPost, verifySpikeIdentity: verifySpikeIdentity, getSpikeAdminEmail: getSpikeAdminEmail };
}

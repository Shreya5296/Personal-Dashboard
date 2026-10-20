/**
 * RequestParser: Parses and validates the incoming API request envelope.
 * Enforces payload size limits, JSON parsing, API versioning, and structure validation.
 */

var MAX_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2MB safety limit

function parseApiRequest(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {
      valid: false,
      code: 'INVALID_REQUEST',
      message: 'Missing request body or postData',
      requestId: 'req_init'
    };
  }

  var raw = e.postData.contents;

  // Enforce request size limit to prevent memory exhaustion
  if (typeof raw === 'string' && raw.length > MAX_PAYLOAD_BYTES) {
    return {
      valid: false,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload exceeds maximum allowed size of 2MB',
      requestId: 'req_init'
    };
  }

  var envelope;
  try {
    envelope = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    return {
      valid: false,
      code: 'INVALID_REQUEST',
      message: 'Request body must be valid JSON',
      requestId: 'req_init'
    };
  }

  var requestId = envelope.requestId || ('req_' + Date.now().toString(36));

  if (!envelope.apiVersion || String(envelope.apiVersion) !== '1') {
    return {
      valid: false,
      code: 'UNSUPPORTED_API_VERSION',
      message: 'Requested apiVersion is unsupported (expected "1")',
      requestId: requestId
    };
  }

  if (!envelope.operation || typeof envelope.operation !== 'string') {
    return {
      valid: false,
      code: 'INVALID_REQUEST',
      message: 'Request must specify an operation name',
      requestId: requestId
    };
  }

  return {
    valid: true,
    requestId: requestId,
    operation: envelope.operation.trim(),
    identityToken: envelope.identityToken || envelope.token || null,
    idempotencyKey: envelope.idempotencyKey || null,
    payload: (envelope.payload && typeof envelope.payload === 'object') ? envelope.payload : ((envelope.data && typeof envelope.data === 'object') ? envelope.data : {})
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseApiRequest: parseApiRequest,
    MAX_PAYLOAD_BYTES: MAX_PAYLOAD_BYTES
  };
}

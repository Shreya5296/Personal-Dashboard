/**
 * RequestParser: Parses and validates the incoming API request envelope.
 */

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
    identityToken: envelope.identityToken || null,
    idempotencyKey: envelope.idempotencyKey || null,
    payload: (envelope.payload && typeof envelope.payload === 'object') ? envelope.payload : {}
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseApiRequest: parseApiRequest };
}

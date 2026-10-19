/**
 * ResponseFactory: Creates canonical API success and error envelopes.
 */

function createSuccessResponse(requestId, data, meta) {
  var envelope = {
    apiVersion: '1',
    requestId: requestId || 'req_unknown',
    success: true,
    ok: true,
    data: data !== undefined ? data : {},
    error: null,
    meta: meta || null
  };
  return createJsonResponse(envelope);
}

function createErrorResponse(requestId, code, message, details, retryable) {
  var safeCode = code || 'INTERNAL_ERROR';
  var safeMsg = message || 'An error occurred';
  var envelope = {
    apiVersion: '1',
    requestId: requestId || 'req_unknown',
    success: false,
    ok: false,
    data: null,
    error: {
      code: safeCode,
      message: safeMsg,
      details: details || null,
      fieldErrors: (details && typeof details === 'object' && !Array.isArray(details)) ? details : null,
      retryable: Boolean(retryable)
    }
  };
  return createJsonResponse(envelope);
}

function createJsonResponse(envelope) {
  var jsonStr = JSON.stringify(envelope);
  if (typeof ContentService !== 'undefined') {
    return ContentService.createTextOutput(jsonStr)
      .setMimeType(ContentService.MimeType.JSON);
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: jsonStr,
    payload: envelope
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSuccessResponse: createSuccessResponse,
    createErrorResponse: createErrorResponse,
    createJsonResponse: createJsonResponse
  };
}

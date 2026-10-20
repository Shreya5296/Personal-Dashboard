/**
 * ApiEntry: Web App entry points for Google Apps Script.
 * Dispatches doPost and doGet to authentication, authorization, and routing.
 */

var _parseReq = typeof parseApiRequest === 'function' ? parseApiRequest : (typeof require !== 'undefined' ? require('./RequestParser.gs').parseApiRequest : null);
var _verifyToken = typeof verifyIdentityToken === 'function' ? verifyIdentityToken : (typeof require !== 'undefined' ? require('../auth/IdentityVerifier.gs').verifyIdentityToken : null);
var _isAdmin = typeof isAuthorizedAdmin === 'function' ? isAuthorizedAdmin : (typeof require !== 'undefined' ? require('../auth/AdminAuthorization.gs').isAuthorizedAdmin : null);
var _getSpreadsheet = typeof getSpreadsheet === 'function' ? getSpreadsheet : (typeof require !== 'undefined' ? require('../sheets/SpreadsheetProvider.gs').getSpreadsheet : null);
var _routeOp = typeof routeOperation === 'function' ? routeOperation : (typeof require !== 'undefined' ? require('./OperationRouter.gs').routeOperation : null);
var _errRes = typeof createErrorResponse === 'function' ? createErrorResponse : (typeof require !== 'undefined' ? require('./ResponseFactory.gs').createErrorResponse : null);
var _succRes = typeof createSuccessResponse === 'function' ? createSuccessResponse : (typeof require !== 'undefined' ? require('./ResponseFactory.gs').createSuccessResponse : null);
var _jsonRes = typeof createJsonResponse === 'function' ? createJsonResponse : (typeof require !== 'undefined' ? require('./ResponseFactory.gs').createJsonResponse : null);

function doPost(e) {
  var requestId = 'req_init';
  try {
    // 1. Parse request envelope
    var req = _parseReq(e);
    if (!req.valid) {
      return _errRes(req.requestId, req.code, req.message, null, false);
    }
    requestId = req.requestId;

    // 2. Authenticate caller (validates Google ID token and optional configured client ID audience)
    var expectedAudience = null;
    if (typeof PropertiesService !== 'undefined') {
      try {
        var props = PropertiesService.getScriptProperties();
        if (props) {
          expectedAudience = props.getProperty('GOOGLE_CLIENT_ID');
        }
      } catch (propErr) {
        // PropertiesService fallback
      }
    }

    var auth = _verifyToken(req.identityToken, expectedAudience);
    if (!auth.valid) {
      return _errRes(requestId, auth.code || 'UNAUTHORIZED', auth.message, null, true);
    }

    // 3. Authorize caller against administrator allowlist
    if (!_isAdmin(auth.email)) {
      return _errRes(requestId, 'FORBIDDEN', 'Identity is not authorized to access this dashboard', null, false);
    }

    // 4. Resolve spreadsheet
    var spreadsheet = null;
    try {
      if (_getSpreadsheet) spreadsheet = _getSpreadsheet();
    } catch (sheetErr) {
      // Non-persistence operations can proceed without spreadsheet
    }

    // 5. Build context and route operation
    var context = {
      operation: req.operation,
      payload: req.payload,
      requestId: requestId,
      idempotencyKey: req.idempotencyKey,
      verifiedEmail: auth.email,
      actorId: auth.actorId || ('usr_' + auth.email),
      spreadsheet: spreadsheet
    };

    var result = _routeOp(context);
    if (!result.success) {
      return _errRes(requestId, result.code, result.message, result.details, result.retryable);
    }

    return _succRes(requestId, result.data, result.meta);
  } catch (err) {
    return _errRes(requestId, 'INTERNAL_ERROR', 'An unhandled server exception occurred', null, true);
  }
}

function doGet(e) {
  return _jsonRes({
    apiVersion: '1',
    status: 'ok',
    service: 'Student Management Dashboard API'
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    doPost: doPost,
    doGet: doGet
  };
}

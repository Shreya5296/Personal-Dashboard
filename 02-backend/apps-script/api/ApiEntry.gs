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

    // 2. Authenticate caller
    var auth = _verifyToken(req.identityToken);
    if (!auth.valid) {
      return _errRes(requestId, auth.code || 'UNAUTHORIZED', auth.message, null, true);
    }

    // 3. Authorize caller against admin allowlist
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

function verifyScriptPropertiesSafeDiagnostic() {
  var sheetId = null;
  var adminEmails = null;

  if (typeof PropertiesService !== 'undefined') {
    var props = PropertiesService.getScriptProperties();
    sheetId = props.getProperty('SPREADSHEET_ID');
    adminEmails = props.getProperty('ADMIN_EMAILS') || props.getProperty('ADMIN_EMAIL');
  }

  var expectedSheetId = '1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8';
  var expectedAdmin = 'ashreya0502@gmail.com';

  var sheetMatch = (sheetId === expectedSheetId);
  var adminList = adminEmails ? adminEmails.split(',').map(function(e) { return e.trim().toLowerCase(); }) : [];
  var adminMatch = (adminList.indexOf(expectedAdmin) !== -1);

  var sheetOpenSuccess = false;
  var tabCount = 0;
  var errorMsg = null;

  if (sheetMatch && typeof SpreadsheetApp !== 'undefined') {
    try {
      var ss = SpreadsheetApp.openById(sheetId);
      sheetOpenSuccess = true;
      tabCount = ss.getSheets().length;
    } catch (e) {
      errorMsg = e.message;
    }
  }

  var adminCheckPassed = false;
  var unauthorizedRejected = false;
  if (typeof isAuthorizedAdmin === 'function') {
    adminCheckPassed = isAuthorizedAdmin(expectedAdmin);
    unauthorizedRejected = !isAuthorizedAdmin('unauthorized_test_user@example.com');
  }

  var report = {
    SPREADSHEET_ID_set: !!sheetId,
    SPREADSHEET_ID_matches_expected: sheetMatch,
    ADMIN_EMAILS_set: !!adminEmails,
    ADMIN_EMAILS_contains_target: adminMatch,
    spreadsheet_open_success: sheetOpenSuccess,
    tab_count: tabCount,
    admin_auth_check_passed: adminCheckPassed,
    unauthorized_check_rejected: unauthorizedRejected,
    error: errorMsg
  };

  Logger.log('=== SCRIPT PROPERTIES VERIFICATION REPORT ===');
  Logger.log('SPREADSHEET_ID Set: ' + report.SPREADSHEET_ID_set);
  Logger.log('SPREADSHEET_ID Matches Expected: ' + report.SPREADSHEET_ID_matches_expected);
  Logger.log('ADMIN_EMAILS Set: ' + report.ADMIN_EMAILS_set);
  Logger.log('ADMIN_EMAILS Contains ' + expectedAdmin + ': ' + report.ADMIN_EMAILS_contains_target);
  Logger.log('Spreadsheet Open Success: ' + report.spreadsheet_open_success);
  Logger.log('Total Tabs Found: ' + report.tab_count);
  Logger.log('Admin Auth Check Passed: ' + report.admin_auth_check_passed);
  Logger.log('Unauthorized Check Rejected: ' + report.unauthorized_check_rejected);
  Logger.log('=== END REPORT ===');

  return report;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    doPost: doPost,
    doGet: doGet,
    verifyScriptPropertiesSafeDiagnostic: verifyScriptPropertiesSafeDiagnostic
  };
}

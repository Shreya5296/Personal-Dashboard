/**
 * VerifyProperties: Safe temporary diagnostic runner.
 * Confirms saved Script Properties without leaking secrets in logs.
 */

function verifyScriptPropertiesSafeDiagnostic() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty('SPREADSHEET_ID');
  var adminEmails = props.getProperty('ADMIN_EMAILS') || props.getProperty('ADMIN_EMAIL');

  var expectedSheetId = '1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8';
  var expectedAdmin = 'ashreya0502@gmail.com';

  var sheetMatch = (sheetId === expectedSheetId);
  var adminList = adminEmails ? adminEmails.split(',').map(function(e) { return e.trim().toLowerCase(); }) : [];
  var adminMatch = (adminList.indexOf(expectedAdmin) !== -1);

  // Safe spreadsheet check
  var sheetOpenSuccess = false;
  var sheetTitle = '';
  var tabCount = 0;
  var errorMsg = null;

  if (sheetMatch) {
    try {
      var ss = SpreadsheetApp.openById(sheetId);
      sheetOpenSuccess = true;
      sheetTitle = ss.getName();
      tabCount = ss.getSheets().length;
    } catch (e) {
      errorMsg = e.message;
    }
  }

  // Safe authorization check
  var adminCheckPassed = false;
  var unauthorizedRejected = false;
  if (typeof isAuthorizedAdmin === 'function') {
    adminCheckPassed = isAuthorizedAdmin(expectedAdmin);
    unauthorizedRejected = !isAuthorizedAdmin('unauthorized_test_user@example.com');
  }

  var report = {
    SPREADSHEET_ID_configured: !!sheetId,
    SPREADSHEET_ID_exact_match: sheetMatch,
    SPREADSHEET_ID_length: sheetId ? sheetId.length : 0,
    ADMIN_EMAILS_configured: !!adminEmails,
    ADMIN_EMAILS_contains_target: adminMatch,
    ADMIN_EMAILS_total_count: adminList.length,
    spreadsheet_open_success: sheetOpenSuccess,
    spreadsheet_name_matches: sheetTitle === 'Private Class Dashboard',
    canonical_tab_count: tabCount,
    admin_allowlist_check_passed: adminCheckPassed,
    unauthorized_rejection_passed: unauthorizedRejected,
    error: errorMsg
  };

  Logger.log('=== SCRIPT PROPERTIES VERIFICATION REPORT ===');
  Logger.log('SPREADSHEET_ID Set: ' + report.SPREADSHEET_ID_configured);
  Logger.log('SPREADSHEET_ID Matches Expected: ' + report.SPREADSHEET_ID_exact_match);
  Logger.log('ADMIN_EMAILS Set: ' + report.ADMIN_EMAILS_configured);
  Logger.log('ADMIN_EMAILS Contains ' + expectedAdmin + ': ' + report.ADMIN_EMAILS_contains_target);
  Logger.log('Spreadsheet Open Success: ' + report.spreadsheet_open_success);
  Logger.log('Total Tabs Found: ' + report.canonical_tab_count);
  Logger.log('Admin Auth Check Passed: ' + report.admin_allowlist_check_passed);
  Logger.log('Unauthorized Check Rejected: ' + report.unauthorized_rejection_passed);
  Logger.log('=== END REPORT ===');

  return report;
}

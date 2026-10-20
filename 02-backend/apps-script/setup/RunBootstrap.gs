/**
 * RunBootstrap: Owner-callable function to initialize all 12 canonical tabs.
 * Run this once from the Apps Script editor after pushing files with clasp.
 *
 * Safety: Does not delete or overwrite existing tabs or data.
 * Only creates missing tabs and adds header rows to empty sheets.
 */

function runBootstrap() {
  var spreadsheet = SpreadsheetApp.openById('1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8');

  var registry = {
    SHEET_NAMES: SHEET_NAMES,
    getCanonicalSheetNames: getCanonicalSheetNames,
    getExpectedHeaders: getExpectedHeaders
  };

  // Call the core bootstrap (creates tabs and headers)
  var result = bootstrapSpreadsheet(spreadsheet, registry, SCHEMA_VERSION);

  // Seed AppConfig defaults using real Sheets API
  // (The core bootstrap uses mock-only getLastRowNum, so we handle it here)
  var configSheet = spreadsheet.getSheetByName('AppConfig');
  if (configSheet && configSheet.getLastRow() <= 1) {
    var now = new Date().toISOString();
    configSheet.appendRow(['schema_version', SCHEMA_VERSION, 'Canonical schema version', now]);
    configSheet.appendRow(['display_currency', 'INR', 'Default display currency', now]);
    configSheet.appendRow(['display_timezone', 'Asia/Kolkata', 'Default display timezone', now]);
    configSheet.appendRow(['default_class_duration_minutes', '60', 'Default class session duration', now]);
  }

  // Remove the default blank "Sheet1" tab if all 12 canonical tabs were created
  var defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (defaultSheet && spreadsheet.getSheets().length > 1) {
    try {
      spreadsheet.deleteSheet(defaultSheet);
      result.removedDefaultSheet = true;
    } catch (e) {
      result.removedDefaultSheet = false;
    }
  }

  Logger.log('Bootstrap result: ' + JSON.stringify(result));
  Logger.log('Created tabs: ' + JSON.stringify(result.createdTabs));
  Logger.log('Expected 12 tabs: Students, Enrollments, Packages, FeeObligations, Payments, ClassSessions, MeetingLinks, StudentNotes, AuditLog, ImportBatches, ImportRowResults, AppConfig');

  // Verify tab count
  var allSheets = spreadsheet.getSheets();
  Logger.log('Total tabs in spreadsheet: ' + allSheets.length);
  for (var i = 0; i < allSheets.length; i++) {
    Logger.log('  Tab ' + (i + 1) + ': ' + allSheets[i].getName());
  }

  return result;
}

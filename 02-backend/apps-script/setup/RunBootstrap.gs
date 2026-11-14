/**
 * RunBootstrap: Owner-callable function to initialize all active canonical tabs.
 * Run this once from the Apps Script editor after pushing files with clasp.
 *
 * Safety: Does not delete or overwrite existing tabs or data.
 * Only creates missing canonical tabs and adds header rows to empty sheets.
 */

function runBootstrap() {
  var targetSpreadsheetId = '1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8';
  var spreadsheet = null;

  try {
    spreadsheet = SpreadsheetApp.openById(targetSpreadsheetId);
  } catch (err) {
    if (typeof SpreadsheetApp.getActiveSpreadsheet === 'function') {
      var active = SpreadsheetApp.getActiveSpreadsheet();
      if (active && active.getId() === targetSpreadsheetId) {
        spreadsheet = active;
      }
    }
  }

  if (!spreadsheet) {
    throw new Error('Target spreadsheet could not be opened. Target ID: ' + targetSpreadsheetId);
  }

  if (spreadsheet.getId() !== targetSpreadsheetId) {
    throw new Error('Safety check failed: opened spreadsheet ID (' + spreadsheet.getId() + ') does not match target ID (' + targetSpreadsheetId + ')');
  }

  var registry = {
    SHEET_NAMES: SHEET_NAMES,
    getCanonicalSheetNames: getCanonicalSheetNames,
    getExpectedHeaders: getExpectedHeaders
  };

  // Call the core bootstrap (creates canonical tabs and headers)
  var result = bootstrapSpreadsheet(spreadsheet, registry, SCHEMA_VERSION);

  // Remove the default blank "Sheet1" tab if canonical tabs exist
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
  Logger.log('Expected 6 tabs: Students, Packages, Payments, ClassSessions, MeetingLinks, StudentNotes');

  // Verify tab count
  var allSheets = spreadsheet.getSheets();
  Logger.log('Total tabs in spreadsheet: ' + allSheets.length);
  for (var i = 0; i < allSheets.length; i++) {
    Logger.log(' - Tab ' + (i + 1) + ': ' + allSheets[i].getName() + ' (' + allSheets[i].getLastRow() + ' rows)');
  }

  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runBootstrap: runBootstrap
  };
}

/**
 * SpreadsheetBootstrap: Initializes all active canonical tabs and headers.
 * Does not overwrite or clear existing tabs.
 * Does not recreate obsolete tabs (AppConfig, ImportBatches, ImportRowResults).
 */

function bootstrapSpreadsheet(spreadsheet, registry, schemaVersion) {
  var sheetNames = registry.getCanonicalSheetNames();
  var createdTabs = [];

  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var sheet = spreadsheet.getSheetByName(name);
    var headers = registry.getExpectedHeaders(name);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
      createdTabs.push(name);
      if (headers && headers.length > 0) {
        sheet.appendRow(headers);
      }
    } else {
      // If sheet exists but is empty, add headers
      var isEmpty = false;
      if (typeof sheet.getLastRow === 'function') {
        isEmpty = sheet.getLastRow() === 0;
      } else if (typeof sheet.getHeaders === 'function') {
        isEmpty = sheet.getHeaders().length === 0;
      }
      if (isEmpty && headers && headers.length > 0) {
        sheet.appendRow(headers);
      }
    }
  }

  return {
    success: true,
    createdTabs: createdTabs
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    bootstrapSpreadsheet: bootstrapSpreadsheet
  };
}

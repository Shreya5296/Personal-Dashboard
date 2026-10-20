/**
 * SpreadsheetBootstrap: Initializes all 12 canonical tabs and headers.
 * Does not overwrite or clear existing tabs.
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

  // Seed default AppConfig entries if empty
  var configSheet = spreadsheet.getSheetByName(registry.SHEET_NAMES.APP_CONFIG);
  var configLastRow = 0;
  if (configSheet) {
    if (typeof configSheet.getLastRow === 'function') {
      configLastRow = configSheet.getLastRow();
    } else if (typeof configSheet.getLastRowNum === 'function') {
      configLastRow = configSheet.getLastRowNum();
    }
  }
  if (configSheet && configLastRow <= 1) {
    var now = new Date().toISOString();
    var version = schemaVersion || '1.0.0';
    configSheet.appendRow(['schema_version', version, 'Canonical schema version', now]);
    configSheet.appendRow(['display_currency', 'INR', 'Default display currency', now]);
    configSheet.appendRow(['display_timezone', 'Asia/Kolkata', 'Default display timezone', now]);
    configSheet.appendRow(['default_class_duration_minutes', '60', 'Default class session duration', now]);
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

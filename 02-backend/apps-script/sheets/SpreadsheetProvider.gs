/**
 * SpreadsheetProvider: Centralized provider for the canonical Google Spreadsheet.
 */

var _activeMockSpreadsheet = null;

function setMockSpreadsheet(mock) {
  _activeMockSpreadsheet = mock;
}

function getSpreadsheet() {
  if (_activeMockSpreadsheet) {
    return _activeMockSpreadsheet;
  }

  if (typeof SpreadsheetApp !== 'undefined') {
    if (typeof PropertiesService !== 'undefined') {
      var props = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty('SPREADSHEET_ID');
      if (sheetId) {
        return SpreadsheetApp.openById(sheetId);
      }
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  throw new Error('No spreadsheet provider configured and SpreadsheetApp is unavailable');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getSpreadsheet: getSpreadsheet,
    setMockSpreadsheet: setMockSpreadsheet
  };
}

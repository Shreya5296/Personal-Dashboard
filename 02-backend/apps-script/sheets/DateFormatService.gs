/**
 * DateFormatService: Standardizes date column storage and display across all sheets to dd/MM/yyyy.
 * Ensures dates are stored as real spreadsheet Date objects and displayed in 'dd/MM/yyyy' format.
 */

var DATE_COLUMNS_CONFIG = {
  'Packages': ['start_date', 'end_date', 'next_due_date'],
  'Payments': ['payment_date'],
  'ClassSessions': ['schedule_date'],
  'StudentNotes': ['note_date', 'follow_up_date'],
  'Enrollments': ['start_date', 'end_date'],
  'FeeObligations': ['issue_date', 'due_date']
};

function parseIsoToSheetDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null;
    return new Date(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate(), 12, 0, 0);
  }
  var str = String(dateVal).trim().replace(/^'/, '');
  var isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (isoMatch) {
    var y = parseInt(isoMatch[1], 10);
    var m = parseInt(isoMatch[2], 10) - 1;
    var d = parseInt(isoMatch[3], 10);
    return new Date(y, m, d, 12, 0, 0);
  }
  var ddmmyyyyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(str);
  if (ddmmyyyyMatch) {
    var d2 = parseInt(ddmmyyyyMatch[1], 10);
    var m2 = parseInt(ddmmyyyyMatch[2], 10) - 1;
    var y2 = parseInt(ddmmyyyyMatch[3], 10);
    return new Date(y2, m2, d2, 12, 0, 0);
  }
  return null;
}

function standardizeAllDateFormats(spreadsheet) {
  if (!spreadsheet) return { success: false, message: 'Spreadsheet is required' };

  var results = [];
  var sheetNames = Object.keys(DATE_COLUMNS_CONFIG);

  for (var s = 0; s < sheetNames.length; s++) {
    var sheetName = sheetNames[s];
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) continue;

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) continue;

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var headerMap = {};
    for (var h = 0; h < headers.length; h++) {
      if (headers[h]) headerMap[String(headers[h]).trim()] = h + 1; // 1-based col index
    }

    var targetCols = DATE_COLUMNS_CONFIG[sheetName] || [];
    var formattedCols = [];

    for (var c = 0; c < targetCols.length; c++) {
      var colName = targetCols[c];
      var colIdx = headerMap[colName];
      if (!colIdx) continue;

      var numRows = lastRow - 1;
      var range = sheet.getRange(2, colIdx, numRows, 1);
      var values = range.getValues();
      var changed = false;

      for (var r = 0; r < values.length; r++) {
        var rawVal = values[r][0];
        if (rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== '') {
          var dateObj = parseIsoToSheetDate(rawVal);
          if (dateObj) {
            values[r][0] = dateObj;
            changed = true;
          }
        }
      }

      if (changed && typeof range.setValues === 'function') {
        range.setValues(values);
      }
      if (typeof range.setNumberFormat === 'function') {
        range.setNumberFormat('dd/MM/yyyy');
      }

      formattedCols.push({ column: colName, columnIndex: colIdx, rowsUpdated: numRows });
    }

    results.push({
      sheetName: sheetName,
      totalRows: lastRow,
      columnsFormatted: formattedCols
    });
  }

  return {
    success: true,
    format: 'dd/MM/yyyy',
    sheetsProcessed: results.length,
    details: results
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DATE_COLUMNS_CONFIG: DATE_COLUMNS_CONFIG,
    parseIsoToSheetDate: parseIsoToSheetDate,
    standardizeAllDateFormats: standardizeAllDateFormats
  };
}

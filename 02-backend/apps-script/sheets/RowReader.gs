/**
 * RowReader: Batched spreadsheet reader.
 * Converts raw sheet rows into typed record objects using dynamic HeaderMapper.
 * Compatible with both Google Apps Script runtime (Sheet.getDataRange) and MockSheet.
 */

function _getSheetRows(sheet) {
  if (!sheet) return [];
  if (typeof sheet.getData === 'function') {
    return sheet.getData();
  }
  try {
    if (typeof sheet.getDataRange === 'function') {
      var range = sheet.getDataRange();
      if (!range) return [];
      var values = range.getValues();
      return Array.isArray(values) ? values : [];
    }
    if (typeof sheet.getLastRow === 'function' && typeof sheet.getLastColumn === 'function') {
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow < 1 || lastCol < 1) return [];
      return sheet.getRange(1, 1, lastRow, lastCol).getValues();
    }
  } catch (err) {
    return [];
  }
  return [];
}

function readAllRecords(sheet, headerMapper) {
  if (!sheet) return [];
  var rawData = _getSheetRows(sheet);
  if (rawData.length <= 1) return [];

  var headerRow = rawData[0];
  var mapper = headerMapper || (typeof createHeaderMap !== 'undefined' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord } : null);
  if (!mapper) throw new Error('HeaderMapper is required');

  var map = mapper.createHeaderMap(headerRow);
  var records = [];
  var idHeaderName = String(headerRow[0] || '').trim().toLowerCase();

  for (var i = 1; i < rawData.length; i++) {
    var row = rawData[i];
    if (!row || !Array.isArray(row)) continue;

    // 1. Skip completely empty rows
    var hasContent = false;
    for (var c = 0; c < row.length; c++) {
      if (row[c] !== null && row[c] !== undefined && String(row[c]).trim() !== '') {
        hasContent = true;
        break;
      }
    }
    if (!hasContent) continue;

    // 2. Skip duplicate header rows (e.g. where row[0] is equal to headerRow[0])
    var firstCell = String(row[0] || '').trim().toLowerCase();
    if (idHeaderName && firstCell === idHeaderName) {
      continue;
    }

    var record = mapper.rowToRecord(map, row);
    record._rowIndex = i + 1;
    records.push(record);
  }

  return records;
}

function findRecordById(sheet, headerMapper, idField, idValue) {
  var records = readAllRecords(sheet, headerMapper);
  for (var i = 0; i < records.length; i++) {
    if (records[i][idField] === idValue) {
      return records[i];
    }
  }
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    readAllRecords: readAllRecords,
    findRecordById: findRecordById,
    _getSheetRows: _getSheetRows
  };
}

/**
 * RowWriter: Validated spreadsheet record writer.
 * Appends and updates rows by ID using HeaderMapper.
 * Compatible with both Google Apps Script runtime and MockSheet.
 */

var _readRowsHelper = typeof _getSheetRows === 'function' ? _getSheetRows : function(sheet) {
  if (!sheet) return [];
  if (typeof sheet.getData === 'function') return sheet.getData();
  try {
    if (typeof sheet.getDataRange === 'function') {
      var r = sheet.getDataRange();
      return r ? r.getValues() : [];
    }
    if (typeof sheet.getLastRow === 'function' && typeof sheet.getLastColumn === 'function') {
      var lr = sheet.getLastRow();
      var lc = sheet.getLastColumn();
      if (lr < 1 || lc < 1) return [];
      return sheet.getRange(1, 1, lr, lc).getValues();
    }
  } catch (e) {
    return [];
  }
  return [];
};

function appendRecord(sheet, headerMapper, headerList, record) {
  if (!sheet) throw new Error('Sheet is required for appendRecord');
  var rawData = _readRowsHelper(sheet);
  if (rawData.length === 0) {
    sheet.appendRow(headerList);
    rawData = [headerList];
  }

  var headerRow = rawData[0];
  var map = headerMapper.createHeaderMap(headerRow);
  var row = headerMapper.recordToRow(map, headerList, record);

  sheet.appendRow(row);
  return record;
}

function updateRecordById(sheet, headerMapper, headerList, idField, idValue, updates) {
  if (!sheet) throw new Error('Sheet is required for updateRecordById');
  var rawData = _readRowsHelper(sheet);
  if (rawData.length <= 1) return null;

  var headerRow = rawData[0];
  var map = headerMapper.createHeaderMap(headerRow);
  var idColIdx = map[idField];
  if (idColIdx === undefined) {
    throw new Error('ID field not found in sheet: ' + idField);
  }

  for (var i = 1; i < rawData.length; i++) {
    if (String(rawData[i][idColIdx] || '').trim() === String(idValue || '').trim()) {
      var currentRecord = headerMapper.rowToRecord(map, rawData[i]);
      for (var key in updates) {
        if (updates.hasOwnProperty(key)) {
          currentRecord[key] = updates[key];
        }
      }
      var updatedRow = headerMapper.recordToRow(map, headerList, currentRecord);
      if (typeof sheet.setRow === 'function') {
        sheet.setRow(i, updatedRow); // Mock support
      } else if (typeof sheet.getRange === 'function') {
        // 1-based row index in Google Sheets: row i + 1, col 1 to updatedRow.length
        sheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
      }
      return currentRecord;
    }
  }

  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    appendRecord: appendRecord,
    updateRecordById: updateRecordById
  };
}

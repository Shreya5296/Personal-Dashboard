/**
 * RowWriter: Validated spreadsheet record writer.
 * Appends and updates rows by ID using HeaderMapper.
 */

function appendRecord(sheet, headerMapper, headerList, record) {
  if (!sheet) throw new Error('Sheet is required for appendRecord');
  var rawData = sheet.getData ? sheet.getData() : [];
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
  var rawData = sheet.getData ? sheet.getData() : [];
  if (rawData.length <= 1) return null;

  var headerRow = rawData[0];
  var map = headerMapper.createHeaderMap(headerRow);
  var idColIdx = map[idField];
  if (idColIdx === undefined) {
    throw new Error('ID field not found in sheet: ' + idField);
  }

  for (var i = 1; i < rawData.length; i++) {
    if (rawData[i][idColIdx] === idValue) {
      var currentRecord = headerMapper.rowToRecord(map, rawData[i]);
      for (var key in updates) {
        if (updates.hasOwnProperty(key)) {
          currentRecord[key] = updates[key];
        }
      }
      var updatedRow = headerMapper.recordToRow(map, headerList, currentRecord);
      sheet.setRow(i, updatedRow);
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

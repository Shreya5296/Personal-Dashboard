/**
 * RowReader: Batched spreadsheet reader.
 * Converts raw sheet rows into typed record objects using dynamic HeaderMapper.
 */

function readAllRecords(sheet, headerMapper) {
  if (!sheet) return [];
  var rawData = sheet.getData ? sheet.getData() : [];
  if (rawData.length <= 1) return [];

  var headerRow = rawData[0];
  var mapper = headerMapper || (typeof createHeaderMap !== 'undefined' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord } : null);
  if (!mapper) throw new Error('HeaderMapper is required');

  var map = mapper.createHeaderMap(headerRow);
  var records = [];

  for (var i = 1; i < rawData.length; i++) {
    var row = rawData[i];
    var record = mapper.rowToRecord(map, row);
    // Add row index for internal tracking
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
    findRecordById: findRecordById
  };
}

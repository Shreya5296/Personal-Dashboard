/**
 * ClassRepository: CRUD persistence for the ClassSessions sheet.
 */

var _clsRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords, findRecordById: findRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);
var _clsRowWriter = typeof appendRecord === 'function' ? { appendRecord: appendRecord, updateRecordById: updateRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowWriter.gs') : null);
function _resolveClsRepoSheetNames() {
  if (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) return SHEET_NAMES;
  if (typeof require !== 'undefined') return require('../sheets/SheetRegistry.gs').SHEET_NAMES;
  return {};
}

function _resolveClsRepoHeaders(sheetName) {
  if (typeof getExpectedHeaders === 'function') return getExpectedHeaders(sheetName);
  if (typeof require !== 'undefined') return require('../sheets/SheetRegistry.gs').getExpectedHeaders(sheetName);
  return null;
}

var _clsRegistry = {
  get SHEET_NAMES() { return _resolveClsRepoSheetNames(); },
  getExpectedHeaders: function(name) { return _resolveClsRepoHeaders(name); }
};
var _clsMapper = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function Classes_getAll(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(_clsRegistry.SHEET_NAMES.CLASS_SESSIONS);
  var records = _clsRowReader.readAllRecords(sheet, _clsMapper);
  var metaMap = (typeof globalThis !== 'undefined' && globalThis.__sessionMetaMap) ? globalThis.__sessionMetaMap : {};
  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    var meta = metaMap[rec.class_session_id];
    if (meta) {
      if (meta.package_id && !rec.package_id) rec.package_id = meta.package_id;
      if (meta.class_title && !rec.class_title) rec.class_title = meta.class_title;
    }
  }
  return records;
}

function Classes_getById(spreadsheet, id) {
  var sheet = spreadsheet.getSheetByName(_clsRegistry.SHEET_NAMES.CLASS_SESSIONS);
  return _clsRowReader.findRecordById(sheet, _clsMapper, 'class_session_id', id);
}

function Classes_findByRestorationId(spreadsheet, originalSessionId) {
  var all = Classes_getAll(spreadsheet);
  for (var i = 0; i < all.length; i++) {
    if (all[i].credit_restoration_for_session_id === originalSessionId) {
      return all[i];
    }
  }
  return null;
}

function Classes_insert(spreadsheet, record) {
  var sheet = spreadsheet.getSheetByName(_clsRegistry.SHEET_NAMES.CLASS_SESSIONS);
  var headers = _clsRegistry.getExpectedHeaders(_clsRegistry.SHEET_NAMES.CLASS_SESSIONS);
  return _clsRowWriter.appendRecord(sheet, _clsMapper, headers, record);
}

function Classes_update(spreadsheet, id, updates) {
  var sheet = spreadsheet.getSheetByName(_clsRegistry.SHEET_NAMES.CLASS_SESSIONS);
  var headers = _clsRegistry.getExpectedHeaders(_clsRegistry.SHEET_NAMES.CLASS_SESSIONS);
  var rIdx = updates && (updates._rowIndex || updates.rowIndex);
  if (rIdx) {
    var rowNum = Number(rIdx);
    if (rowNum >= 2 && rowNum <= sheet.getLastRow()) {
      var rawData = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues();
      var headerRow = rawData[0];
      var map = _clsMapper.createHeaderMap(headerRow);
      var rowVals = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
      var rec = _clsMapper.rowToRecord(map, rowVals);
      if (updates.student_id && rec.student_id && rec.student_id !== updates.student_id) {
        return null;
      }
      for (var k in updates) {
        if (updates.hasOwnProperty(k) && k !== '_rowIndex' && k !== 'rowIndex') {
          rec[k] = updates[k];
        }
      }
      var updatedRow = _clsMapper.recordToRow(map, headerRow, rec);
      sheet.getRange(rowNum, 1, 1, updatedRow.length).setValues([updatedRow]);
      rec._rowIndex = rowNum;
      return rec;
    }
  }
  return _clsRowWriter.updateRecordById(sheet, _clsMapper, headers, 'class_session_id', id, updates);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Classes_getAll: Classes_getAll,
    Classes_getById: Classes_getById,
    Classes_findByRestorationId: Classes_findByRestorationId,
    Classes_insert: Classes_insert,
    Classes_update: Classes_update
  };
}

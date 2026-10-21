/**
 * NoteRepository: CRUD persistence for the StudentNotes sheet (5 columns: student_id, student_name, note_date, note_text, follow_up_date).
 */

var _noteRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords, findRecordById: findRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);
var _noteRowWriter = typeof appendRecord === 'function' ? { appendRecord: appendRecord, updateRecordById: updateRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowWriter.gs') : null);

function _resolveNoteRepoSheetNames() {
  if (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) return SHEET_NAMES;
  if (typeof require !== 'undefined') return require('../sheets/SheetRegistry.gs').SHEET_NAMES;
  return {};
}

function _resolveNoteRepoHeaders(sheetName) {
  if (typeof getExpectedHeaders === 'function') return getExpectedHeaders(sheetName);
  if (typeof require !== 'undefined') return require('../sheets/SheetRegistry.gs').getExpectedHeaders(sheetName);
  return null;
}

var _noteRegistry = {
  get SHEET_NAMES() { return _resolveNoteRepoSheetNames(); },
  getExpectedHeaders: function(name) { return _resolveNoteRepoHeaders(name); }
};
var _noteMapper = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function Notes_getAll(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(_noteRegistry.SHEET_NAMES.STUDENT_NOTES);
  return _noteRowReader.readAllRecords(sheet, _noteMapper);
}

function Notes_getByStudentId(spreadsheet, studentId) {
  var all = Notes_getAll(spreadsheet);
  return all.filter(function(n) { return n.student_id === studentId; });
}

function Notes_getById(spreadsheet, id) {
  var all = Notes_getAll(spreadsheet);
  for (var i = 0; i < all.length; i++) {
    var n = all[i];
    var synId = n.note_id || (n.student_id + '_' + (n.note_date || ''));
    if (synId === id || n.note_id === id) {
      return n;
    }
  }
  return null;
}

function Notes_insert(spreadsheet, record) {
  var sheet = spreadsheet.getSheetByName(_noteRegistry.SHEET_NAMES.STUDENT_NOTES);
  var headers = _noteRegistry.getExpectedHeaders(_noteRegistry.SHEET_NAMES.STUDENT_NOTES);
  return _noteRowWriter.appendRecord(sheet, _noteMapper, headers, record);
}

function Notes_update(spreadsheet, target, updates) {
  var sheet = spreadsheet.getSheetByName(_noteRegistry.SHEET_NAMES.STUDENT_NOTES);
  if (!sheet) return null;
  var headers = _noteRegistry.getExpectedHeaders(_noteRegistry.SHEET_NAMES.STUDENT_NOTES);
  var allRows = sheet.getDataRange ? sheet.getDataRange().getValues() : (sheet.getData ? sheet.getData() : []);

  var targetStuId = (typeof target === 'object' && target) ? target.student_id : target;
  var targetDate = (typeof target === 'object' && target && target.note_date) ? target.note_date : null;
  var targetText = (typeof target === 'object' && target && (target.note_text || target.content)) ? (target.note_text || target.content) : null;

  // Support synthetic ID string: studentId_date only if date pattern exists
  if (typeof target === 'string' && /\d{4}-\d{2}-\d{2}/.test(target)) {
    var parts = target.split('_');
    if (parts.length >= 2) {
      targetStuId = parts[0];
      targetDate = parts[1];
    }
  }

  var matches = [];
  for (var r = 1; r < allRows.length; r++) {
    var row = allRows[r];
    var sMatch = (row[0] === targetStuId);
    var dMatch = (!targetDate || String(row[2]).slice(0, 10) === String(targetDate).slice(0, 10));
    var tMatch = (!targetText || String(row[3]).trim() === String(targetText).trim());
    if (sMatch && dMatch && tMatch) {
      matches.push(r + 1);
    }
  }

  if (matches.length === 0) {
    return null;
  }

  if (matches.length > 1) {
    throw new Error('Ambiguous note update rejected: multiple notes match criteria for student ' + targetStuId + ' without a unique identifier in the 5-column schema.');
  }

  var targetRow = matches[0];
  if (targetRow <= 1) {
    throw new Error('Safety guard: attempted to update header row');
  }

  var headerRow = allRows[0];
  var map = _noteMapper.createHeaderMap(headerRow);
  var currentRow = allRows[targetRow - 1];
  var record = _noteMapper.rowToRecord(map, currentRow);
  var updatedRecord = Object.assign({}, record, updates);
  var newRowVals = _noteMapper.recordToRow(map, headers, updatedRecord);
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([newRowVals]);
  if (typeof sheet.setRow === 'function') {
    sheet.setRow(targetRow - 1, newRowVals);
  }
  return updatedRecord;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Notes_getAll: Notes_getAll,
    Notes_getById: Notes_getById,
    Notes_getByStudentId: Notes_getByStudentId,
    Notes_insert: Notes_insert,
    Notes_update: Notes_update
  };
}

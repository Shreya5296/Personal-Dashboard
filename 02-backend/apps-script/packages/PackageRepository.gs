/**
 * PackageRepository: CRUD persistence for the Packages sheet.
 */

var _pkgRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords, findRecordById: findRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);
var _pkgRowWriter = typeof appendRecord === 'function' ? { appendRecord: appendRecord, updateRecordById: updateRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowWriter.gs') : null);
var _pkgRegistry = typeof SHEET_NAMES !== 'undefined' ? { SHEET_NAMES: SHEET_NAMES, getExpectedHeaders: getExpectedHeaders } : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs') : null);
var _pkgMapper = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function Packages_getAll(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(_pkgRegistry.SHEET_NAMES.PACKAGES);
  return _pkgRowReader.readAllRecords(sheet, _pkgMapper);
}

function Packages_getById(spreadsheet, packageId) {
  var sheet = spreadsheet.getSheetByName(_pkgRegistry.SHEET_NAMES.PACKAGES);
  return _pkgRowReader.findRecordById(sheet, _pkgMapper, 'package_id', packageId);
}

function Packages_getByStudentId(spreadsheet, studentId) {
  var all = Packages_getAll(spreadsheet);
  return all.filter(function(p) { return p.student_id === studentId; });
}

function Packages_insert(spreadsheet, record) {
  var sheet = spreadsheet.getSheetByName(_pkgRegistry.SHEET_NAMES.PACKAGES);
  var headers = _pkgRegistry.getExpectedHeaders(_pkgRegistry.SHEET_NAMES.PACKAGES);
  return _pkgRowWriter.appendRecord(sheet, _pkgMapper, headers, record);
}

function Packages_update(spreadsheet, packageId, updates) {
  var sheet = spreadsheet.getSheetByName(_pkgRegistry.SHEET_NAMES.PACKAGES);
  var headers = _pkgRegistry.getExpectedHeaders(_pkgRegistry.SHEET_NAMES.PACKAGES);
  return _pkgRowWriter.updateRecordById(sheet, _pkgMapper, headers, 'package_id', packageId, updates);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Packages_getAll: Packages_getAll,
    Packages_getById: Packages_getById,
    Packages_getByStudentId: Packages_getByStudentId,
    Packages_insert: Packages_insert,
    Packages_update: Packages_update
  };
}

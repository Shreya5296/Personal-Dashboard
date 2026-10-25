/**
 * ClassRepository: CRUD persistence for the canonical ClassSessions sheet.
 * Canonical schema (8 columns):
 * student_id, student_name, schedule_date, schedule_time, attendance_status, session_status, cancellation_reason, deduct_class
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
  if (!sheet) return [];
  var records = _clsRowReader.readAllRecords(sheet, _clsMapper) || [];

  // Pre-load packages to attach duration
  var pkgRepo = typeof Packages_getAll === 'function' ? { Packages_getAll: Packages_getAll } : (typeof require !== 'undefined' ? require('../packages/PackageRepository.gs') : null);
  var pkgMap = {};
  if (pkgRepo && pkgRepo.Packages_getAll) {
    try {
      var allPkgs = pkgRepo.Packages_getAll(spreadsheet) || [];
      for (var p = 0; p < allPkgs.length; p++) {
        var pk = allPkgs[p];
        if (pk.student_id && !pkgMap[pk.student_id]) {
          pkgMap[pk.student_id] = Number(pk.class_duration) || 60;
        }
      }
    } catch (e) {}
  }

  return records.map(function(r) {
    var copy = Object.assign({}, r);
    var dateStr = '';
    if (r.schedule_date instanceof Date) {
      var dy = r.schedule_date.getFullYear();
      var dm = r.schedule_date.getMonth() + 1;
      var dd = r.schedule_date.getDate();
      dateStr = dy + '-' + (dm < 10 ? '0' + dm : String(dm)) + '-' + (dd < 10 ? '0' + dd : String(dd));
    } else if (r.class_date instanceof Date) {
      var dy2 = r.class_date.getFullYear();
      var dm2 = r.class_date.getMonth() + 1;
      var dd2 = r.class_date.getDate();
      dateStr = dy2 + '-' + (dm2 < 10 ? '0' + dm2 : String(dm2)) + '-' + (dd2 < 10 ? '0' + dd2 : String(dd2));
    } else if (r.schedule_date || r.class_date) {
      dateStr = String(r.schedule_date || r.class_date).trim().replace(/^'/, '').slice(0, 10);
    } else if (r.scheduled_start) {
      dateStr = String(r.scheduled_start).slice(0, 10);
    }

    var timeStr = '00:00';
    if (r.schedule_time instanceof Date) {
      var th = r.schedule_time.getHours();
      var tm = r.schedule_time.getMinutes();
      timeStr = (th < 10 ? '0' + th : String(th)) + ':' + (tm < 10 ? '0' + tm : String(tm));
    } else if (r.start_time instanceof Date) {
      var th2 = r.start_time.getHours();
      var tm2 = r.start_time.getMinutes();
      timeStr = (th2 < 10 ? '0' + th2 : String(th2)) + ':' + (tm2 < 10 ? '0' + tm2 : String(tm2));
    } else if (r.schedule_time || r.start_time) {
      timeStr = String(r.schedule_time || r.start_time).trim().replace(/^'/, '').slice(0, 5);
    } else if (r.scheduled_start) {
      timeStr = String(r.scheduled_start).slice(11, 16);
    }

    var compId = (r.student_id || '') + '__' + dateStr + '__' + timeStr;

    copy.session_id = r.class_session_id || compId;
    copy.class_session_id = copy.session_id;
    copy.schedule_date = dateStr;
    copy.schedule_time = timeStr;
    copy.start_time = timeStr;
    copy.class_date = dateStr;
    copy.topic = (r.student_name || 'Class') + ' - Session';
    copy.class_title = copy.topic;
    copy.status = r.session_status || 'SCHEDULED';
    copy.duration_minutes = pkgMap[r.student_id] || Number(r.duration_minutes) || 60;

    var startD = new Date(dateStr + 'T' + timeStr + ':00.000Z');
    if (isNaN(startD.getTime()) && r.scheduled_start) {
      startD = new Date(r.scheduled_start);
    }
    copy.scheduled_start = !isNaN(startD.getTime()) ? startD.toISOString() : (dateStr + 'T' + timeStr + ':00.000Z');
    var durMins = copy.duration_minutes;
    copy.scheduled_end = !isNaN(startD.getTime()) ? new Date(startD.getTime() + durMins * 60000).toISOString() : '';
    var metaMap = (typeof globalThis !== 'undefined' && globalThis.__sessionMetaMap) ? globalThis.__sessionMetaMap : {};
    var explicitPkgId = (metaMap[copy.session_id] ? metaMap[copy.session_id].package_id : '') || (metaMap[compId] ? metaMap[compId].package_id : '');
    copy.package_id = r.package_id || explicitPkgId || ('pkg_' + (r.student_id || 'unknown'));
    return copy;
  });
}

function Classes_getById(spreadsheet, id) {
  if (!id) return null;
  var all = Classes_getAll(spreadsheet);
  var idStr = String(id).trim();

  // Match session_id or class_session_id
  for (var i = 0; i < all.length; i++) {
    if (all[i].session_id === idStr || all[i].class_session_id === idStr) {
      return all[i];
    }
  }

  // Also support partial split
  var parts = idStr.split('__');
  if (parts.length === 3) {
    for (var j = 0; j < all.length; j++) {
      var c = all[j];
      if (c.student_id === parts[0] && c.schedule_date === parts[1] && c.schedule_time === parts[2]) {
        return c;
      }
    }
  }

  return null;
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
  if (!sheet) return null;
  var headers = _clsRegistry.getExpectedHeaders(_clsRegistry.SHEET_NAMES.CLASS_SESSIONS);

  // 1. Direct row index update
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

  // 2. Composite key matching (student_id__schedule_date__schedule_time)
  var targetId = String(id || (updates && updates.session_id) || '').trim();
  var parts = targetId.split('__');
  var sId = parts[0] || (updates && updates.student_id);
  var sDate = parts[1] || (updates && (updates.schedule_date || updates.class_date));
  var sTime = parts[2] || (updates && (updates.schedule_time || updates.start_time));

  if (sId && sDate && sTime) {
    var rawData2 = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
    if (rawData2.length > 1) {
      var headerRow2 = rawData2[0];
      var map2 = _clsMapper.createHeaderMap(headerRow2);
      var stuIdx = map2['student_id'];
      var dateIdx = map2['schedule_date'];
      var timeIdx = map2['schedule_time'];

      for (var r = 1; r < rawData2.length; r++) {
        var rVal = rawData2[r];
        var rowTime = (rVal[timeIdx] instanceof Date)
          ? ((rVal[timeIdx].getHours() < 10 ? '0' + rVal[timeIdx].getHours() : String(rVal[timeIdx].getHours())) + ':' + (rVal[timeIdx].getMinutes() < 10 ? '0' + rVal[timeIdx].getMinutes() : String(rVal[timeIdx].getMinutes())))
          : String(rVal[timeIdx] || '').slice(0, 5);
        var targetTime = (sTime instanceof Date)
          ? ((sTime.getHours() < 10 ? '0' + sTime.getHours() : String(sTime.getHours())) + ':' + (sTime.getMinutes() < 10 ? '0' + sTime.getMinutes() : String(sTime.getMinutes())))
          : String(sTime || '').slice(0, 5);
        if (rVal[stuIdx] === sId && String(rVal[dateIdx]).slice(0, 10) === sDate && rowTime === targetTime) {
          var currentRec = _clsMapper.rowToRecord(map2, rVal);
          for (var key in updates) {
            if (updates.hasOwnProperty(key) && key !== '_rowIndex' && key !== 'rowIndex') {
              currentRec[key] = updates[key];
            }
          }
          var outRow = _clsMapper.recordToRow(map2, headerRow2, currentRec);
          sheet.getRange(r + 1, 1, 1, outRow.length).setValues([outRow]);
          currentRec._rowIndex = r + 1;
          return currentRec;
        }
      }
    }
  }

  return _clsRowWriter.updateRecordById(sheet, _clsMapper, headers, 'student_id', id, updates);
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

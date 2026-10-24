/**
 * ClassScheduleService: Manages recurring weekly class schedules per student.
 * Schema (ClassSchedules): schedule_id, student_id, day_of_week, start_time, end_time, is_active, created_at, updated_at
 */

var _schedIdGen = typeof generateId === 'function' ? { generateId: generateId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _schedStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);

var VALID_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
var TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

var _memorySchedules = typeof globalThis !== 'undefined' && globalThis.__recurringSchedules ? globalThis.__recurringSchedules : {};
if (typeof globalThis !== 'undefined') globalThis.__recurringSchedules = _memorySchedules;

function validateScheduleEntry(entry) {
  if (!entry || typeof entry !== 'object') return { valid: false, message: 'Invalid schedule entry' };
  var day = String(entry.day_of_week || '').trim().toUpperCase();
  if (VALID_DAYS.indexOf(day) === -1) {
    return { valid: false, message: 'Invalid day of week: ' + entry.day_of_week };
  }
  var start = String(entry.start_time || '').trim();
  var end = String(entry.end_time || '').trim();
  if (!TIME_REGEX.test(start)) {
    return { valid: false, message: 'Start time must be in HH:MM format (e.g. 17:00)' };
  }
  if (!TIME_REGEX.test(end)) {
    return { valid: false, message: 'End time must be in HH:MM format (e.g. 18:00)' };
  }
  if (end <= start) {
    return { valid: false, message: 'End time must be after start time' };
  }
  return { valid: true, day: day, start: start, end: end };
}

function _normalizeTimeStr(val, spreadsheet) {
  if (!val) return '';
  if (val instanceof Date || (typeof val === 'object' && typeof val.getTime === 'function')) {
    if (typeof Utilities !== 'undefined' && typeof Utilities.formatDate === 'function') {
      var tz = spreadsheet && typeof spreadsheet.getSpreadsheetTimeZone === 'function' ? spreadsheet.getSpreadsheetTimeZone() : 'Asia/Kolkata';
      return Utilities.formatDate(val, tz, 'HH:mm');
    }
    var h = val.getHours();
    var m = val.getMinutes();
    return (h < 10 ? '0' + h : '' + h) + ':' + (m < 10 ? '0' + m : '' + m);
  }
  var str = String(val).trim();
  if (str.charAt(0) === "'") {
    str = str.substring(1);
  }
  if (/^1899-12-30T/.test(str)) {
    var d = new Date(str);
    if (typeof Utilities !== 'undefined' && typeof Utilities.formatDate === 'function') {
      var tz2 = spreadsheet && typeof spreadsheet.getSpreadsheetTimeZone === 'function' ? spreadsheet.getSpreadsheetTimeZone() : 'Asia/Kolkata';
      return Utilities.formatDate(d, tz2, 'HH:mm');
    }
    var dh = d.getHours();
    var dm = d.getMinutes();
    return (dh < 10 ? '0' + dh : '' + dh) + ':' + (dm < 10 ? '0' + dm : '' + dm);
  }
  return str;
}

function _ensureClassSchedulesSheet(spreadsheet) {
  if (!spreadsheet) return null;
  var sheet = spreadsheet.getSheetByName ? spreadsheet.getSheetByName('ClassSchedules') : null;
  if (!sheet && typeof spreadsheet.insertSheet === 'function') {
    sheet = spreadsheet.insertSheet('ClassSchedules');
    sheet.appendRow(['schedule_id', 'student_id', 'day_of_week', 'start_time', 'end_time', 'is_active', 'created_at', 'updated_at']);
  }
  return sheet;
}

function Schedules_list(spreadsheet, studentId) {
  var sid = studentId ? String(studentId).trim() : null;
  var sheet = _ensureClassSchedulesSheet(spreadsheet);
  if (!sheet) {
    if (sid && _memorySchedules[sid]) return { success: true, data: _memorySchedules[sid], meta: { persistentSheet: false } };
    return { success: true, data: [], meta: { persistentSheet: false } };
  }

  var stuSheet = spreadsheet && spreadsheet.getSheetByName ? spreadsheet.getSheetByName('Students') : null;
  var stuNameMap = {};
  if (stuSheet) {
    var sData = stuSheet.getDataRange ? stuSheet.getDataRange().getValues() : (stuSheet.getData ? stuSheet.getData() : []);
    if (sData.length > 1) {
      var sHeaders = sData[0].map(function(h) { return String(h || '').trim(); });
      var idCol = sHeaders.indexOf('student_id');
      var nameCol = sHeaders.indexOf('student_name');
      if (nameCol === -1) nameCol = sHeaders.indexOf('full_name');
      if (idCol !== -1 && nameCol !== -1) {
        for (var si = 1; si < sData.length; si++) {
          var sRow = sData[si];
          var sidKey = String(sRow[idCol] || '').trim();
          var sName = String(sRow[nameCol] || '').trim();
          if (sidKey) stuNameMap[sidKey] = sName;
        }
      }
    }
  }

  var data = sheet.getDataRange ? sheet.getDataRange().getValues() : (sheet.getData ? sheet.getData() : []);
  if (data.length <= 1) return { success: true, data: [] };

  var headers = data[0].map(function(h) { return String(h || '').trim(); });
  var stuIdx = headers.indexOf('student_id');
  var results = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!sid || (stuIdx !== -1 && String(row[stuIdx]).trim() === sid)) {
      var item = {};
      for (var h = 0; h < headers.length; h++) {
        var hName = headers[h];
        if (hName === 'start_time' || hName === 'end_time') {
          item[hName] = _normalizeTimeStr(row[h], spreadsheet);
        } else {
          item[hName] = row[h];
        }
      }
      if (item.is_active !== false && item.is_active !== 'FALSE') {
        if (!item.student_name && stuNameMap[item.student_id]) {
          item.student_name = stuNameMap[item.student_id];
        }
        results.push(item);
      }
    }
  }
  return { success: true, data: results, meta: { persistentSheet: true } };
}

function Schedules_save(spreadsheet, studentId, entries, actor) {
  var sid = String(studentId || '').trim();
  if (!sid) return { success: false, code: 'VALIDATION_ERROR', message: 'Student ID is required' };

  var list = entries || [];
  var validated = [];
  for (var i = 0; i < list.length; i++) {
    var check = validateScheduleEntry(list[i]);
    if (!check.valid) {
      return { success: false, code: 'VALIDATION_ERROR', message: check.message };
    }
    var existingId = list[i].schedule_id || (list[i].id && !list[i].id.startsWith('temp_') && !/^\d+$/.test(list[i].id) ? list[i].id : null);
    validated.push({
      schedule_id: existingId || (_schedIdGen ? _schedIdGen.generateId('csch_') : 'csch_' + Date.now() + '_' + i),
      student_id: sid,
      day_of_week: check.day,
      start_time: check.start,
      end_time: check.end,
      is_active: true,
      created_at: list[i].created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  var sheet = _ensureClassSchedulesSheet(spreadsheet);
  if (!sheet) {
    _memorySchedules[sid] = validated;
    return {
      success: true,
      data: validated,
      meta: { persistentSheet: false, notice: 'ClassSchedules sheet not yet created in spreadsheet; stored in session cache' }
    };
  }

  var data = sheet.getDataRange ? sheet.getDataRange().getValues() : (sheet.getData ? sheet.getData() : []);
  var headers = data[0].map(function(h) { return String(h || '').trim(); });
  var stuIdx = headers.indexOf('student_id');
  for (var r = data.length - 1; r >= 1; r--) {
    if (stuIdx !== -1 && String(data[r][stuIdx]).trim() === sid) {
      sheet.deleteRow(r + 1);
    }
  }
  for (var v = 0; v < validated.length; v++) {
    var rec = validated[v];
    var rowData = headers.map(function(h) {
      var val = rec[h] !== undefined ? rec[h] : '';
      if ((h === 'start_time' || h === 'end_time') && val) {
        return "'" + String(val).trim();
      }
      return val;
    });
    sheet.appendRow(rowData);
  }

  _memorySchedules[sid] = validated;

  return { success: true, data: validated, meta: { persistentSheet: true } };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateScheduleEntry: validateScheduleEntry,
    Schedules_list: Schedules_list,
    Schedules_save: Schedules_save
  };
}

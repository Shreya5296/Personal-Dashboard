/**
 * MeetingLinkCleanup: Identifies and clears meeting links for archived or inactive students.
 */

var _mlRepoCl = typeof MeetingLinks_getByStudentId === 'function' ? { MeetingLinks_getByStudentId: MeetingLinks_getByStudentId, MeetingLinks_update: MeetingLinks_update } : (typeof require !== 'undefined' ? require('./MeetingLinkRepository.gs') : null);
var _mlStuRepoCl = typeof Students_getAll === 'function' ? { Students_getAll: Students_getAll } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
var _mlRegCl = {
  get SHEET_NAMES() { return (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) || (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').SHEET_NAMES : {}); }
};
var _mlMapCl = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);

function _calcOneMonthAgoInIst(refDateStr) {
  var d = refDateStr ? new Date(refDateStr) : new Date();
  var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  var p = parts.split('-').map(Number);
  var targetY = p[1] === 1 ? p[0] - 1 : p[0];
  var targetM = p[1] === 1 ? 12 : p[1] - 1;
  var maxDays = new Date(Date.UTC(targetY, targetM, 0)).getUTCDate();
  var targetD = Math.min(p[2], maxDays);
  return targetY + '-' + (targetM < 10 ? '0' + targetM : String(targetM)) + '-' + (targetD < 10 ? '0' + targetD : String(targetD));
}

function MeetingLinks_cleanupInactiveStudents(spreadsheet, actor) {
  var stuSheet = spreadsheet.getSheetByName(_mlRegCl.SHEET_NAMES.STUDENTS);
  var students = stuSheet ? (typeof readAllRecords === 'function' ? readAllRecords(stuSheet, _mlMapCl) : (_mlStuRepoCl && _mlStuRepoCl.Students_getAll ? _mlStuRepoCl.Students_getAll(spreadsheet) : [])) : [];
  var clsSheet = spreadsheet.getSheetByName(_mlRegCl.SHEET_NAMES.CLASS_SESSIONS);
  var sessions = clsSheet ? (typeof readAllRecords === 'function' ? readAllRecords(clsSheet, _mlMapCl) : []) : [];
  var thresholdDate = _calcOneMonthAgoInIst();
  var cleanedStudentIds = [];

  for (var i = 0; i < students.length; i++) {
    var sid = students[i].student_id;
    var statusUpper = String(students[i].status || students[i].student_status || '').toUpperCase();
    var isInactive = statusUpper === 'ARCHIVED' || statusUpper === 'INACTIVE';
    if (!isInactive) {
      var stuCompleted = sessions.filter(function(s) { return s.student_id === sid && String(s.session_status || s.status || '').toUpperCase() === 'COMPLETED'; });
      if (stuCompleted.length > 0) {
        var latestDate = '';
        for (var c = 0; c < stuCompleted.length; c++) {
          var cd = stuCompleted[c].schedule_date || stuCompleted[c].class_date || '';
          if (!cd && stuCompleted[c].scheduled_start) cd = String(stuCompleted[c].scheduled_start).slice(0, 10);
          if (cd && (!latestDate || cd > latestDate)) latestDate = cd;
        }
        if (latestDate && latestDate < thresholdDate) isInactive = true;
      }
    }
    if (isInactive) {
      var existingLink = _mlRepoCl.MeetingLinks_getByStudentId(spreadsheet, sid);
      if (existingLink && (existingLink.meeting_link_1 || existingLink.meeting_link_2)) {
        _mlRepoCl.MeetingLinks_update(spreadsheet, sid, { meeting_link_1: '', meeting_link_2: '' });
        cleanedStudentIds.push(sid);
      }
    }
  }
  return { success: true, data: { cleanedStudentIds: cleanedStudentIds, count: cleanedStudentIds.length } };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MeetingLinks_cleanupInactiveStudents: MeetingLinks_cleanupInactiveStudents,
    _calcOneMonthAgoInIst: _calcOneMonthAgoInIst
  };
}

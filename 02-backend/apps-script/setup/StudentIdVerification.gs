/**
 * StudentIdVerification: Read-only referential integrity audit and rollback
 * engine for Student ID migrations.
 */

var _migHelper = typeof findColIndex === 'function' && typeof updateColumnWithMap === 'function'
  ? { findColIndex: findColIndex, updateColumnWithMap: updateColumnWithMap }
  : (typeof require !== 'undefined' ? require('./StudentIdMigration.gs') : null);

function verifyStudentIdReferentialIntegrity(spreadsheet) {
  var ss = spreadsheet || (typeof SpreadsheetApp !== 'undefined' ? SpreadsheetApp.getActiveSpreadsheet() : null);
  if (!ss) return { success: false, message: 'Spreadsheet not available' };
  var stuSheet = ss.getSheetByName('Students');
  if (!stuSheet) return { success: false, message: 'Students sheet not found' };

  var getColIdx = _migHelper && _migHelper.findColIndex ? _migHelper.findColIndex : findColIndex;
  var stuCol = getColIdx(stuSheet, 'student_id');
  if (stuCol < 1) return { success: false, message: 'student_id column not found in Students' };

  var lastRow = stuSheet.getLastRow(), validIds = {}, nonStandardStudentIds = [];
  if (lastRow > 1) {
    var ids = stuSheet.getRange(2, stuCol, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var sid = String(ids[i][0] || '').trim();
      if (sid) {
        validIds[sid] = true;
        if (!/^STU_\d+$/.test(sid)) nonStandardStudentIds.push(sid);
      }
    }
  }

  var dangling = {}, sheetsToCheck = ['Packages', 'Payments', 'ClassSessions', 'MeetingLinks', 'StudentNotes', 'ClassSchedules'];
  for (var s = 0; s < sheetsToCheck.length; s++) {
    var name = sheetsToCheck[s], sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() <= 1) continue;
    var cIdx = getColIdx(sh, 'student_id');
    if (cIdx <= 0) continue;
    var rows = sh.getRange(2, cIdx, sh.getLastRow() - 1, 1).getValues();
    for (var r = 0; r < rows.length; r++) {
      var ref = String(rows[r][0] || '').trim();
      if (ref && !validIds[ref]) {
        if (!dangling[name]) dangling[name] = [];
        dangling[name].push({ row: r + 2, student_id: ref });
      }
    }
  }

  return {
    success: true,
    isValid: nonStandardStudentIds.length === 0 && Object.keys(dangling).length === 0,
    totalStudents: Object.keys(validIds).length,
    standardStudentCount: Object.keys(validIds).length - nonStandardStudentIds.length,
    nonStandardStudentIds: nonStandardStudentIds,
    danglingReferences: dangling
  };
}

function rollbackStudentIdMigration(spreadsheet) {
  var lock = (typeof LockService !== 'undefined') ? LockService.getScriptLock() : null;
  if (lock && !lock.tryLock(30000)) {
    return { success: false, code: 'CONCURRENCY_LOCKED', message: 'Rollback cannot proceed: lock unavailable' };
  }
  try {
    var ss = spreadsheet || (typeof SpreadsheetApp !== 'undefined' ? SpreadsheetApp.getActiveSpreadsheet() : null);
    if (!ss) return { success: false, message: 'Spreadsheet not available' };
    var backupSheet = ss.getSheetByName('StudentId_Migration_Backup');
    if (!backupSheet || backupSheet.getLastRow() <= 1) {
      return { success: false, message: 'No StudentId_Migration_Backup sheet or records found to rollback' };
    }

    var data = backupSheet.getRange(2, 1, backupSheet.getLastRow() - 1, backupSheet.getLastColumn()).getValues();
    var reverseMap = {}, checkCollisions = {};
    for (var i = 0; i < data.length; i++) {
      var orig = String(data[i][0] || '').trim(), mig = String(data[i][1] || '').trim();
      if (orig && mig) {
        if (checkCollisions[mig]) return { success: false, message: 'Ambiguous mapping in backup: ' + mig };
        checkCollisions[mig] = true;
        reverseMap[mig] = orig;
      }
    }
    var revCount = Object.keys(reverseMap).length;
    if (revCount === 0) return { success: false, message: 'No valid rollback pairs found' };

    var getColIdx = _migHelper && _migHelper.findColIndex ? _migHelper.findColIndex : findColIndex;
    var updateCol = _migHelper && _migHelper.updateColumnWithMap ? _migHelper.updateColumnWithMap : updateColumnWithMap;

    var stats = {}, sheets = ['Students', 'Packages', 'Payments', 'ClassSessions', 'MeetingLinks', 'StudentNotes', 'ClassSchedules'];
    for (var s = 0; s < sheets.length; s++) {
      var sh = ss.getSheetByName(sheets[s]);
      if (sh) { var cIdx = getColIdx(sh, 'student_id'); if (cIdx > 0) stats[sheets[s]] = updateCol(sh, cIdx, reverseMap); }
    }

    var auditSheet = ss.getSheetByName('AuditLog');
    if (auditSheet && auditSheet.getLastRow() > 1) {
      var eCol = getColIdx(auditSheet, 'entity_id'), tCol = getColIdx(auditSheet, 'entity_type');
      if (eCol > 0 && tCol > 0) {
        var eVals = auditSheet.getRange(2, eCol, auditSheet.getLastRow() - 1, 1).getValues();
        var tVals = auditSheet.getRange(2, tCol, auditSheet.getLastRow() - 1, 1).getValues(), aUp = 0;
        for (var a = 0; a < eVals.length; a++) {
          if (String(tVals[a][0] || '').trim().toUpperCase() === 'STUDENT') {
            var val = String(eVals[a][0] || '').trim();
            if (val && reverseMap[val]) { eVals[a][0] = reverseMap[val]; aUp++; }
          }
        }
        if (aUp > 0) { auditSheet.getRange(2, eCol, auditSheet.getLastRow() - 1, 1).setValues(eVals); stats.AuditLog = aUp; }
      }
    }

    var statusCol = getColIdx(backupSheet, 'status');
    if (statusCol > 0) {
      var sRange = backupSheet.getRange(2, statusCol, backupSheet.getLastRow() - 1, 1);
      var sVals = sRange.getValues();
      for (var k = 0; k < sVals.length; k++) sVals[k][0] = 'ROLLED_BACK';
      sRange.setValues(sVals);
    }

    return { success: true, rolledBackCount: revCount, cascadeStats: stats };
  } finally {
    if (lock) lock.releaseLock();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    verifyStudentIdReferentialIntegrity: verifyStudentIdReferentialIntegrity,
    rollbackStudentIdMigration: rollbackStudentIdMigration
  };
}

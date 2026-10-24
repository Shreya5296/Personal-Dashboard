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

  var lastRow = stuSheet.getLastRow();
  var validIds = {};
  var nonStandardStudentIds = [];
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

  var dangling = {};
  var sheetsToCheck = ['Packages', 'Payments', 'ClassSessions', 'MeetingLinks', 'StudentNotes', 'ClassSchedules'];
  for (var s = 0; s < sheetsToCheck.length; s++) {
    var name = sheetsToCheck[s];
    var sh = ss.getSheetByName(name);
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

  var isClean = nonStandardStudentIds.length === 0 && Object.keys(dangling).length === 0;
  return {
    success: true,
    isValid: isClean,
    totalStudents: Object.keys(validIds).length,
    standardStudentCount: Object.keys(validIds).length - nonStandardStudentIds.length,
    nonStandardStudentIds: nonStandardStudentIds,
    danglingReferences: dangling
  };
}

function rollbackStudentIdMigration(spreadsheet) {
  var ss = spreadsheet || (typeof SpreadsheetApp !== 'undefined' ? SpreadsheetApp.getActiveSpreadsheet() : null);
  if (!ss) return { success: false, message: 'Spreadsheet not available' };
  var backupSheet = ss.getSheetByName('StudentId_Migration_Backup');
  if (!backupSheet || backupSheet.getLastRow() <= 1) {
    return { success: false, message: 'No StudentId_Migration_Backup sheet or records found to rollback' };
  }

  var data = backupSheet.getRange(2, 1, backupSheet.getLastRow() - 1, 2).getValues();
  var reverseMap = {};
  for (var i = 0; i < data.length; i++) {
    var orig = String(data[i][0] || '').trim();
    var mig = String(data[i][1] || '').trim();
    if (orig && mig) reverseMap[mig] = orig;
  }
  var revCount = Object.keys(reverseMap).length;
  if (revCount === 0) return { success: false, message: 'No valid rollback pairs found' };

  var getColIdx = _migHelper && _migHelper.findColIndex ? _migHelper.findColIndex : findColIndex;
  var updateCol = _migHelper && _migHelper.updateColumnWithMap ? _migHelper.updateColumnWithMap : updateColumnWithMap;

  var stats = {};
  var sheetsToRollback = ['Students', 'Packages', 'Payments', 'ClassSessions', 'MeetingLinks', 'StudentNotes', 'ClassSchedules'];
  for (var s = 0; s < sheetsToRollback.length; s++) {
    var name = sheetsToRollback[s];
    var sh = ss.getSheetByName(name);
    if (!sh) continue;
    var cIdx = getColIdx(sh, 'student_id');
    if (cIdx > 0) stats[name] = updateCol(sh, cIdx, reverseMap);
  }

  var auditSheet = ss.getSheetByName('AuditLog');
  if (auditSheet) {
    var eCol = getColIdx(auditSheet, 'entity_id');
    var tCol = getColIdx(auditSheet, 'entity_type');
    if (eCol > 0 && tCol > 0 && auditSheet.getLastRow() > 1) {
      var eRange = auditSheet.getRange(2, eCol, auditSheet.getLastRow() - 1, 1);
      var tRange = auditSheet.getRange(2, tCol, auditSheet.getLastRow() - 1, 1);
      var eVals = eRange.getValues();
      var tVals = tRange.getValues();
      var aUp = 0;
      for (var a = 0; a < eVals.length; a++) {
        if (String(tVals[a][0] || '').trim().toUpperCase() === 'STUDENT') {
          var val = String(eVals[a][0] || '').trim();
          if (val && reverseMap[val]) { eVals[a][0] = reverseMap[val]; aUp++; }
        }
      }
      if (aUp > 0) eRange.setValues(eVals);
      stats.AuditLog = aUp;
    }
  }

  return { success: true, rolledBackCount: revCount, cascadeStats: stats };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    verifyStudentIdReferentialIntegrity: verifyStudentIdReferentialIntegrity,
    rollbackStudentIdMigration: rollbackStudentIdMigration
  };
}

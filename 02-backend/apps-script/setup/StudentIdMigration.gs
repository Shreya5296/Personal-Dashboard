/**
 * StudentIdMigration: Safe, idempotent migration of legacy student IDs to sequential STU_xxx.
 * Features: Script locking, pre-write backup, resume-on-retry, cascading foreign keys.
 */

function buildStudentIdMigrationMap(students) {
  var idSet = {}, maxNum = 0, list = students || [];
  for (var i = 0; i < list.length; i++) {
    var raw = list[i].student_id || list[i].id;
    if (!raw) continue;
    var s = String(raw).trim();
    idSet[s.toUpperCase()] = true;
    var m = s.match(/^STU_(\d+)$/);
    if (m) { var n = parseInt(m[1], 10); if (n > maxNum) maxNum = n; }
  }
  var mapping = {}, next = maxNum + 1;
  for (var j = 0; j < list.length; j++) {
    var sid = String(list[j].student_id || list[j].id || '').trim();
    if (!sid || /^STU_\d+$/.test(sid) || mapping[sid]) continue;
    var c = next < 10 ? 'STU_00' + next : (next < 100 ? 'STU_0' + next : 'STU_' + next);
    while (idSet[c.toUpperCase()]) { next++; c = next < 10 ? 'STU_00' + next : (next < 100 ? 'STU_0' + next : 'STU_' + next); }
    idSet[c.toUpperCase()] = true;
    mapping[sid] = c;
    next++;
  }
  return mapping;
}

function updateColumnWithMap(sheet, colIndex, mapping) {
  if (!sheet || sheet.getLastRow() <= 1) return 0;
  var range = sheet.getRange(2, colIndex, sheet.getLastRow() - 1, 1);
  var values = range.getValues(), updated = 0;
  for (var r = 0; r < values.length; r++) {
    var val = String(values[r][0] || '').trim();
    if (val && mapping[val]) { values[r][0] = mapping[val]; updated++; }
  }
  if (updated > 0) range.setValues(values);
  return updated;
}

function findColIndex(sheet, colName) {
  if (!sheet || sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) return -1;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var c = 0; c < headers.length; c++) {
    if (String(headers[c] || '').trim().toLowerCase() === colName.toLowerCase()) return c + 1;
  }
  return -1;
}

function runStudentIdMigration(spreadsheet) {
  var lock = (typeof LockService !== 'undefined') ? LockService.getScriptLock() : null;
  if (lock && !lock.tryLock(30000)) {
    return { success: false, code: 'CONCURRENCY_LOCKED', message: 'Migration is already running' };
  }
  try {
    var ss = spreadsheet || (typeof SpreadsheetApp !== 'undefined' ? SpreadsheetApp.getActiveSpreadsheet() : null);
    if (!ss) return { success: false, message: 'Spreadsheet not available' };
    var stuSheet = ss.getSheetByName('Students');
    if (!stuSheet) return { success: false, message: 'Students sheet not found' };
    var stuCol = findColIndex(stuSheet, 'student_id');
    if (stuCol < 1) return { success: false, message: 'student_id column not found in Students' };

    var backupSheet = ss.getSheetByName('StudentId_Migration_Backup');
    var mapping = {}, isResume = false;
    if (backupSheet && backupSheet.getLastRow() > 1) {
      var bRows = backupSheet.getRange(2, 1, backupSheet.getLastRow() - 1, backupSheet.getLastColumn()).getValues();
      for (var b = 0; b < bRows.length; b++) {
        var o = String(bRows[b][0] || '').trim(), m = String(bRows[b][1] || '').trim();
        if (o && m) mapping[o] = m;
      }
      isResume = Object.keys(mapping).length > 0;
    }

    if (!isResume) {
      var lastRow = stuSheet.getLastRow(), students = [];
      if (lastRow > 1) {
        var ids = stuSheet.getRange(2, stuCol, lastRow - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) students.push({ student_id: ids[i][0] });
      }
      mapping = buildStudentIdMigrationMap(students);
      if (Object.keys(mapping).length === 0) {
        return { success: true, alreadyCompleted: true, migratedCount: 0, message: 'No legacy student IDs found. All IDs are standard.' };
      }
      backupSheet = backupSheet || ss.insertSheet('StudentId_Migration_Backup');
      backupSheet.appendRow(['original_id', 'migrated_id', 'status', 'created_at', 'updated_at']);
      var now = new Date().toISOString();
      for (var oldId in mapping) backupSheet.appendRow([oldId, mapping[oldId], 'MAPPED', now, now]);
    }

    var stats = { students: updateColumnWithMap(stuSheet, stuCol, mapping) };
    var cascadeSheets = ['Packages', 'Payments', 'ClassSessions', 'MeetingLinks', 'StudentNotes', 'ClassSchedules'];
    for (var s = 0; s < cascadeSheets.length; s++) {
      var sh = ss.getSheetByName(cascadeSheets[s]);
      if (sh) { var cIdx = findColIndex(sh, 'student_id'); if (cIdx > 0) stats[cascadeSheets[s]] = updateColumnWithMap(sh, cIdx, mapping); }
    }

    var auditSheet = ss.getSheetByName('AuditLog');
    if (auditSheet && auditSheet.getLastRow() > 1) {
      var eCol = findColIndex(auditSheet, 'entity_id'), tCol = findColIndex(auditSheet, 'entity_type');
      if (eCol > 0 && tCol > 0) {
        var eVals = auditSheet.getRange(2, eCol, auditSheet.getLastRow() - 1, 1).getValues();
        var tVals = auditSheet.getRange(2, tCol, auditSheet.getLastRow() - 1, 1).getValues(), aUp = 0;
        for (var a = 0; a < eVals.length; a++) {
          if (String(tVals[a][0] || '').trim().toUpperCase() === 'STUDENT') {
            var val = String(eVals[a][0] || '').trim();
            if (val && mapping[val]) { eVals[a][0] = mapping[val]; aUp++; }
          }
        }
        if (aUp > 0) { auditSheet.getRange(2, eCol, auditSheet.getLastRow() - 1, 1).setValues(eVals); stats.AuditLog = aUp; }
      }
    }

    if (backupSheet && backupSheet.getLastRow() > 1) {
      var statusCol = findColIndex(backupSheet, 'status');
      if (statusCol > 0) {
        var sRange = backupSheet.getRange(2, statusCol, backupSheet.getLastRow() - 1, 1);
        var sVals = sRange.getValues();
        for (var k = 0; k < sVals.length; k++) sVals[k][0] = 'COMPLETED';
        sRange.setValues(sVals);
      }
    }

    var totalUpdated = 0;
    for (var kKey in stats) totalUpdated += stats[kKey];
    return { success: true, alreadyCompleted: totalUpdated === 0 && isResume, resumed: isResume, migratedCount: Object.keys(mapping).length, mapping: mapping, cascadeStats: stats };
  } finally {
    if (lock) lock.releaseLock();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildStudentIdMigrationMap: buildStudentIdMigrationMap, runStudentIdMigration: runStudentIdMigration, findColIndex: findColIndex, updateColumnWithMap: updateColumnWithMap };
}

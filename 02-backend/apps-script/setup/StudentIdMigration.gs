/**
 * StudentIdMigration: Safe, idempotent migration of legacy random student IDs
 * (stu_...) to standard sequential IDs (STU_001, STU_002, ...) with full
 * referential integrity cascading across all dependent sheets.
 */

function buildStudentIdMigrationMap(students) {
  var idSet = {};
  var maxNum = 0;
  var list = students || [];
  for (var i = 0; i < list.length; i++) {
    var rawId = list[i].student_id || list[i].id;
    if (!rawId) continue;
    var idStr = String(rawId).trim();
    idSet[idStr.toUpperCase()] = true;
    var m = idStr.match(/^STU_(\d+)$/);
    if (m) {
      var n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }

  var mapping = {};
  var nextNum = maxNum + 1;
  for (var j = 0; j < list.length; j++) {
    var sid = String(list[j].student_id || list[j].id || '').trim();
    if (!sid || /^STU_\d+$/.test(sid)) continue;
    var cand = nextNum < 10 ? 'STU_00' + nextNum : (nextNum < 100 ? 'STU_0' + nextNum : 'STU_' + nextNum);
    while (idSet[cand.toUpperCase()]) {
      nextNum++;
      cand = nextNum < 10 ? 'STU_00' + nextNum : (nextNum < 100 ? 'STU_0' + nextNum : 'STU_' + nextNum);
    }
    idSet[cand.toUpperCase()] = true;
    mapping[sid] = cand;
    nextNum++;
  }
  return mapping;
}

function updateColumnWithMap(sheet, colIndex, mapping) {
  if (!sheet) return 0;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  var range = sheet.getRange(2, colIndex, lastRow - 1, 1);
  var values = range.getValues();
  var updated = 0;
  for (var r = 0; r < values.length; r++) {
    var val = String(values[r][0] || '').trim();
    if (val && mapping[val]) {
      values[r][0] = mapping[val];
      updated++;
    }
  }
  if (updated > 0) range.setValues(values);
  return updated;
}

function findColIndex(sheet, colName) {
  if (!sheet || sheet.getLastRow() < 1) return -1;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var c = 0; c < headers.length; c++) {
    if (String(headers[c] || '').trim().toLowerCase() === colName.toLowerCase()) return c + 1;
  }
  return -1;
}

function runStudentIdMigration(spreadsheet) {
  var ss = spreadsheet || (typeof SpreadsheetApp !== 'undefined' ? SpreadsheetApp.getActiveSpreadsheet() : null);
  if (!ss) return { success: false, message: 'Spreadsheet not available' };
  var stuSheet = ss.getSheetByName('Students');
  if (!stuSheet) return { success: false, message: 'Students sheet not found' };

  var stuCol = findColIndex(stuSheet, 'student_id');
  if (stuCol < 1) return { success: false, message: 'student_id column not found in Students' };

  var lastRow = stuSheet.getLastRow();
  var students = [];
  if (lastRow > 1) {
    var ids = stuSheet.getRange(2, stuCol, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) students.push({ student_id: ids[i][0] });
  }

  var mapping = buildStudentIdMigrationMap(students);
  var legacyCount = Object.keys(mapping).length;
  if (legacyCount === 0) {
    return { success: true, migratedCount: 0, message: 'No legacy student IDs found. All IDs are standard.', mapping: {} };
  }

  var backupSheet = ss.getSheetByName('StudentId_Migration_Backup');
  if (!backupSheet) {
    backupSheet = ss.insertSheet('StudentId_Migration_Backup');
    backupSheet.appendRow(['original_id', 'migrated_id', 'migrated_at']);
  }
  var now = new Date().toISOString();
  for (var oldId in mapping) backupSheet.appendRow([oldId, mapping[oldId], now]);

  var stats = { students: updateColumnWithMap(stuSheet, stuCol, mapping) };
  var sheetsToCascade = ['Packages', 'Payments', 'ClassSessions', 'MeetingLinks', 'StudentNotes', 'ClassSchedules'];
  for (var s = 0; s < sheetsToCascade.length; s++) {
    var name = sheetsToCascade[s];
    var sh = ss.getSheetByName(name);
    if (!sh) continue;
    var cIdx = findColIndex(sh, 'student_id');
    if (cIdx > 0) stats[name] = updateColumnWithMap(sh, cIdx, mapping);
  }

  var auditSheet = ss.getSheetByName('AuditLog');
  if (auditSheet) {
    var eCol = findColIndex(auditSheet, 'entity_id');
    var tCol = findColIndex(auditSheet, 'entity_type');
    if (eCol > 0 && tCol > 0 && auditSheet.getLastRow() > 1) {
      var eRange = auditSheet.getRange(2, eCol, auditSheet.getLastRow() - 1, 1);
      var tRange = auditSheet.getRange(2, tCol, auditSheet.getLastRow() - 1, 1);
      var eVals = eRange.getValues();
      var tVals = tRange.getValues();
      var aUp = 0;
      for (var a = 0; a < eVals.length; a++) {
        if (String(tVals[a][0] || '').trim().toUpperCase() === 'STUDENT') {
          var val = String(eVals[a][0] || '').trim();
          if (val && mapping[val]) { eVals[a][0] = mapping[val]; aUp++; }
        }
      }
      if (aUp > 0) eRange.setValues(eVals);
      stats.AuditLog = aUp;
    }
  }

  return { success: true, migratedCount: legacyCount, mapping: mapping, cascadeStats: stats };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildStudentIdMigrationMap: buildStudentIdMigrationMap,
    runStudentIdMigration: runStudentIdMigration,
    findColIndex: findColIndex,
    updateColumnWithMap: updateColumnWithMap
  };
}

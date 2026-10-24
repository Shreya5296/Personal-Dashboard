/**
 * StudentIdPreflight: Strictly read-only preflight analysis for Student ID
 * migration. Evaluates referential integrity, schema readiness, and backup state
 * without performing any spreadsheet mutations.
 */

var _migH = typeof findColIndex === 'function' && typeof buildStudentIdMigrationMap === 'function'
  ? { findColIndex: findColIndex, buildStudentIdMigrationMap: buildStudentIdMigrationMap }
  : (typeof require !== 'undefined' ? require('./StudentIdMigration.gs') : null);

function runStudentIdMigrationPreflight(spreadsheet) {
  var ss = spreadsheet || (typeof SpreadsheetApp !== 'undefined' ? SpreadsheetApp.getActiveSpreadsheet() : null);
  if (!ss) return { ready: false, status: 'BLOCKED', reasons: ['Spreadsheet not available'] };

  var reasons = [];
  var warnings = [];
  var getCol = _migH && _migH.findColIndex ? _migH.findColIndex : findColIndex;
  var buildMap = _migH && _migH.buildStudentIdMigrationMap ? _migH.buildStudentIdMigrationMap : buildStudentIdMigrationMap;

  var stuSheet = ss.getSheetByName('Students');
  if (!stuSheet) return { ready: false, status: 'BLOCKED', reasons: ['Students sheet not found in spreadsheet'] };

  var stuCol = getCol(stuSheet, 'student_id');
  if (stuCol < 1) return { ready: false, status: 'BLOCKED', reasons: ['student_id column not found in Students sheet'] };

  var lastStuRow = stuSheet.getLastRow();
  var students = [];
  var idCounts = {};
  var legacyIds = [];
  var standardIds = [];

  if (lastStuRow > 1) {
    var rawIds = stuSheet.getRange(2, stuCol, lastStuRow - 1, 1).getValues();
    for (var i = 0; i < rawIds.length; i++) {
      var sid = String(rawIds[i][0] || '').trim();
      if (!sid) continue;
      students.push({ student_id: sid });
      idCounts[sid] = (idCounts[sid] || 0) + 1;
      if (/^STU_\d+$/.test(sid)) {
        standardIds.push(sid);
      } else {
        legacyIds.push(sid);
      }
    }
  }

  for (var id in idCounts) {
    if (idCounts[id] > 1) {
      reasons.push('Duplicate student ID in Students tab: ' + id + ' (' + idCounts[id] + ' occurrences)');
    }
  }

  var validIdSet = {};
  for (var s = 0; s < students.length; s++) validIdSet[students[s].student_id] = true;

  var depSheets = ['Packages', 'Payments', 'ClassSessions', 'MeetingLinks', 'StudentNotes', 'ClassSchedules'];
  var depRefCounts = {};
  var dangling = {};

  for (var d = 0; d < depSheets.length; d++) {
    var dName = depSheets[d];
    var dSheet = ss.getSheetByName(dName);
    if (!dSheet) {
      if (dName === 'ClassSchedules') {
        warnings.push('ClassSchedules sheet not present in spreadsheet (storage inactive)');
      }
      continue;
    }
    var dCol = getCol(dSheet, 'student_id');
    if (dCol <= 0) continue;
    var dLast = dSheet.getLastRow();
    if (dLast <= 1) continue;

    var dVals = dSheet.getRange(2, dCol, dLast - 1, 1).getValues();
    depRefCounts[dName] = dVals.length;
    for (var r = 0; r < dVals.length; r++) {
      var refId = String(dVals[r][0] || '').trim();
      if (refId && !validIdSet[refId]) {
        if (!dangling[dName]) dangling[dName] = [];
        dangling[dName].push({ row: r + 2, student_id: refId });
      }
    }
  }

  for (var dSheetName in dangling) {
    reasons.push('Dangling foreign-key references in ' + dSheetName + ': ' + dangling[dSheetName].length + ' orphaned rows');
  }

  var backupStatus = 'NONE';
  var backupSheet = ss.getSheetByName('StudentId_Migration_Backup');
  var existingMap = null;

  if (backupSheet && backupSheet.getLastRow() > 1) {
    backupStatus = 'EXISTING_VALID';
    var bData = backupSheet.getRange(2, 1, backupSheet.getLastRow() - 1, backupSheet.getLastColumn()).getValues();
    existingMap = {};
    for (var b = 0; b < bData.length; b++) {
      var oId = String(bData[b][0] || '').trim();
      var mId = String(bData[b][1] || '').trim();
      if (oId && mId) existingMap[oId] = mId;
    }
    warnings.push('Existing migration backup detected with ' + Object.keys(existingMap).length + ' persisted mappings');
  }

  var proposedMap = existingMap || buildMap(students);
  var targetCollisionCheck = {};
  for (var orig in proposedMap) {
    var dest = proposedMap[orig];
    if (targetCollisionCheck[dest]) {
      reasons.push('Collision in proposed mapping: destination ID ' + dest + ' assigned multiple times');
    }
    targetCollisionCheck[dest] = true;
  }

  var isReady = reasons.length === 0;
  return {
    ready: isReady,
    status: isReady ? 'READY' : 'BLOCKED',
    reasons: reasons,
    warnings: warnings,
    stats: {
      totalStudents: students.length,
      standardStudentCount: standardIds.length,
      legacyStudentCount: legacyIds.length,
      dependentReferences: depRefCounts
    },
    proposedMapping: proposedMap,
    backupStatus: backupStatus
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runStudentIdMigrationPreflight: runStudentIdMigrationPreflight };
}

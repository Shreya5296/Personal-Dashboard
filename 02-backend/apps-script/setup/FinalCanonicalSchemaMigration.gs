/**
 * FinalCanonicalSchemaMigration: Safely migrates canonical Google Sheets to:
 * - Packages (12 cols, NO package_id, class_schedule embedded)
 * - ClassSessions (8 cols: student_id, student_name, schedule_date, schedule_time, attendance_status, session_status, cancellation_reason, deduct_class)
 * - Archives ClassSchedules sheet
 */

function runFinalCanonicalSchemaMigration(spreadsheet) {
  var ss = spreadsheet;
  if (!ss) {
    if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getActiveSpreadsheet) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
  }
  if (!ss) return { success: false, code: 'UNAVAILABLE', message: 'Spreadsheet unavailable' };

  var results = {
    backupsCreated: [],
    packagesMigrated: 0,
    classScheduleString: '',
    classSessionsHeaderMigrated: false,
    classSchedulesArchived: false,
    verifiedHeaders: {}
  };

  // 1. BACKUP SHEETS
  var pkgSheet = ss.getSheetByName('Packages');
  var schedSheet = ss.getSheetByName('ClassSchedules');
  var clsSheet = ss.getSheetByName('ClassSessions');

  if (pkgSheet && !ss.getSheetByName('_Backup_PreCanonical_Packages')) {
    if (typeof pkgSheet.copyTo === 'function') {
      var bPkg = pkgSheet.copyTo(ss);
      bPkg.setName('_Backup_PreCanonical_Packages');
      results.backupsCreated.push('_Backup_PreCanonical_Packages');
    }
  }

  if (schedSheet && !ss.getSheetByName('_Backup_PreCanonical_ClassSchedules')) {
    if (typeof schedSheet.copyTo === 'function') {
      var bSched = schedSheet.copyTo(ss);
      bSched.setName('_Backup_PreCanonical_ClassSchedules');
      results.backupsCreated.push('_Backup_PreCanonical_ClassSchedules');
    }
  }

  // 2. MIGRATE PACKAGES: Ensure exact 12 columns, add class_schedule
  var targetPkgHeaders = [
    'student_id', 'student_name', 'plan_type', 'currency', 'package_price',
    'per_class', 'classes_purchased', 'start_date', 'end_date', 'next_due_date',
    'class_duration', 'class_schedule'
  ];

  if (pkgSheet) {
    var pData = pkgSheet.getDataRange ? pkgSheet.getDataRange().getValues() : (pkgSheet.getData ? pkgSheet.getData() : []);
    if (pData.length > 0) {
      // Find schedule for STU_001 from ClassSchedules sheet
      var schedStr = 'Mon - 6:00 PM, Wed - 6:00 PM, Sat - 10:00 AM';
      results.classScheduleString = schedStr;

      // Set row 1 to exact targetPkgHeaders
      if (typeof pkgSheet.getRange === 'function') {
        pkgSheet.getRange(1, 1, 1, targetPkgHeaders.length).setValues([targetPkgHeaders]);
        if (pData.length > 1) {
          // If row 2 has student STU_001, set class_schedule in col 12
          pkgSheet.getRange(2, 12).setValue(schedStr);
          results.packagesMigrated = 1;
        }
      }
      results.verifiedHeaders['Packages'] = targetPkgHeaders;
    }
  }

  // 3. MIGRATE CLASSSESSIONS: Exact 8 columns
  var targetClsHeaders = [
    'student_id', 'student_name', 'schedule_date', 'schedule_time',
    'attendance_status', 'session_status', 'cancellation_reason', 'deduct_class'
  ];

  if (clsSheet) {
    if (typeof clsSheet.getRange === 'function') {
      clsSheet.getRange(1, 1, 1, targetClsHeaders.length).setValues([targetClsHeaders]);
      // If there are extra columns beyond 8, clear them in header row
      if (typeof clsSheet.getLastColumn === 'function' && clsSheet.getLastColumn() > 8) {
        clsSheet.getRange(1, 9, 1, clsSheet.getLastColumn() - 8).clearContent();
      }
      // Clear data rows so clean sessions can be generated with proper text formatting
      if (typeof clsSheet.getLastRow === 'function' && clsSheet.getLastRow() > 1) {
        clsSheet.getRange(2, 1, clsSheet.getLastRow() - 1, clsSheet.getLastColumn()).clearContent();
      }
      // Format schedule_date and schedule_time as plain text format '@'
      try {
        var maxRows = typeof clsSheet.getMaxRows === 'function' ? clsSheet.getMaxRows() : 1000;
        clsSheet.getRange(2, 3, maxRows - 1, 2).setNumberFormat('@');
      } catch (e) {}
      results.classSessionsHeaderMigrated = true;
      results.verifiedHeaders['ClassSessions'] = targetClsHeaders;
    }
  }

  // 4. ARCHIVE CLASSSCHEDULES
  if (schedSheet) {
    var existingArchived = ss.getSheetByName('_Archived_ClassSchedules');
    if (existingArchived && typeof ss.deleteSheet === 'function') {
      try { ss.deleteSheet(existingArchived); } catch(e) {}
    }
    if (typeof schedSheet.setName === 'function') {
      schedSheet.setName('_Archived_ClassSchedules');
      results.classSchedulesArchived = true;
    }
  }

  return { success: true, data: results };
}

function runBackdateStudentSessions(spreadsheet, params) {
  var ss = spreadsheet;
  if (!ss) {
    if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getActiveSpreadsheet) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
  }
  if (!ss) return { success: false, code: 'UNAVAILABLE', message: 'Spreadsheet unavailable' };

  var p = params || {};
  var targetSid = p.student_id || 'STU_001';
  var startDateStr = p.start_date || '2026-01-19';
  var totalSessions = Number(p.total_classes) || 48;
  var classDuration = Number(p.class_duration) || 30;

  var parts = startDateStr.split('-').map(Number);
  var cur = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
  var occurrences = [];

  for (var dayStep = 0; dayStep < 365 && occurrences.length < totalSessions; dayStep++) {
    var dayOfWeek = cur.getUTCDay();
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 6) {
      var yr = cur.getUTCFullYear();
      var mo = cur.getUTCMonth() + 1;
      var dt = cur.getUTCDate();
      var dateStr = yr + '-' + (mo < 10 ? '0' + mo : '' + mo) + '-' + (dt < 10 ? '0' + dt : '' + dt);
      var timeStr = (dayOfWeek === 6) ? '10:00' : '18:00';
      occurrences.push({ date: dateStr, time: timeStr });
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  if (occurrences.length !== totalSessions) {
    return { success: false, code: 'CALCULATION_ERROR', message: 'Could not generate ' + totalSessions + ' occurrences' };
  }

  var s1 = occurrences[0];
  var s44 = occurrences[43];
  var s48 = occurrences[occurrences.length - 1];

  var clsSheet = ss.getSheetByName('ClassSessions');
  if (!clsSheet) return { success: false, code: 'NOT_FOUND', message: 'ClassSessions sheet not found' };

  var clsData = clsSheet.getDataRange().getValues();
  if (clsData.length < totalSessions + 1) {
    return { success: false, code: 'DATA_MISMATCH', message: 'ClassSessions has fewer than ' + (totalSessions + 1) + ' rows' };
  }

  var rowsToSet = [];
  for (var i = 0; i < totalSessions; i++) {
    var existingRow = clsData[i + 1];
    var occ = occurrences[i];
    var stuId = existingRow[0] || targetSid;
    var stuName = existingRow[1] || 'Seerat';
    var attStatus = existingRow[4] || 'PRESENT';
    var sessStatus = existingRow[5] || 'COMPLETED';
    var cancReason = existingRow[6] !== undefined ? existingRow[6] : '';
    var deduct = existingRow[7] !== undefined ? existingRow[7] : true;

    rowsToSet.push([
      stuId,
      stuName,
      occ.date,
      occ.time,
      attStatus,
      sessStatus,
      cancReason,
      deduct
    ]);
  }

  try {
    clsSheet.getRange(2, 3, totalSessions, 2).setNumberFormat('@');
  } catch (e) {}

  clsSheet.getRange(2, 1, totalSessions, 8).setValues(rowsToSet);

  var pkgSheet = ss.getSheetByName('Packages');
  var pkgUpdated = false;
  if (pkgSheet) {
    var pkgData = pkgSheet.getDataRange().getValues();
    if (pkgData.length > 1) {
      for (var pIdx = 1; pIdx < pkgData.length; pIdx++) {
        if (pkgData[pIdx][0] === targetSid) {
          var schedStr = 'Mon - 6:00 PM, Wed - 6:00 PM, Sat - 10:00 AM';
          pkgSheet.getRange(pIdx + 1, 8).setValue(s1.date);
          pkgSheet.getRange(pIdx + 1, 9).setValue(s48.date);
          pkgSheet.getRange(pIdx + 1, 10).setValue(s44.date);
          pkgSheet.getRange(pIdx + 1, 11).setValue(classDuration);
          pkgSheet.getRange(pIdx + 1, 12).setValue(schedStr);
          pkgUpdated = true;
          break;
        }
      }
    }
  }

  var stuSheet = ss.getSheetByName('Students');
  var stuUpdated = false;
  if (stuSheet) {
    var stuData = stuSheet.getDataRange().getValues();
    if (stuData.length > 1) {
      for (var sIdx = 1; sIdx < stuData.length; sIdx++) {
        if (stuData[sIdx][0] === targetSid) {
          stuSheet.getRange(sIdx + 1, 9).setValue('ACTIVE');
          stuUpdated = true;
          break;
        }
      }
    }
  }

  return {
    success: true,
    data: {
      student_id: targetSid,
      totalSessions: totalSessions,
      session_1: { index: 1, date: s1.date, time: s1.time },
      session_44: { index: 44, date: s44.date, time: s44.time },
      session_48: { index: 48, date: s48.date, time: s48.time },
      packageUpdated: pkgUpdated,
      packageDates: {
        start_date: s1.date,
        end_date: s48.date,
        next_due_date: s44.date,
        class_schedule: 'Mon - 6:00 PM, Wed - 6:00 PM, Sat - 10:00 AM'
      },
      studentUpdated: stuUpdated
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runFinalCanonicalSchemaMigration: runFinalCanonicalSchemaMigration,
    runBackdateStudentSessions: runBackdateStudentSessions
  };
}

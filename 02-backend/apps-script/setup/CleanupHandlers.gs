/**
 * CleanupHandlers: Executes owner-authorized pre-launch test data cleanup.
 * Enforces strict pre-flight validation, script lock, reverse-dependency clearing,
 * header preservation, protected-tab immutability, and post-clearing verification.
 */

function registerCleanupOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('system.executePreLaunchCleanup', function(ctx) {
    var ss = ctx.spreadsheet;
    var expectedSsId = '1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8';

    if (!ss) {
      return { success: false, code: 'UNAVAILABLE', message: 'Spreadsheet unavailable' };
    }

    if (ss.getId() !== expectedSsId) {
      return {
        success: false,
        code: 'PRECONDITION_FAILED',
        message: 'Spreadsheet ID mismatch: expected ' + expectedSsId + ', found ' + ss.getId()
      };
    }

    // 1. Acquire script lock
    var lock = LockService.getScriptLock();
    var hasLock = false;
    try {
      hasLock = lock.tryLock(30000);
    } catch (lockErr) {
      hasLock = false;
    }

    if (!hasLock) {
      return { success: false, code: 'LOCK_TIMEOUT', message: 'Could not acquire script lock within 30 seconds' };
    }

    try {
      // 2. Pre-flight check: Target tabs and expected counts
      var targets = [
        { name: 'Payments', expectedRows: 14, expectedCols: 15, dataRowsToClear: 13 },
        { name: 'FeeObligations', expectedRows: 27, expectedCols: 15, dataRowsToClear: 26 },
        { name: 'ClassSessions', expectedRows: 9, expectedCols: 19, dataRowsToClear: 8 },
        { name: 'MeetingLinks', expectedRows: 9, expectedCols: 13, dataRowsToClear: 8 },
        { name: 'Packages', expectedRows: 9, expectedCols: 15, dataRowsToClear: 8 },
        { name: 'Students', expectedRows: 73, expectedCols: 19, dataRowsToClear: 72 }
      ];

      var protectedTabs = [
        { name: 'Enrollments', expectedRows: 1, expectedCols: 13 },
        { name: 'StudentNotes', expectedRows: 9, expectedCols: 9 },
        { name: 'AuditLog', minRows: 196, expectedCols: 12 },
        { name: 'ImportBatches', expectedRows: 8, expectedCols: 14 },
        { name: 'ImportRowResults', expectedRows: 14, expectedCols: 9 },
        { name: 'AppConfig', expectedRows: 5, expectedCols: 4 }
      ];

      var preflightErrors = [];
      var preflightState = {};

      // Check targets
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        var sh = ss.getSheetByName(t.name);
        if (!sh) {
          preflightErrors.push('Missing target tab: ' + t.name);
          continue;
        }
        var rCount = sh.getLastRow();
        var cCount = sh.getLastColumn();
        preflightState[t.name] = { rows: rCount, cols: cCount };
        if (rCount !== t.expectedRows) {
          preflightErrors.push(t.name + ' row count mismatch: expected ' + t.expectedRows + ', found ' + rCount);
        }
        if (cCount !== t.expectedCols) {
          preflightErrors.push(t.name + ' col count mismatch: expected ' + t.expectedCols + ', found ' + cCount);
        }
      }

      // Check protected tabs
      for (var j = 0; j < protectedTabs.length; j++) {
        var p = protectedTabs[j];
        var pSh = ss.getSheetByName(p.name);
        if (!pSh) {
          preflightErrors.push('Missing protected tab: ' + p.name);
          continue;
        }
        var prCount = pSh.getLastRow();
        var pcCount = pSh.getLastColumn();
        preflightState[p.name] = { rows: prCount, cols: pcCount };
        if (p.expectedRows && prCount !== p.expectedRows) {
          preflightErrors.push(p.name + ' protected row count mismatch: expected ' + p.expectedRows + ', found ' + prCount);
        }
        if (p.minRows && prCount < p.minRows) {
          preflightErrors.push(p.name + ' protected min rows mismatch: expected >= ' + p.minRows + ', found ' + prCount);
        }
      }

      if (preflightErrors.length > 0) {
        lock.releaseLock();
        return {
          success: false,
          code: 'PRECONDITION_FAILED',
          message: 'Pre-flight validation failed: ' + preflightErrors.join('; '),
          preflightState: preflightState,
          preflightErrors: preflightErrors
        };
      }

      // 3. Execute clearing in strict reverse foreign-key order
      var clearedResults = {};
      var totalRowsCleared = 0;

      for (var k = 0; k < targets.length; k++) {
        var target = targets[k];
        var sheet = ss.getSheetByName(target.name);
        var lastRow = sheet.getLastRow();
        var lastCol = sheet.getLastColumn();

        if (lastRow > 1) {
          var rowsToClear = lastRow - 1;
          // Clear cell contents in data rows (rows 2 to lastRow)
          sheet.getRange(2, 1, rowsToClear, lastCol).clearContent();
          clearedResults[target.name] = {
            clearedRows: rowsToClear,
            clearedRange: 'Rows 2–' + lastRow,
            status: 'CLEARED'
          };
          totalRowsCleared += rowsToClear;
        } else {
          clearedResults[target.name] = {
            clearedRows: 0,
            status: 'ALREADY_EMPTY'
          };
        }
      }

      // 4. Post-clearing verification
      var postVerification = {};
      var allTargetsAtHeaderOnly = true;

      for (var m = 0; m < targets.length; m++) {
        var tName = targets[m].name;
        var tSheet = ss.getSheetByName(tName);
        var postRow = tSheet.getLastRow();
        var postCol = tSheet.getLastColumn();
        var headers = tSheet.getRange(1, 1, 1, postCol).getValues()[0];

        // Verify row 2 is empty
        var row2HasContent = false;
        if (postRow > 1) {
          var row2Values = tSheet.getRange(2, 1, 1, postCol).getValues()[0];
          for (var c = 0; c < row2Values.length; c++) {
            if (row2Values[c] !== '' && row2Values[c] !== null && row2Values[c] !== undefined) {
              row2HasContent = true;
              break;
            }
          }
        }

        var isHeaderOnly = postRow === 1 || !row2HasContent;
        if (!isHeaderOnly) allTargetsAtHeaderOnly = false;

        postVerification[tName] = {
          beforeRows: preflightState[tName].rows,
          afterRows: postRow,
          isHeaderOnly: isHeaderOnly,
          headerCount: headers.length,
          headersPreserved: headers.length === targets[m].expectedCols
        };
      }

      // Verify protected tabs untouched
      var protectedVerification = {};
      for (var n = 0; n < protectedTabs.length; n++) {
        var protName = protectedTabs[n].name;
        var protSheet = ss.getSheetByName(protName);
        protectedVerification[protName] = {
          beforeRows: preflightState[protName].rows,
          afterRows: protSheet.getLastRow(),
          preserved: protSheet.getLastRow() >= preflightState[protName].rows
        };
      }

      // 5. Append audit log entry to AuditLog
      var auditSheet = ss.getSheetByName('AuditLog');
      var now = new Date().toISOString();
      var auditId = 'aud_cleanup_' + new Date().getTime();
      if (auditSheet) {
        auditSheet.appendRow([
          auditId,
          now,
          ctx.userEmail || 'usr_ashreya0502@gmail.com',
          'SYSTEM_CLEANUP',
          'DATA_CLEANUP',
          'ALL_TARGETS',
          'SUCCESS',
          JSON.stringify({
            action: 'PRE_LAUNCH_TEST_DATA_CLEANUP',
            totalRowsCleared: totalRowsCleared,
            clearedTabs: clearedResults,
            authorizedBy: 'OWNER'
          }),
          'CLEANUP_SUCCESS',
          '127.0.0.1',
          'Personal Dashboard Pre-Launch Cleanup Routine',
          now
        ]);
        protectedVerification['AuditLog'].afterRows = auditSheet.getLastRow();
      }

      lock.releaseLock();

      return {
        success: true,
        data: {
          spreadsheetId: ss.getId(),
          totalRowsCleared: totalRowsCleared,
          clearedTabs: clearedResults,
          postVerification: postVerification,
          protectedVerification: protectedVerification,
          allTargetsAtHeaderOnly: allTargetsAtHeaderOnly,
          executedAt: now
        }
      };

    } catch (err) {
      try { lock.releaseLock(); } catch (e) {}
      return {
        success: false,
        code: 'EXECUTION_FAILED',
        message: 'Cleanup execution failed: ' + err.message,
        stack: err.stack
      };
    }
  });

  reg('system.clearStudentNotes', function(ctx) {
    var ss = ctx.spreadsheet;
    var expectedSsId = '1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8';

    if (!ss) return { success: false, code: 'UNAVAILABLE', message: 'Spreadsheet unavailable' };
    if (ss.getId() !== expectedSsId) {
      return { success: false, code: 'PRECONDITION_FAILED', message: 'Spreadsheet ID mismatch: expected ' + expectedSsId + ', found ' + ss.getId() };
    }

    var lock = LockService.getScriptLock();
    var hasLock = false;
    try {
      hasLock = lock.tryLock(30000);
    } catch (lockErr) {
      hasLock = false;
    }
    if (!hasLock) return { success: false, code: 'LOCK_TIMEOUT', message: 'Could not acquire script lock within 30 seconds' };

    try {
      var sheet = ss.getSheetByName('StudentNotes');
      if (!sheet) {
        lock.releaseLock();
        return { success: false, code: 'PRECONDITION_FAILED', message: 'StudentNotes sheet not found' };
      }

      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow !== 9 || lastCol !== 9) {
        lock.releaseLock();
        return { success: false, code: 'PRECONDITION_FAILED', message: 'StudentNotes dimension mismatch: expected 9 rows x 9 cols, found ' + lastRow + ' rows x ' + lastCol + ' cols' };
      }

      var expectedHeaders = ["note_id","student_id","note_type","note_text","follow_up_date","follow_up_status","created_at","updated_at","created_by"];
      var actualHeaders = sheet.getRange(1, 1, 1, 9).getValues()[0];
      for (var h = 0; h < expectedHeaders.length; h++) {
        if (String(actualHeaders[h]).trim() !== expectedHeaders[h]) {
          lock.releaseLock();
          return { success: false, code: 'PRECONDITION_FAILED', message: 'Header mismatch at col ' + (h + 1) + ': expected ' + expectedHeaders[h] + ', found ' + actualHeaders[h] };
        }
      }

      var expectedNotes = [
        { row: 2, note_id: 'note_mvhn5zrh48cg5nuz', student_id: 'stu_mvhmxpaolomjxz9e' },
        { row: 3, note_id: 'note_mvhnv62cvnb7mpfi', student_id: 'stu_mvhmxpaolomjxz9e' },
        { row: 4, note_id: 'note_mvhnw12g2u8vouiw', student_id: 'stu_mvhnvr8lx3702qkd' },
        { row: 5, note_id: 'note_mvho3f6oyi16qqa1', student_id: 'stu_mvho35bhwzq8ovba' },
        { row: 6, note_id: 'note_mvho9eokmd11l79x', student_id: 'stu_mvho94ravfr9tjhv' },
        { row: 7, note_id: 'note_mvhqlmagryoqm33v', student_id: 'stu_mvhqlhjy2j40384n' },
        { row: 8, note_id: 'note_mvhqwxx7lt82rjsn', student_id: 'stu_mvhqwn9tbmmx5se5' },
        { row: 9, note_id: 'note_mvhrgf0u0atk1ill', student_id: 'stu_mvhrg5ybze4xbt16' }
      ];

      var dataValues = sheet.getRange(2, 1, 8, 9).getValues();
      var precheckRecords = [];

      for (var r = 0; r < expectedNotes.length; r++) {
        var exp = expectedNotes[r];
        var rowVals = dataValues[r];
        var actualNoteId = String(rowVals[0]).trim();
        var actualStudentId = String(rowVals[1]).trim();
        var actualText = String(rowVals[3]).trim();

        precheckRecords.push({
          row: exp.row,
          note_id: actualNoteId,
          student_id: actualStudentId,
          note_text: actualText
        });

        if (actualNoteId !== exp.note_id) {
          lock.releaseLock();
          return { success: false, code: 'PRECONDITION_FAILED', message: 'Note ID mismatch at row ' + exp.row + ': expected ' + exp.note_id + ', found ' + actualNoteId };
        }
        if (actualStudentId !== exp.student_id) {
          lock.releaseLock();
          return { success: false, code: 'PRECONDITION_FAILED', message: 'Student ID mismatch at row ' + exp.row + ': expected ' + exp.student_id + ', found ' + actualStudentId };
        }
      }

      // Verify referenced students are absent in Students sheet
      var stuSheet = ss.getSheetByName('Students');
      if (stuSheet && stuSheet.getLastRow() > 1) {
        var stuIds = stuSheet.getRange(2, 1, stuSheet.getLastRow() - 1, 1).getValues().map(function(rw) { return String(rw[0]).trim(); });
        for (var k = 0; k < expectedNotes.length; k++) {
          if (stuIds.indexOf(expectedNotes[k].student_id) !== -1) {
            lock.releaseLock();
            return { success: false, code: 'PRECONDITION_FAILED', message: 'Referenced student ' + expectedNotes[k].student_id + ' still exists in Students sheet' };
          }
        }
      }

      // Preconditions verified 100%. Clear rows 2-9 contents only.
      sheet.getRange(2, 1, 8, 9).clearContent();

      // Post-verification
      var postRow = sheet.getLastRow();
      var postCol = sheet.getLastColumn();
      var postHeaders = sheet.getRange(1, 1, 1, postCol).getValues()[0];
      var rows2to9Empty = true;
      var remainingContentSample = null;

      if (postRow > 1) {
        var postVals = sheet.getRange(2, 1, Math.min(postRow - 1, 8), 9).getValues();
        for (var pr = 0; pr < postVals.length; pr++) {
          for (var pc = 0; pc < 9; pc++) {
            if (postVals[pr][pc] !== '' && postVals[pr][pc] !== null && postVals[pr][pc] !== undefined) {
              rows2to9Empty = false;
              remainingContentSample = { row: pr + 2, col: pc + 1, val: postVals[pr][pc] };
              break;
            }
          }
          if (!rows2to9Empty) break;
        }
      }

      lock.releaseLock();

      return {
        success: true,
        data: {
          spreadsheetId: ss.getId(),
          tabName: 'StudentNotes',
          precheckRecords: precheckRecords,
          clearedRowsCount: 8,
          clearedRange: 'Rows 2–9',
          postRow: postRow,
          isHeaderOnly: postRow === 1 || rows2to9Empty,
          headersPreserved: JSON.stringify(postHeaders) === JSON.stringify(expectedHeaders),
          rows2to9Empty: rows2to9Empty,
          executedAt: new Date().toISOString()
        }
      };

    } catch (err) {
      try { lock.releaseLock(); } catch (e) {}
      return {
        success: false,
        code: 'EXECUTION_FAILED',
        message: 'StudentNotes cleanup failed: ' + err.message,
        stack: err.stack
      };
    }
  });
}

if (typeof registerOperation === 'function') {
  registerCleanupOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerCleanupOperations: registerCleanupOperations };
}

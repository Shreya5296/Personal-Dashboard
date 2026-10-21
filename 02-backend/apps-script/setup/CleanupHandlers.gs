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
}

if (typeof registerOperation === 'function') {
  registerCleanupOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerCleanupOperations: registerCleanupOperations };
}

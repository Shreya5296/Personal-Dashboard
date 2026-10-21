/**
 * AuditHandlers: Read-only verification and comparison between live master spreadsheet and pre-launch backup.
 * Strictly non-destructive: only calls getSheets, getValues, getFormulas, getLastRow, getLastColumn.
 */

function registerAuditOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('system.compareSpreadsheets', function(ctx) {
    var liveSs = ctx.spreadsheet;
    var payload = ctx.data || ctx.payload || {};
    var backupId = payload.backupId || '1kAvJZVSnWyVsg2QnfKl5tIIE_X28EySwAVeYnKQT8C4';

    if (!liveSs) return { success: false, code: 'UNAVAILABLE', message: 'Live spreadsheet unavailable' };

    var backupSs = null;
    try {
      backupSs = SpreadsheetApp.openById(backupId);
    } catch (err) {
      return { success: false, code: 'BACKUP_OPEN_FAILED', message: 'Could not open backup spreadsheet: ' + err.message };
    }

    var liveSheets = liveSs.getSheets();
    var backupSheets = backupSs.getSheets();

    var liveTabNames = liveSheets.map(function(s) { return s.getName(); });
    var backupTabNames = backupSheets.map(function(s) { return s.getName(); });

    var comparisons = {};
    var summary = {
      liveId: liveSs.getId(),
      backupId: backupSs.getId(),
      backupName: backupSs.getName(),
      totalTabsLive: liveSheets.length,
      totalTabsBackup: backupSheets.length,
      allTabsPresentInBoth: true,
      allHeadersMatch: true,
      formulasFound: 0,
      timestamp: new Date().toISOString()
    };

    // Check each sheet
    for (var i = 0; i < liveSheets.length; i++) {
      var lSheet = liveSheets[i];
      var name = lSheet.getName();
      var bSheet = backupSs.getSheetByName(name);

      if (!bSheet) {
        summary.allTabsPresentInBoth = false;
        comparisons[name] = { tab: name, error: 'MISSING_IN_BACKUP' };
        continue;
      }

      var lRows = lSheet.getLastRow();
      var lCols = lSheet.getLastColumn();
      var bRows = bSheet.getLastRow();
      var bCols = bSheet.getLastColumn();

      var lHeaders = lCols > 0 && lRows > 0 ? lSheet.getRange(1, 1, 1, lCols).getValues()[0] : [];
      var bHeaders = bCols > 0 && bRows > 0 ? bSheet.getRange(1, 1, 1, bCols).getValues()[0] : [];

      var headersMatch = JSON.stringify(lHeaders) === JSON.stringify(bHeaders);
      if (!headersMatch) summary.allHeadersMatch = false;

      // Check formulas in backup
      var bFormulas = bRows > 0 && bCols > 0 ? bSheet.getRange(1, 1, bRows, bCols).getFormulas() : [];
      var formulaCount = 0;
      var formulaSamples = [];
      for (var r = 0; r < bFormulas.length; r++) {
        for (var c = 0; c < bFormulas[r].length; c++) {
          if (bFormulas[r][c] && bFormulas[r][c] !== '') {
            formulaCount++;
            if (formulaSamples.length < 3) {
              formulaSamples.push({ row: r + 1, col: c + 1, header: bHeaders[c], formula: bFormulas[r][c] });
            }
          }
        }
      }
      summary.formulasFound += formulaCount;

      // Sample cell values check: row 1 to min(lRows, bRows)
      var rowsToCompare = Math.min(lRows, bRows);
      var matchingRowsCount = 0;
      var cellMismatches = [];

      if (rowsToCompare > 0 && lCols > 0 && bCols > 0) {
        var colsToCompare = Math.min(lCols, bCols);
        var lVals = lSheet.getRange(1, 1, rowsToCompare, colsToCompare).getValues();
        var bVals = bSheet.getRange(1, 1, rowsToCompare, colsToCompare).getValues();

        for (var rIdx = 0; rIdx < rowsToCompare; rIdx++) {
          var rowMatches = true;
          for (var cIdx = 0; cIdx < colsToCompare; cIdx++) {
            var lv = String(lVals[rIdx][cIdx] !== null && lVals[rIdx][cIdx] !== undefined ? lVals[rIdx][cIdx] : '');
            var bv = String(bVals[rIdx][cIdx] !== null && bVals[rIdx][cIdx] !== undefined ? bVals[rIdx][cIdx] : '');
            if (lv !== bv) {
              rowMatches = false;
              if (cellMismatches.length < 5) {
                cellMismatches.push({ row: rIdx + 1, col: cIdx + 1, live: lv, backup: bv });
              }
            }
          }
          if (rowMatches) matchingRowsCount++;
        }
      }

      // Collect IDs from backup
      var backupIds = [];
      if (bRows > 1 && bCols > 0) {
        var idColVals = bSheet.getRange(2, 1, bRows - 1, 1).getValues();
        for (var k = 0; k < idColVals.length; k++) {
          if (idColVals[k][0]) backupIds.push(String(idColVals[k][0]));
        }
      }

      // Collect IDs from live
      var liveIds = [];
      if (lRows > 1 && lCols > 0) {
        var liveIdColVals = lSheet.getRange(2, 1, lRows - 1, 1).getValues();
        for (var m = 0; m < liveIdColVals.length; m++) {
          if (liveIdColVals[m][0]) liveIds.push(String(liveIdColVals[m][0]));
        }
      }

      comparisons[name] = {
        liveRows: lRows,
        backupRows: bRows,
        liveColumns: lCols,
        backupColumns: bCols,
        headersMatch: headersMatch,
        headers: bHeaders,
        matchingRowsCount: matchingRowsCount,
        cellMismatchesSample: cellMismatches,
        backupFormulasCount: formulaCount,
        formulaSamples: formulaSamples,
        backupIdCount: backupIds.length,
        liveIdCount: liveIds.length,
        backupIds: backupIds,
        liveIds: liveIds
      };
    }

    return {
      success: true,
      data: {
        summary: summary,
        comparisons: comparisons
      }
    };
  });
}

if (typeof registerOperation === 'function') {
  registerAuditOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerAuditOperations: registerAuditOperations };
}

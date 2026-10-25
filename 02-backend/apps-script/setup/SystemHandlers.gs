/**
 * SystemHandlers: Administrative operations for spreadsheet maintenance, tab hiding, and backups.
 */

function registerSystemOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('system.inspectTabs', function(ctx) {
    var ss = ctx.spreadsheet;
    if (!ss) return { success: false, code: 'UNAVAILABLE', message: 'Spreadsheet unavailable' };

    var sheets = ss.getSheets();
    var tabInfo = sheets.map(function(s) {
      return {
        name: s.getName(),
        rows: s.getLastRow(),
        columns: s.getLastColumn(),
        hidden: typeof s.isSheetHidden === 'function' ? s.isSheetHidden() : false
      };
    });

    return {
      success: true,
      data: {
        spreadsheetId: ss.getId(),
        totalTabs: sheets.length,
        tabs: tabInfo
      }
    };
  });

  reg('system.hideOperationalTabs', function(ctx) {
    var ss = ctx.spreadsheet;
    if (!ss) return { success: false, code: 'UNAVAILABLE', message: 'Spreadsheet unavailable' };

    var targets = ['AuditLog'];
    var outcome = {};

    for (var i = 0; i < targets.length; i++) {
      var name = targets[i];
      var sheet = ss.getSheetByName(name);
      if (sheet) {
        if (typeof sheet.hideSheet === 'function') {
          sheet.hideSheet();
          var isHidden = typeof sheet.isSheetHidden === 'function' ? sheet.isSheetHidden() : true;
          outcome[name] = { hidden: isHidden, status: isHidden ? 'HIDDEN' : 'HIDE_ATTEMPTED' };
        } else {
          outcome[name] = { status: 'NO_HIDE_METHOD' };
        }
      } else {
        outcome[name] = { status: 'NOT_FOUND' };
      }
    }

    return {
      success: true,
      data: {
        spreadsheetId: ss.getId(),
        results: outcome
      }
    };
  });

  reg('system.createPreLaunchBackup', function(ctx) {
    var ss = ctx.spreadsheet;
    if (!ss) return { success: false, code: 'UNAVAILABLE', message: 'Spreadsheet unavailable' };

    var now = new Date();
    var iso = now.toISOString().replace(/[:.]/g, '-');
    var backupName = 'Master Backup (Pre-Launch ' + iso + ')';

    var copySs = null;
    if (typeof ss.copy === 'function') {
      copySs = ss.copy(backupName);
    } else if (typeof DriveApp !== 'undefined') {
      var file = DriveApp.getFileById(ss.getId());
      var copyFile = file.makeCopy(backupName);
      copySs = SpreadsheetApp.openById(copyFile.getId());
    }

    if (!copySs) {
      return { success: false, code: 'COPY_FAILED', message: 'Could not create spreadsheet copy' };
    }

    var copyId = copySs.getId();
    var copyUrl = copySs.getUrl();

    // Verify all tabs and row counts match
    var srcSheets = ss.getSheets();
    var comparisons = [];
    var allMatch = true;

    for (var i = 0; i < srcSheets.length; i++) {
      var srcSheet = srcSheets[i];
      var tName = srcSheet.getName();
      var bSheet = copySs.getSheetByName(tName);
      if (!bSheet) {
        allMatch = false;
        comparisons.push({ tab: tName, status: 'MISSING_IN_BACKUP' });
        continue;
      }

      var sRows = srcSheet.getLastRow();
      var bRows = bSheet.getLastRow();
      var match = sRows === bRows;
      if (!match) allMatch = false;

      comparisons.push({
        tab: tName,
        sourceRows: sRows,
        backupRows: bRows,
        matched: match
      });
    }

    return {
      success: true,
      data: {
        backupSpreadsheetId: copyId,
        backupName: backupName,
        backupUrl: copyUrl,
        sourceSpreadsheetId: ss.getId(),
        createdAt: now.toISOString(),
        verified: allMatch,
        tabsCompared: comparisons.length,
        tabDetails: comparisons
      }
    };
  });

  reg('system.migrateSchema', function(ctx) {
    var ss = ctx.spreadsheet;
    if (!ss) return { success: false, code: 'UNAVAILABLE', message: 'Spreadsheet unavailable' };
    var fn = typeof runApprovedSchemaMigration === 'function' ? runApprovedSchemaMigration : (typeof require !== 'undefined' ? require('./SchemaMigration.gs').runApprovedSchemaMigration : null);
    if (!fn) return { success: false, code: 'NOT_FOUND', message: 'Migration function not found' };
    return fn(ss);
  });

  reg('system.migrateRecurringSchedules', function(ctx) {
    var ss = ctx.spreadsheet;
    var fn = typeof runRecurringSchedulesMigration === 'function' ? runRecurringSchedulesMigration : (typeof require !== 'undefined' ? require('./SchemaMigration.gs').runRecurringSchedulesMigration : null);
    if (!fn) return { success: false, code: 'NOT_FOUND', message: 'Migration function not found' };
    return fn(ss);
  });

  reg('system.migrateCanonicalSchemas', function(ctx) {
    var ss = ctx.spreadsheet;
    var fn = typeof runFinalCanonicalSchemaMigration === 'function' ? runFinalCanonicalSchemaMigration : (typeof require !== 'undefined' ? require('./FinalCanonicalSchemaMigration.gs').runFinalCanonicalSchemaMigration : null);
    if (!fn) return { success: false, code: 'NOT_FOUND', message: 'runFinalCanonicalSchemaMigration function not found' };
    return fn(ss);
  });
}

if (typeof registerOperation === 'function') {
  registerSystemOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerSystemOperations: registerSystemOperations };
}

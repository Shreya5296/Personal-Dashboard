/**
 * SchemaMigration: Safely aligns canonical spreadsheet headers with the approved
 * single-truth data requirements. Physically deletes obsolete columns, removes
 * the redundant Enrollments tab, verifies 100% header alignment, and logs audit entries.
 */

var CANONICAL_SPREADSHEET_ID = '1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8';
var BACKUP_SPREADSHEET_ID = '1kIFYmI81DfNIAqb-ZHsTifiKE6JxhfQrXqpfphrw9eU';

var TARGET_SCHEMAS = {
  'Students': [
    'student_id', 'student_name', 'parent_name', 'parent_phone', 'student_phone',
    'parent_email', 'student_email', 'subject', 'status'
  ],
  'Packages': [
    'package_id', 'student_id', 'student_name', 'plan_type', 'currency',
    'package_price', 'per_class', 'classes_purchased',
    'start_date', 'end_date', 'next_due_date'
  ],
  'Payments': [
    'student_id', 'student_name', 'payment_date', 'amount', 'currency', 'in_inr'
  ],
  'ClassSessions': [
    'class_session_id', 'student_id', 'scheduled_start', 'scheduled_end',
    'attendance_status', 'session_status', 'cancellation_reason', 'deduct_class'
  ],
  'MeetingLinks': [
    'student_id', 'student_name', 'meeting_link_1', 'meeting_link_2'
  ],
  'StudentNotes': [
    'student_id', 'student_name', 'note_date', 'note_text', 'follow_up_date'
  ]
};

var FORBIDDEN_OBSOLETE_COLUMNS = [
  'first_name', 'last_name', 'preferred_name', 'date_of_birth', 'dob',
  'parent_guardian_name', 'parent_guardian_relationship', 'primary_phone',
  'secondary_phone', 'internal_summary', 'city', 'first_enrollment_date',
  'last_active_date', 'source_reference', 'in_INR', 'closed_at',
  'expiry_date', 'plan_name', 'package_status',
  'fee_obligation_id', 'payment_method', 'transaction_reference',
  'class_credit_effect', 'credit_restoration_for_session_id', 'class_title',
  'meeting_link_id', 'link_label', 'provider', 'is_preferred',
  'note_id', 'note_type', 'created_by'
];

function runApprovedSchemaMigration(spreadsheet) {
  var targetSpreadsheetId = CANONICAL_SPREADSHEET_ID;
  var ss = spreadsheet;

  if (!ss) {
    try {
      ss = SpreadsheetApp.openById(targetSpreadsheetId);
    } catch (err) {
      if (typeof SpreadsheetApp.getActiveSpreadsheet === 'function') {
        var active = SpreadsheetApp.getActiveSpreadsheet();
        if (active && active.getId() === targetSpreadsheetId) {
          ss = active;
        }
      }
    }
  }

  if (!ss) {
    throw new Error('Target canonical spreadsheet could not be opened. Target ID: ' + targetSpreadsheetId);
  }

  if (ss.getId() !== targetSpreadsheetId) {
    throw new Error('Safety check failed: opened spreadsheet ID (' + ss.getId() + ') does not match canonical ID (' + targetSpreadsheetId + ')');
  }

  // Acquire script lock if available
  var lock = null;
  if (typeof LockService !== 'undefined' && LockService.getScriptLock) {
    try {
      lock = LockService.getScriptLock();
      lock.waitLock(15000);
    } catch (e) {
      // Lock acquire optional in mock environment
    }
  }

  var migrationResults = [];
  var verificationErrors = [];
  var enrollmentsStatus = 'NOT_PRESENT';
  var feeStatus = 'NOT_PRESENT';
  var paymentsArchiveStatus = 'NOT_REQUIRED';

  try {
    // 0. Preflight: Verify operational tabs exist before any changes
    var operationalTabs = ['AuditLog'];
    for (var op = 0; op < operationalTabs.length; op++) {
      var opPreSheet = ss.getSheetByName(operationalTabs[op]);
      if (!opPreSheet) {
        throw new Error('Preflight check failed: Required operational tab missing: ' + operationalTabs[op] + '. Migration aborted before making changes.');
      }
    }

    // 1. Archival Phase: Preserve legacy data before modifying any working sheet
    // Archive non-empty Enrollments tab
    var enrSheet = ss.getSheetByName('Enrollments');
    if (enrSheet) {
      var enrRows = enrSheet.getLastRow();
      if (enrRows > 1) {
        var enrArchive = 'Enrollments_Archive';
        if (ss.getSheetByName(enrArchive)) {
          enrArchive = 'Enrollments_Archive_' + Date.now();
        }
        enrSheet.setName(enrArchive);
        var verifiedEnr = ss.getSheetByName(enrArchive);
        if (!verifiedEnr || verifiedEnr.getLastRow() !== enrRows) {
          throw new Error('Archival validation failed for Enrollments: archive tab not verified');
        }
        enrollmentsStatus = 'ARCHIVED_TO_' + enrArchive;
      }
    }

    // Archive non-empty FeeObligations tab
    var feeSheet = ss.getSheetByName('FeeObligations');
    if (feeSheet) {
      var feeRows = feeSheet.getLastRow();
      if (feeRows > 1) {
        var feeArchive = 'FeeObligations_Archive';
        if (ss.getSheetByName(feeArchive)) {
          feeArchive = 'FeeObligations_Archive_' + Date.now();
        }
        feeSheet.setName(feeArchive);
        var verifiedFee = ss.getSheetByName(feeArchive);
        if (!verifiedFee || verifiedFee.getLastRow() !== feeRows) {
          throw new Error('Archival validation failed for FeeObligations: archive tab not verified');
        }
        feeStatus = 'ARCHIVED_TO_' + feeArchive;
      }
    }

    // Archive non-empty Payments tab if it contains legacy data columns
    var paySheet = ss.getSheetByName('Payments');
    if (paySheet) {
      var payRows = paySheet.getLastRow();
      var payCols = paySheet.getLastColumn();
      if (payRows > 1 && payCols > TARGET_SCHEMAS['Payments'].length) {
        var payArchive = 'Payments_Archive';
        if (ss.getSheetByName(payArchive)) {
          payArchive = 'Payments_Archive_' + Date.now();
        }
        var payCopy = null;
        if (typeof paySheet.copyTo === 'function') {
          payCopy = paySheet.copyTo(ss);
          payCopy.setName(payArchive);
        } else {
          payCopy = ss.insertSheet(payArchive);
          var oldPayVals = paySheet.getDataRange().getValues();
          payCopy.getRange(1, 1, oldPayVals.length, oldPayVals[0].length).setValues(oldPayVals);
        }
        var verifiedPay = ss.getSheetByName(payArchive);
        if (!verifiedPay || verifiedPay.getLastRow() !== payRows) {
          throw new Error('Archival validation failed for Payments: archive tab not verified');
        }
        paymentsArchiveStatus = 'ARCHIVED_TO_' + payArchive;
      }
    }

    // Safely remove empty header-only Enrollments or FeeObligations tabs
    var cleanEnr = ss.getSheetByName('Enrollments');
    if (cleanEnr && cleanEnr.getLastRow() <= 1) {
      ss.deleteSheet(cleanEnr);
      enrollmentsStatus = 'PHYSICALLY_DELETED_EMPTY';
    }
    var cleanFee = ss.getSheetByName('FeeObligations');
    if (cleanFee && cleanFee.getLastRow() <= 1) {
      ss.deleteSheet(cleanFee);
      feeStatus = 'PHYSICALLY_DELETED_EMPTY';
    }

    // 2. Working Sheets Migration Phase: Remap columns safely
    for (var tabName in TARGET_SCHEMAS) {
      var sheet = ss.getSheetByName(tabName);
      if (!sheet) {
        sheet = ss.insertSheet(tabName);
      }

      var expectedHeaders = TARGET_SCHEMAS[tabName];
      var targetColCount = expectedHeaders.length;
      var currentMaxCols = sheet.getMaxColumns();
      var currentRowCount = sheet.getLastRow();

      if (currentRowCount > 1) {
        // Sheet has data rows: remap data by column name to prevent misalignment
        var currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        var allVals = sheet.getDataRange().getValues();
        var colIndices = [];
        for (var h = 0; h < targetColCount; h++) {
          colIndices.push(currentHeaders.indexOf(expectedHeaders[h]));
        }

        var remapped = [expectedHeaders];
        for (var r = 1; r < allVals.length; r++) {
          var mappedRow = [];
          for (var c = 0; c < targetColCount; c++) {
            var srcCol = colIndices[c];
            mappedRow.push(srcCol !== -1 && allVals[r][srcCol] !== undefined ? allVals[r][srcCol] : '');
          }
          remapped.push(mappedRow);
        }

        if (typeof sheet.clear === 'function') {
          sheet.clear();
        }
        sheet.getRange(1, 1, remapped.length, targetColCount).setValues(remapped);
        var postRemapCols = sheet.getMaxColumns();
        var deletedCount = 0;
        if (postRemapCols > targetColCount) {
          deletedCount = postRemapCols - targetColCount;
          sheet.deleteColumns(targetColCount + 1, deletedCount);
        }
      } else {
        // Sheet is header-only or empty
        if (currentMaxCols < targetColCount) {
          sheet.insertColumnsAfter(currentMaxCols, targetColCount - currentMaxCols);
        }
        sheet.getRange(1, 1, 1, targetColCount).setValues([expectedHeaders]);
        var updatedMaxCols = sheet.getMaxColumns();
        var deletedCount = 0;
        if (updatedMaxCols > targetColCount) {
          deletedCount = updatedMaxCols - targetColCount;
          sheet.deleteColumns(targetColCount + 1, deletedCount);
        }
      }

      if (typeof sheet.getRange(1, 1, 1, targetColCount).setFontWeight === 'function') {
        try {
          sheet.getRange(1, 1, 1, targetColCount).setFontWeight('bold');
        } catch (e) {}
      }

      // Verify row 1 exactly matches target
      var actualCols = sheet.getLastColumn();
      var readHeaders = sheet.getRange(1, 1, 1, actualCols).getValues()[0];
      var matched = (actualCols === targetColCount);

      if (matched) {
        for (var c = 0; c < targetColCount; c++) {
          if (readHeaders[c] !== expectedHeaders[c]) {
            matched = false;
            verificationErrors.push(tabName + ' header mismatch at col ' + (c + 1) + ': expected ' + expectedHeaders[c] + ', got ' + readHeaders[c]);
          }
        }
      } else {
        verificationErrors.push(tabName + ' column count mismatch: expected ' + targetColCount + ', got ' + actualCols);
      }

      // Verify no forbidden obsolete columns exist
      for (var f = 0; f < FORBIDDEN_OBSOLETE_COLUMNS.length; f++) {
        var forbidden = FORBIDDEN_OBSOLETE_COLUMNS[f];
        if (readHeaders.indexOf(forbidden) !== -1) {
          matched = false;
          verificationErrors.push(tabName + ' contains forbidden obsolete column: ' + forbidden);
        }
      }

      migrationResults.push({
        tab: tabName,
        status: matched ? 'MIGRATED_AND_VERIFIED' : 'VERIFICATION_FAILED',
        finalColumnCount: sheet.getMaxColumns(),
        columnsDeleted: deletedCount,
        headers: readHeaders
      });
    }

    // 3. Post-migration checks: Verify neither Enrollments nor FeeObligations active tab exists
    if (ss.getSheetByName('Enrollments') !== null) {
      verificationErrors.push('Enrollments tab still exists after migration');
    }
    if (ss.getSheetByName('FeeObligations') !== null) {
      verificationErrors.push('FeeObligations tab still exists after migration');
    }

    // Verify operational tabs are preserved and intact
    var operationalStatus = {};
    for (var opIdx = 0; opIdx < operationalTabs.length; opIdx++) {
      var opName = operationalTabs[opIdx];
      var opSheet = ss.getSheetByName(opName);
      operationalStatus[opName] = {
        present: opSheet !== null,
        rows: opSheet ? opSheet.getLastRow() : 0,
        columns: opSheet ? opSheet.getLastColumn() : 0
      };
      if (!opSheet) {
        verificationErrors.push('Operational tab missing: ' + opName);
      }
    }

    var allPassed = verificationErrors.length === 0;

    // 4. Log Audit Event if AuditLog sheet is present
    var auditSheet = ss.getSheetByName('AuditLog');
    if (auditSheet && allPassed) {
      try {
        var auditHeaders = auditSheet.getRange(1, 1, 1, auditSheet.getLastColumn()).getValues()[0];
        var nowIso = new Date().toISOString();
        var auditId = 'aud_mig_' + Date.now();
        var auditRow = [];
        for (var a = 0; a < auditHeaders.length; a++) {
          var h = auditHeaders[a];
          if (h === 'audit_id') auditRow.push(auditId);
          else if (h === 'occurred_at') auditRow.push(nowIso);
          else if (h === 'actor_id') auditRow.push('OWNER_MIGRATION');
          else if (h === 'actor_email') auditRow.push('admin@personal-dashboard.local');
          else if (h === 'entity_type') auditRow.push('SCHEMA');
          else if (h === 'entity_id') auditRow.push(ss.getId());
          else if (h === 'action') auditRow.push('MIGRATE_PHYSICAL_SCHEMA');
          else if (h === 'before_summary') auditRow.push('Legacy CRM multi-column schema with Enrollments');
          else if (h === 'after_summary') auditRow.push('Target 6-tab clean single-truth schema');
          else if (h === 'outcome') auditRow.push('SUCCESS');
          else auditRow.push('');
        }
        auditSheet.appendRow(auditRow);
      } catch (e) {
        // Non-blocking audit log append
      }
    }

    return {
      success: allPassed,
      spreadsheetId: ss.getId(),
      executedAt: new Date().toISOString(),
      enrollmentsTab: enrollmentsStatus,
      feeObligationsTab: feeStatus,
      paymentsArchiveTab: paymentsArchiveStatus,
      operationalTabs: operationalStatus,
      results: migrationResults,
      verificationErrors: verificationErrors
    };
  } finally {
    if (lock && lock.releaseLock) {
      try {
        lock.releaseLock();
      } catch (e) {}
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runApprovedSchemaMigration: runApprovedSchemaMigration,
    TARGET_SCHEMAS: TARGET_SCHEMAS,
    FORBIDDEN_OBSOLETE_COLUMNS: FORBIDDEN_OBSOLETE_COLUMNS,
    CANONICAL_SPREADSHEET_ID: CANONICAL_SPREADSHEET_ID,
    BACKUP_SPREADSHEET_ID: BACKUP_SPREADSHEET_ID
  };
}

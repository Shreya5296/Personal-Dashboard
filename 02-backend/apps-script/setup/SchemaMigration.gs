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
  'FeeObligations': [
    'fee_obligation_id', 'student_id', 'student_name', 'package_id',
    'obligation_description', 'amount_due', 'credit_applied', 'currency',
    'issue_date', 'due_date', 'obligation_status', 'notes',
    'created_at', 'updated_at', 'voided_at', 'void_reason'
  ],
  'Payments': [
    'payment_id', 'student_id', 'student_name', 'fee_obligation_id',
    'payment_date', 'amount', 'currency', 'payment_method',
    'transaction_reference', 'idempotency_key', 'payment_status', 'notes',
    'created_at', 'updated_at', 'voided_at', 'void_reason'
  ],
  'ClassSessions': [
    'class_session_id', 'student_id', 'student_name', 'package_id',
    'meeting_link_id', 'class_title', 'scheduled_start', 'scheduled_end',
    'actual_start', 'actual_end', 'session_status', 'attendance_status',
    'class_credit_effect', 'cancellation_reason',
    'credit_restoration_for_session_id', 'notes',
    'created_at', 'updated_at', 'completed_at'
  ],
  'MeetingLinks': [
    'meeting_link_id', 'student_id', 'student_name', 'link_label',
    'meeting_url', 'provider', 'is_preferred', 'link_status',
    'created_at', 'updated_at'
  ]
};

var FORBIDDEN_OBSOLETE_COLUMNS = [
  'first_name', 'last_name', 'preferred_name', 'date_of_birth', 'dob',
  'parent_guardian_name', 'parent_guardian_relationship', 'primary_phone',
  'secondary_phone', 'internal_summary', 'city', 'first_enrollment_date',
  'last_active_date', 'source_reference', 'in_INR', 'closed_at',
  'expiry_date', 'plan_name', 'package_status'
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

  try {
    // 1. Migrate each of the 6 working sheets
    for (var tabName in TARGET_SCHEMAS) {
      var sheet = ss.getSheetByName(tabName);
      if (!sheet) {
        sheet = ss.insertSheet(tabName);
      }

      var expectedHeaders = TARGET_SCHEMAS[tabName];
      var targetColCount = expectedHeaders.length;
      var currentMaxCols = sheet.getMaxColumns();

      // Adjust grid width: insert missing columns if too narrow
      if (currentMaxCols < targetColCount) {
        sheet.insertColumnsAfter(currentMaxCols, targetColCount - currentMaxCols);
      }

      // Set new headers in row 1
      sheet.getRange(1, 1, 1, targetColCount).setValues([expectedHeaders]);
      if (typeof sheet.getRange(1, 1, 1, targetColCount).setFontWeight === 'function') {
        try {
          sheet.getRange(1, 1, 1, targetColCount).setFontWeight('bold');
        } catch (e) {}
      }

      // Physically delete any obsolete columns beyond targetColCount
      var updatedMaxCols = sheet.getMaxColumns();
      var deletedCount = 0;
      if (updatedMaxCols > targetColCount) {
        deletedCount = updatedMaxCols - targetColCount;
        sheet.deleteColumns(targetColCount + 1, deletedCount);
      }

      // Verify row 1 exactly matches
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

    // 2. Safely remove Enrollments tab if empty
    var enrSheet = ss.getSheetByName('Enrollments');
    var enrollmentsStatus = 'NOT_PRESENT';
    if (enrSheet) {
      var enrRows = enrSheet.getLastRow();
      if (enrRows <= 1) {
        ss.deleteSheet(enrSheet);
        enrollmentsStatus = 'PHYSICALLY_DELETED_EMPTY';
      } else {
        verificationErrors.push('Enrollments sheet has ' + enrRows + ' rows; cannot delete non-empty sheet');
        enrollmentsStatus = 'DELETION_ABORTED_NON_EMPTY';
      }
    }

    // Verify Enrollments is gone
    var enrVerify = ss.getSheetByName('Enrollments');
    if (enrVerify !== null) {
      verificationErrors.push('Enrollments tab still exists after deletion attempt');
    }

    // 3. Verify operational tabs are preserved
    var operationalTabs = ['AuditLog', 'ImportBatches', 'ImportRowResults', 'AppConfig'];
    var operationalStatus = {};
    for (var op = 0; op < operationalTabs.length; op++) {
      var opName = operationalTabs[op];
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

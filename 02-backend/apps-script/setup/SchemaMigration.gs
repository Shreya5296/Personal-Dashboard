/**
 * SchemaMigration: Safely aligns canonical spreadsheet headers with the approved
 * single-truth data requirements. Designed to be run by the spreadsheet owner
 * or invoked via Apps Script.
 */

function runApprovedSchemaMigration(spreadsheet) {
  var ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('No active spreadsheet found for schema migration.');
  }

  var targetSchemas = {
    'Students': [
      'student_id', 'student_name', 'parent_name', 'parent_phone', 'student_phone',
      'parent_email', 'student_email', 'subject', 'status', 'notes',
      'created_at', 'updated_at', 'archived_at'
    ],
    'Packages': [
      'package_id', 'student_id', 'student_name', 'plan_name', 'plan_type',
      'currency', 'package_price', 'per_class', 'classes_purchased',
      'start_date', 'expiry_date', 'next_due_date', 'package_status', 'notes',
      'created_at', 'updated_at'
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

  var results = [];

  for (var tabName in targetSchemas) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }
    var headers = targetSchemas[tabName];
    // If the sheet has existing columns, clear row 1 headers up to current width
    var lastCol = Math.max(sheet.getLastColumn(), headers.length);
    if (lastCol > 0) {
      sheet.getRange(1, 1, 1, lastCol).clearContent();
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    results.push({ tab: tabName, status: 'MIGRATED', columns: headers.length });
  }

  // Deprecate Enrollments sheet if present
  var enrSheet = ss.getSheetByName('Enrollments');
  if (enrSheet) {
    if (enrSheet.getLastRow() <= 1) {
      try {
        ss.deleteSheet(enrSheet);
        results.push({ tab: 'Enrollments', status: 'DELETED_REDUNDANT' });
      } catch (e) {
        enrSheet.setName('Enrollments_DEPRECATED');
        results.push({ tab: 'Enrollments', status: 'RENAMED_DEPRECATED' });
      }
    } else {
      enrSheet.setName('Enrollments_DEPRECATED');
      results.push({ tab: 'Enrollments', status: 'RENAMED_DEPRECATED' });
    }
  }

  return {
    success: true,
    message: 'Canonical schema migration executed successfully.',
    results: results
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runApprovedSchemaMigration: runApprovedSchemaMigration
  };
}

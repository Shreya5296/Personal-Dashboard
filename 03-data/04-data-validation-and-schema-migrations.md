# 04 — Data Validation and Schema Migrations

**Project:** Student Management Dashboard / Personal Dashboard  
**Status:** Authoritative Architecture Specification  
**Version:** 2.0.0 (Finalized Owner Data Model)  
**Companion Schema:** `03-data/01-master-spreadsheet-schema.md`

---

## 1. Purpose & Migration Philosophy

This document defines the validation rules, integrity safeguards, and schema migration procedures for the Personal Dashboard Google Spreadsheet database.

### 1.1 Core Principles
1. **Physical Column Deletion, Not Just Renaming**: Obsolete columns are physically deleted from the spreadsheet grid (`sheet.deleteColumns(targetColCount + 1, count)`), not merely overwritten in Row 1.
2. **Strict Verification**: After mutating headers, the migration runner reads back Row 1 and asserts that `lastColumn == targetColCount` and that every column matches the expected header name.
3. **Forbidden Obsolete Columns Assertions**: The runner explicitly scans headers to guarantee forbidden legacy CRM fields (`first_name`, `last_name`, `dob`, `city`, `expiry_date`, `plan_name`, etc.) do not exist.
4. **Physical Removal of `Enrollments`**: The legacy `Enrollments` tab is checked for data. If it has 0 data rows (empty header-only tab), it is physically deleted via `ss.deleteSheet(enrSheet)`.
5. **Operational Tabs Preservation**: Operational tabs (`AuditLog`, `ImportBatches`, `ImportRowResults`, `AppConfig`, `StudentNotes`) are strictly preserved.
6. **Pre-Launch Backup Preservation**: Canonical backup `1kIFYmI81DfNIAqb-ZHsTifiKE6JxhfQrXqpfphrw9eU` is preserved untouched.

---

## 2. Authoritative Target Schemas

The migration runner enforces these exact physical columns in this exact order:

```javascript
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
```

### Forbidden Obsolete Columns
```javascript
var FORBIDDEN_OBSOLETE_COLUMNS = [
  'first_name', 'last_name', 'preferred_name', 'date_of_birth', 'dob',
  'parent_guardian_name', 'parent_guardian_relationship', 'primary_phone',
  'secondary_phone', 'internal_summary', 'city', 'first_enrollment_date',
  'last_active_date', 'source_reference', 'in_INR', 'closed_at',
  'expiry_date', 'plan_name', 'package_status'
];
```

---

## 3. Migration Runner Implementation (`SchemaMigration.gs`)

The standalone migration runner is implemented in `02-backend/apps-script/setup/SchemaMigration.gs`.

### Execution Flow:
1. **Spreadsheet Identity & Safety Lock**:
   - Opens target spreadsheet by canonical ID (`1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`).
   - Asserts that `ss.getId() === CANONICAL_SPREADSHEET_ID`.
   - Acquires `LockService.getScriptLock()` with 15-second timeout.
2. **Column Alignment & Physical Truncation**:
   - For each of the 6 working tabs:
     * Inserts sheet if missing.
     * Expands grid width if current column count is less than target.
     * Writes exact target headers into Row 1 (`1, 1, 1, targetColCount`) with bold styling.
     * Calculates `deletedCount = updatedMaxCols - targetColCount`.
     * If `deletedCount > 0`, calls `sheet.deleteColumns(targetColCount + 1, deletedCount)`.
     * Reads back Row 1 and verifies 100% header alignment and absence of forbidden columns.
3. **Empty `Enrollments` Sheet Removal**:
   - Finds sheet named `'Enrollments'`.
   - If present and row count $\le 1$, executes `ss.deleteSheet(enrSheet)`.
   - Asserts `ss.getSheetByName('Enrollments') === null`.
4. **Operational Tabs Verification**:
   - Asserts that `AuditLog`, `ImportBatches`, `ImportRowResults`, `AppConfig`, and `StudentNotes` exist intact.
5. **Audit Event Logging**:
   - Appends an audit entry (`SCHEMA / MIGRATE_PHYSICAL_SCHEMA / SUCCESS`) to `AuditLog`.
6. **Result Reporting**:
   - Returns structured JSON containing per-tab status, final column count, deleted column count, and verification errors.

---

## 4. Execution Protocol & Owner Runbook

Due to Google Cloud Project API boundaries (Sheets API and Execution API disabled in GCP project `1072944905499`), physical modification of the spreadsheet is performed safely via the Apps Script editor:

1. Open the Apps Script project (`https://script.google.com/d/1CC_ZjGrLBD8BnrAm6CP9oDUJmUPqFy4MCc-MkBiBvCNkMA616uF_pCPL/edit`).
2. Open the file `setup/SchemaMigration.gs`.
3. In the function dropdown at the top, select `runApprovedSchemaMigration`.
4. Click **Run** (authorized under `ashreya0502@gmail.com`).
5. Execution logs will show the verification of each tab, the physical deletion of excess columns, and the successful removal of the `Enrollments` tab.

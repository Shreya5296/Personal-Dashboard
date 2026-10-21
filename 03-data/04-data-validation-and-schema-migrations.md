# 04 — Data Validation and Schema Migrations

**Project:** Student Management Dashboard / Personal Dashboard  
**Status:** Authoritative Architecture Specification  
**Version:** 3.0.0 (Finalized Owner 6-Table Schema)  
**Companion Schema:** `03-data/01-master-spreadsheet-schema.md`

---

## 1. Purpose & Migration Philosophy

This document defines the validation rules, integrity safeguards, and schema migration procedures for the Personal Dashboard Google Spreadsheet database.

### 1.1 Core Principles
1. **Physical Column Deletion, Not Just Renaming**: Obsolete columns are physically deleted from the spreadsheet grid (`sheet.deleteColumns(targetColCount + 1, count)`), not merely overwritten in Row 1.
2. **Strict Verification**: After mutating headers, the migration runner reads back Row 1 and asserts that `lastColumn == targetColCount` and that every column matches the expected header name.
3. **Forbidden Obsolete Columns Assertions**: The runner explicitly scans headers to guarantee forbidden legacy CRM fields (`first_name`, `last_name`, `dob`, `city`, `expiry_date`, `plan_name`, `fee_obligation_id`, `payment_method`, `transaction_reference`, `class_credit_effect`, `meeting_link_id`, `note_id`, etc.) do not exist.
4. **Physical Handling of Legacy Tabs (`Enrollments`, `FeeObligations`)**:
   - If empty ($\le 1$ row), physically deleted via `ss.deleteSheet()`.
   - If non-empty, renamed to `Enrollments_Archive` / `FeeObligations_Archive`.
5. **Operational Tabs Preservation**: Operational tabs (`AuditLog`, `ImportBatches`, `ImportRowResults`, `AppConfig`) are strictly preserved.
6. **Pre-Launch Backup Preservation**: Canonical backup `1kIFYmI81DfNIAqb-ZHsTifiKE6JxhfQrXqpfphrw9eU` is preserved untouched.

---

## 2. Authoritative Target Schemas

The migration runner enforces these exact physical columns in this exact order across all six tables:

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
```

### Forbidden Obsolete Columns
```javascript
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
```

---

## 3. Migration Execution Procedure

```javascript
// Located in 02-backend/apps-script/setup/SchemaMigration.gs
function runApprovedSchemaMigration(spreadsheet) { ... }
```

### 3.1 Verification Checklist Prior to Live Execution
1. Canonical spreadsheet ID verified (`1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`).
2. Script lock acquired (`LockService.getScriptLock()`).
3. Each of the 6 working sheets adjusted:
   - Extra columns deleted.
   - Header row set and formatted bold.
   - Headers read back and asserted for equality.
   - No forbidden columns present.
4. `Enrollments` and `FeeObligations` tabs safely removed or archived.
5. Operational tabs confirmed present.
6. Audit log entry recorded with action `MIGRATE_PHYSICAL_SCHEMA`.

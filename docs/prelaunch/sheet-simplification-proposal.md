# Pre-Launch Google Sheets Simplification Proposal

**Document Version:** 1.0.0  
**Status:** Proposal for Owner Review  
**Date:** October 21, 2026  
**Canonical Scope:** Personal Dashboard (Google Sheets Datastore + Google Apps Script + React/Vite)

---

## 1. Executive Summary

The current architecture defines **12 master spreadsheet tabs**. While this normalized relational design ensures clean separation of concerns, having 12 visible tabs in a single Google Sheet presents operational friction, cognitive overload, and risk of accidental edits for a solo tutor.

This proposal provides a safe, non-destructive path to:
1. **Reduce routine visible tabs from 12 down to 7 (or 6)** without destroying relational integrity or losing any transaction history.
2. **Hide internal operational and audit tabs** from the Google Sheets UI while keeping them 100% functional for backend logging and reconciliation.
3. **Optionally consolidate the redundant `Enrollments` entity into `Packages`**, simplifying the student billing workflow.
4. **Preserve 100% of payment transaction logs, audit trails, and financial reconciliation capabilities.**

---

## 2. Comprehensive Inventory of Current 12 Sheets

| Tab Name | Purpose & Primary Role | Classification | Current Row Count (Live Sheet) | Key Columns | Code & Entity References | Proposed Treatment |
|---|---|---|---|---|---|---|
| **`Students`** | Primary directory of students, guardian info, contact numbers, and active/inactive status. | Primary Entity | 27 rows (synthetic/test) | `student_id`, `first_name`, `last_name`, `primary_phone`, `parent_guardian_name`, `parent_email`, `student_status`, `created_at`, `archived_at` | Referenced by all domains (`student_id` foreign key) | **Keep Separate & Visible (Tab 1)** |
| **`Enrollments`** | Defines formal course enrollment boundaries and agreed fee totals. | Secondary Entity | 0 rows | `enrollment_id`, `student_id`, `enrollment_name`, `start_date`, `end_date`, `fee_plan_name`, `agreed_total_amount`, `enrollment_status` | `EnrollmentRepository`, `EnrollmentService` | **Combine with `Packages` (Consolidate into 1 Tab)** |
| **`Packages`** | Tracks prepaid class credit blocks, total class counts, price, and validity. | Primary Financial / Credit Entity | 3 rows (synthetic) | `package_id`, `student_id`, `package_name`, `purchased_classes`, `package_price`, `start_date`, `expiry_date`, `package_status` | `PackageRepository`, `PackageService`, `ClassService` | **Keep Separate & Visible (Tab 2 - Primary Plan/Package)** |
| **`FeeObligations`** | Tracks invoiced fee obligations, amounts due, due dates, and open/paid/void statuses. | Primary Financial Invoices | 8 rows (synthetic) | `fee_obligation_id`, `student_id`, `obligation_description`, `amount_due`, `due_date`, `obligation_status`, `void_reason` | `FeeRepository`, `FeeService`, `PaymentService`, Reports | **Keep Separate & Visible (Tab 3 - Invoices)** |
| **`Payments`** | Immutable transaction ledger for every cash, UPI, or bank transfer receipt. | Financial Transaction Ledger | 3 rows (synthetic) | `payment_id`, `student_id`, `fee_obligation_id`, `payment_date`, `amount`, `payment_method`, `transaction_reference`, `idempotency_key`, `payment_status` | `PaymentRepository`, `PaymentService`, Reports | **Keep Separate & Visible (Tab 4 - Ledger)** |
| **`ClassSessions`** | Schedules classes, tracks attendance outcomes, and records credit deduction/restoration. | Scheduling & Attendance | 2 rows (synthetic) | `class_session_id`, `student_id`, `class_title`, `scheduled_start`, `scheduled_end`, `session_status`, `attendance_status`, `class_credit_effect` | `ClassRepository`, `ClassService`, Calendar | **Keep Separate & Visible (Tab 5 - Classes & Attendance)** |
| **`MeetingLinks`** | Stores video conferencing room URLs (Google Meet, Zoom) for classes. | Utility / Launcher | 2 rows (synthetic) | `meeting_link_id`, `student_id`, `provider`, `link_label`, `meeting_url`, `is_preferred`, `link_status` | `MeetingLinkRepository`, `ClassSessionForm` | **Keep Separate & Visible (Tab 6)** or Embed default in `Students` |
| **`StudentNotes`** | Chronological log of academic progress, homework, and guardian communications. | Contextual Logging | 2 rows (synthetic) | `note_id`, `student_id`, `note_type`, `note_text`, `follow_up_date`, `follow_up_status`, `created_at`, `created_by` | `NoteRepository`, `NoteService` | **Keep Separate & Visible (Tab 7 - Progress Notes)** |
| **`AuditLog`** | Automated immutable append-only record of every create, update, void, and archive action. | System Audit Trail | 40+ rows (system generated) | `audit_id`, `occurred_at`, `actor_id`, `actor_email`, `entity_type`, `entity_id`, `action`, `before_summary`, `after_summary`, `request_id` | `AuditService`, `AuditRepository` | **Hide Tab (Internal Operational)** |
| **`ImportBatches`** | Metadata tracking for spreadsheet import runs (status, row counts, user). | Temporary Import State | 2 rows (synthetic) | `import_batch_id`, `source_name`, `started_at`, `completed_at`, `import_status`, `total_rows`, `imported_rows`, `duplicate_rows` | `ImportRepository`, `ImportService` | **Hide Tab (Internal Operational)** |
| **`ImportRowResults`** | Row-by-row reconciliation log for CSV import parsing and error diagnostics. | Temporary Import State | 3 rows (synthetic) | `import_row_result_id`, `import_batch_id`, `source_row_reference`, `target_entity_type`, `target_record_id`, `row_status`, `message` | `ImportRepository`, `ImportService` | **Hide Tab (Internal Operational)** |
| **`AppConfig`** | System configuration store (`schema_version`, maintenance flags). | System Configuration | 1 row (`schema_version = 1.0.0`) | `config_key`, `config_value`, `description`, `updated_at` | `SpreadsheetBootstrap`, `SchemaValidator` | **Hide Tab (Internal Operational)** |

---

## 3. Recommended Simplification Architecture

### Level 1: Zero-Risk Visual Simplification (Recommended for Immediate Launch)
* **Live Action:** In Google Sheets, right-click the tab names and select **Hide Sheet** for:
  1. `AuditLog`
  2. `ImportBatches`
  3. `ImportRowResults`
  4. `AppConfig`
* **Result:** Visible tabs drop from **12 to 8**.
* **Impact on Code / Tests:** **Zero**. Apps Script access via `spreadsheet.getSheetByName()` works identically on hidden sheets. No code changes, no schema migrations, zero regression risk.
* **Benefit:** The owner sees only the 8 relevant business tabs when opening the spreadsheet in a browser.

### Level 2: Entity Consolidation (Enrollments + Packages -> Packages)
* **Observation:** In a solo tutoring context, having both an `Enrollment` ("Grade 10 Math") and a `Package` ("10-Class Math Block") creates two layers for a single financial purchase. Every student currently purchases a package of classes.
* **Proposed Consolidation:**
  - Fold `Enrollments` into `Packages`.
  - Add optional columns `course_subject` and `enrollment_status` to `Packages`.
  - Retain `package_id` as the primary key.
  - Drop the empty `Enrollments` tab.
* **Result:** Visible tabs drop from **8 to 7**.
* **Code Impact:** Minimal adapter updates in `EnrollmentService` to alias package records; all existing E2E and unit tests continue passing.

### Level 3: Summary of Visible Tab Structure Post-Simplification

```
Visible to Owner (7 Tabs):
├── 1. [Students]          (Student & Parent Directory)
├── 2. [Packages]          (Course Blocks & Class Credits)
├── 3. [FeeObligations]    (Fee Invoices & Amounts Due)
├── 4. [Payments]          (Cash / UPI Transaction Ledger)
├── 5. [ClassSessions]     (Class Schedule & Attendance)
├── 6. [MeetingLinks]      (Google Meet / Zoom Links)
└── 7. [StudentNotes]      (Learning Progress & Feedback)

Hidden in Background (4 Tabs):
├── [AuditLog]             (Append-only mutation history)
├── [ImportBatches]        (Batch import headers)
├── [ImportRowResults]     (Row reconciliation log)
└── [AppConfig]            (Schema version & system keys)
```

---

## 4. Preservation Invariants (What We Will NOT Do)

1. **Transaction Ledger Integrity:** We will **NEVER** merge `Payments` into `Students` or `FeeObligations`. Each payment must remain a distinct, timestamped, immutable row with its own `idempotency_key`, `payment_method`, and reference number.
2. **Auditability:** `AuditLog` remains active on every backend mutation, ensuring full forensic tracking of who changed what and when.
3. **Credit Deduction Invariants:** `ClassSessions` remains the authoritative source for attendance and credit deduction/restoration (`class_credit_effect`).
4. **No Destructive Drops:** No live sheets will be deleted prior to explicit owner authorization and a confirmed spreadsheet backup snapshot.

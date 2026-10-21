# 03 Data — 01 Master Spreadsheet Schema

**Status:** Authoritative Architecture Specification  
**Version:** 2.0.0 (Finalized Owner Data Model)  
**Applies to:** Personal Dashboard / Student Management Dashboard  
**Canonical Datastore:** One private Google Spreadsheet (`Private Class Dashboard`, ID: `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`)  
**Spreadsheet Owner:** `ashreya0502@gmail.com`  
**Apps Script Project ID:** `1CC_ZjGrLBD8BnrAm6CP9oDUJmUPqFy4MCc-MkBiBvCNkMA616uF_pCPL`  
**Pre-Launch Backup ID:** `1kIFYmI81DfNIAqb-ZHsTifiKE6JxhfQrXqpfphrw9eU`  
**Default Timezone:** `Asia/Kolkata`  
**Default Currency:** `INR`

---

## 1. Purpose & Core Principles

This document is the authoritative specification for the canonical Google Spreadsheet: its exact tab inventory, exact column names and physical order, field types, requiredness, relationships, allowed values, and data integrity rules.

The React frontend never accesses the spreadsheet directly. All reads and writes must pass through the authenticated Google Apps Script backend.

### Key Principles:
1. **Single Source of Truth**: Requirements-first design eliminates redundant tables and CRM fluff.
2. **Simplified Entity Directory**: Single `student_name` replaces fragmented name fields; strict isolation between `parent_email` and `student_email`.
3. **No Drift Balances**: Consumed and remaining class credits are dynamically derived from authoritative `ClassSessions` records; net payable fees are derived from `amount_due - credit_applied`.
4. **Physical Column Alignment**: The spreadsheet contains exactly the approved columns in exact physical order without hidden obsolete columns.
5. **No Redundant Middle Tables**: Course blocks and billing agreements link directly from `Packages` to `Students` without requiring a separate `Enrollments` table.

---

## 2. Global Conventions

### 2.1 Spreadsheet Structure
- **Row 1**: Exact header names in exact physical column order. Bold styling applied.
- **Row 2 onward**: Data records begin immediately on row 2.
- **No Merged Cells**: Cells must never be merged. No title rows or summary cards inside the data tabs.
- **Dynamic Header Mapping**: Backend code resolves columns by validated header name via `HeaderMapper.gs`, ensuring resilience against manual column reordering.
- **Sorting Safety**: Sorting rows never alters record identity or relational foreign keys.

### 2.2 Field Formats
- `*_id`: Immutable backend-generated identifier with semantic prefix (`stu_`, `pkg_`, `fee_`, `pay_`, `cls_`, `ml_`, `note_`, `aud_`, `imp_`, `irr_`).
- **Dates**: ISO `YYYY-MM-DD` date-only strings, invariant across timezones.
- **Timestamps**: ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`). UI displays in `Asia/Kolkata`.
- **Monetary Amounts**: Numeric cell values in `INR` (never strings containing currency symbols or commas).
- **Enums**: Strict uppercase tokens defined in this document.

---

## 3. Authoritative Tab Inventory

The database consists of **6 Visible Working Tabs** for day-to-day tutoring operations, **4 Retained Hidden Operational Tabs** for system governance, and **1 Retained Operational Notes Tab**. The legacy `Enrollments` tab is deprecated and removed.

```
Visible Working Tabs (6)
├── 1. Students          (9 columns: Student directory, contact info, subject, status)
├── 2. Packages          (11 columns: Packages, monthly/yearly/per-class plans, due dates)
├── 3. FeeObligations    (16 columns: Invoices, fee demands, credit_applied)
├── 4. Payments          (16 columns: Immutable receipt ledger, idempotency keys)
├── 5. ClassSessions     (19 columns: Scheduled lessons, attendance, credit effects)
└── 6. MeetingLinks      (10 columns: Video meeting URLs per student)

Retained Operational Tabs (5)
├── 7. StudentNotes      (9 columns: Dated internal remarks and follow-up tracking)
├── 8. AuditLog          (12 columns: Immutable event log of administrative actions)
├── 9. ImportBatches     (14 columns: Staging metadata for spreadsheet imports)
├── 10. ImportRowResults (9 columns: Row-level import staging and reconciliation)
└── 11. AppConfig        (4 columns: System runtime configuration)

Deprecated Tab (1)
└── 12. Enrollments      (Deprecated; removed from active schemas and physically cleared)
```

---

## 4. Working Tabs Specification

### Tab 1: `Students` (Exactly 9 columns)

**Purpose:** Authoritative directory of students, primary parent contacts, subject, and status.

| # | Column Name | Data Type | Required | Rules & Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Unique, immutable identifier (`stu_...`). Primary key. |
| 2 | `student_name` | Text | Yes | Student's full display name (unified; no separate first/last name). |
| 3 | `parent_name` | Text | Yes | Primary parent or guardian contact name. |
| 4 | `parent_phone` | Text | Yes | Primary phone number (WhatsApp/calling). Stored as text to preserve `+`. |
| 5 | `student_phone` | Text | No | Direct student phone number (optional). |
| 6 | `parent_email` | Text | No | Parent email address for invoices/billing. Validated email format when present. |
| 7 | `student_email` | Text | No | Direct student email for calendar invites. Strictly independent of `parent_email`. |
| 8 | `subject` | Text | No | Dedicated subject column (e.g., "Physics", "Grade 10 Mathematics"). |
| 9 | `status` | Enum | Yes | `ACTIVE`, `INACTIVE`, `ARCHIVED`. Distinguishes active/inactive students. Default `ACTIVE`. |

**Owner Decisions & Invariants:**
- Exactly these 9 columns in this order.
- `student_phone` and `student_email` are optional.
- `parent_email` is optional, validated format when present. Never overwritten by `student_email`.
- `status` distinguishes active/inactive students. Inactivation does not cascade delete child records.
- Obsolete CRM fields (`first_name`, `last_name`, `preferred_name`, `date_of_birth`, `dob`, `parent_guardian_relationship`, `city`, `first_enrollment_date`, `last_active_date`, `internal_summary`, `source_reference`) and technical columns (`notes`, `created_at`, `updated_at`, `archived_at`) are excluded from this table.

---

### Tab 2: `Packages` (Exactly 11 columns)

**Purpose:** Course blocks, monthly plans, yearly subscriptions, per-class billing, and payment milestones.

| # | Column Name | Data Type | Required | Rules & Description |
|---:|---|---|---|---|
| 1 | `package_id` | String ID | Yes | Unique immutable package identifier (`pkg_...`). Primary key. |
| 2 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. |
| 3 | `student_name` | Text | Yes | Student name snapshot for human readability in Google Sheets. |
| 4 | `plan_type` | Enum/Text | Yes | Billing model: `PACKAGE`, `MONTHLY`, `YEARLY`, `PER_CLASS`. |
| 5 | `currency` | Text | Yes | Currency code (`INR` for Version 1). |
| 6 | `package_price` | Money | Yes | Total agreed price for package or recurring billing amount. Non-negative numeric. |
| 7 | `per_class` | Money | No | Effective rate per individual class session. Non-negative numeric. |
| 8 | `classes_purchased` | Integer | Yes | Total sessions purchased (positive integer; 0 for unlimited time plans). |
| 9 | `start_date` | Date | Yes | Plan commencement date (`YYYY-MM-DD`). |
| 10 | `end_date` | Date | No | Plan expiration or validity end date (`YYYY-MM-DD`). Must not precede `start_date`. |
| 11 | `next_due_date` | Date | No | Next billing invoice milestone date (`YYYY-MM-DD`). |

**Owner Decisions & Invariants:**
- Exactly these 11 columns in this order.
- Links directly to `student_id` without requiring an `enrollment_id`.
- Uses `end_date` (replacing the former `expiry_date`).
- Balances (`consumed_classes`, `remaining_classes`) are dynamically derived at runtime from `ClassSessions` records; never stored as drifting static columns.
- Dropped columns: `enrollment_id`, `plan_name`, `plan_status`, `package_status`, `in_INR`, `notes`, `created_at`, `updated_at`, `closed_at`.

---

### Tab 3: `FeeObligations` (Exactly 16 columns)

**Purpose:** Invoices, scheduled installments, and recurring billing demands.

| # | Column Name | Data Type | Required | Rules & Description |
|---:|---|---|---|---|
| 1 | `fee_obligation_id` | String ID | Yes | Unique invoice identifier (`fee_...`). Primary key. |
| 2 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. |
| 3 | `student_name` | Text | Yes | Student name snapshot. |
| 4 | `package_id` | String ID | No | Optional foreign key to `Packages.package_id`. |
| 5 | `obligation_description` | Text | Yes | Human-readable invoice title / billing period description. |
| 6 | `amount_due` | Money | Yes | Total billed obligation amount before credit application. Numeric, non-negative. |
| 7 | `credit_applied` | Money | Yes | Advance or overpayment credit absorbed by this invoice. Default `0.00`. |
| 8 | `currency` | Text | Yes | Billing currency (`INR`). |
| 9 | `issue_date` | Date | Yes | Invoice generation date (`YYYY-MM-DD`). |
| 10 | `due_date` | Date | Yes | Payment deadline (`YYYY-MM-DD`). |
| 11 | `obligation_status` | Enum | Yes | `OPEN`, `PARTIALLY_PAID`, `PAID`, `VOID`. |
| 12 | `notes` | Text | No | Invoice remarks, payment terms, or batch generation metadata. |
| 13 | `created_at` | Timestamp | Yes | ISO 8601 creation timestamp. |
| 14 | `updated_at` | Timestamp | Yes | ISO 8601 modification timestamp. |
| 15 | `voided_at` | Timestamp | No | ISO 8601 timestamp if invoice was voided. |
| 16 | `void_reason` | Text | No | Mandatory justification if invoice was voided. |

**Invariants:**
- `net_payable = amount_due - credit_applied`.
- `paid_amount` and `outstanding_amount` are dynamically derived from non-void `Payments`.
- Dropped columns: `enrollment_id`.

---

### Tab 4: `Payments` (Exactly 16 columns)

**Purpose:** Immutable ledger of received funds (cash, UPI, bank transfer) and idempotency deduplication.

| # | Column Name | Data Type | Required | Rules & Description |
|---:|---|---|---|---|
| 1 | `payment_id` | String ID | Yes | Unique payment transaction identifier (`pay_...`). Primary key. |
| 2 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. |
| 3 | `student_name` | Text | Yes | Student name snapshot. |
| 4 | `fee_obligation_id` | String ID | Yes | Foreign key to `FeeObligations.fee_obligation_id`. |
| 5 | `payment_date` | Date | Yes | Date payment was received (`YYYY-MM-DD`). |
| 6 | `amount` | Money | Yes | Actual cash/bank amount received. Numeric, greater than zero. |
| 7 | `currency` | Text | Yes | Transaction currency (`INR`). |
| 8 | `payment_method` | Enum | Yes | `UPI`, `BANK_TRANSFER`, `CASH`, `CARD`, `CHEQUE`, `OTHER`. |
| 9 | `transaction_reference` | Text | No | Bank UTR, UPI transaction ID, or check number. |
| 10 | `idempotency_key` | String | Yes | Client UUID preventing double-submission on retries or concurrent clicks. |
| 11 | `payment_status` | Enum | Yes | `RECORDED`, `VOID`. |
| 12 | `notes` | Text | No | Transaction notes or overpayment credit remarks. |
| 13 | `created_at` | Timestamp | Yes | ISO 8601 creation timestamp. |
| 14 | `updated_at` | Timestamp | Yes | ISO 8601 modification timestamp. |
| 15 | `voided_at` | Timestamp | No | ISO 8601 timestamp if payment was voided. |
| 16 | `void_reason` | Text | No | Mandatory audit reason if payment was voided. |

**Invariants:**
- Every payment references an authoritative `fee_obligation_id`.
- `amount` represents real money received and matches bank statements exactly.
- Overpayments beyond `fee.amount_due` are tracked in the available credit ledger and applied forward via `credit_applied` on subsequent invoices.

---

### Tab 5: `ClassSessions` (Exactly 19 columns)

**Purpose:** Scheduled lessons, actual attendance records, credit deduction effects, and credit restorations.

| # | Column Name | Data Type | Required | Rules & Description |
|---:|---|---|---|---|
| 1 | `class_session_id` | String ID | Yes | Unique class session identifier (`cls_...`). Primary key. |
| 2 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. |
| 3 | `student_name` | Text | Yes | Student name snapshot. |
| 4 | `package_id` | String ID | No | Associated package (if consuming prepaid credits). |
| 5 | `meeting_link_id` | String ID | No | Associated meeting link. |
| 6 | `class_title` | Text | Yes | Human-readable title (e.g. "Kinematics & Dynamics"). |
| 7 | `scheduled_start` | Timestamp | Yes | Scheduled start time (`Asia/Kolkata` semantics). |
| 8 | `scheduled_end` | Timestamp | Yes | Scheduled end time. |
| 9 | `actual_start` | Timestamp | No | Actual start time if recorded. |
| 10 | `actual_end` | Timestamp | No | Actual end time if recorded. |
| 11 | `session_status` | Enum | Yes | `SCHEDULED`, `COMPLETED`, `CANCELLED`, `RESCHEDULED`, `NO_SHOW`. |
| 12 | `attendance_status` | Enum | Yes | `NOT_MARKED`, `ATTENDED`, `ABSENT`, `EXCUSED`. |
| 13 | `class_credit_effect` | Enum | Yes | `PENDING`, `CONSUME`, `NO_CONSUME`, `CREDIT_BACK`. |
| 14 | `cancellation_reason` | Text | No | Reason for cancellation or notice window. |
| 15 | `credit_restoration_for_session_id` | String ID | Conditional | Populated ONLY for `CREDIT_BACK` records. Unique across all restorations. |
| 16 | `notes` | Text | No | Session homework, topics covered, or remarks. |
| 17 | `created_at` | Timestamp | Yes | ISO 8601 creation timestamp. |
| 18 | `updated_at` | Timestamp | Yes | ISO 8601 modification timestamp. |
| 19 | `completed_at` | Timestamp | No | Timestamp when attendance was marked. |

**Invariants:**
- `CONSUME`: Deducts 1 package class credit (completed attended classes or unexcused no-shows).
- `NO_CONSUME`: No credit impact (excused absences, tutor waivers, advance cancellations >=4h).
- `CREDIT_BACK`: Restores 1 consumed credit. Filtered out of calendars; visible only in credit audit ledger.
- Dropped columns: `enrollment_id`.

---

### Tab 6: `MeetingLinks` (Exactly 10 columns)

**Purpose:** Configured virtual meeting rooms (Google Meet, Zoom) per student.

| # | Column Name | Data Type | Required | Rules & Description |
|---:|---|---|---|---|
| 1 | `meeting_link_id` | String ID | Yes | Unique meeting link identifier (`ml_...`). Primary key. |
| 2 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. |
| 3 | `student_name` | Text | Yes | Student name snapshot. |
| 4 | `link_label` | Text | Yes | Label (e.g., "Primary Google Meet", "Backup Zoom"). |
| 5 | `meeting_url` | URL/Text | Yes | HTTPS meeting room URL. |
| 6 | `provider` | Enum | Yes | `GOOGLE_MEET`, `ZOOM`, `OTHER`. |
| 7 | `is_preferred` | Boolean | Yes | `TRUE` if default primary link for student; `FALSE` otherwise. |
| 8 | `link_status` | Enum | Yes | `ACTIVE`, `INACTIVE`. |
| 9 | `created_at` | Timestamp | Yes | ISO 8601 creation timestamp. |
| 10 | `updated_at` | Timestamp | Yes | ISO 8601 modification timestamp. |

**Invariants:**
- At most one active preferred link per student.
- Dropped columns: `valid_from`, `valid_until`, `notes`, `deactivated_at`.

---

## 5. Retained Operational Tabs Specification

### Tab 7: `StudentNotes` (9 columns)
`note_id, student_id, note_type, note_text, follow_up_date, follow_up_status, created_at, updated_at, created_by`
- Retained for internal teacher notes, pedagogical remarks, and follow-up tracking.
- Pre-launch cleanup verified: synthetic rows 2–9 cleared; Row 1 headers intact.

### Tab 8: `AuditLog` (12 columns)
`audit_id, occurred_at, actor_id, actor_email, entity_type, entity_id, action, before_summary, after_summary, request_id, outcome, error_code`
- Hidden operational tab recording all administrative mutations.

### Tab 9: `ImportBatches` (14 columns)
`import_batch_id, source_name, source_spreadsheet_id, source_tab_name, started_at, completed_at, import_status, total_rows, imported_rows, skipped_rows, failed_rows, duplicate_rows, initiated_by, notes`

### Tab 10: `ImportRowResults` (9 columns)
`import_row_result_id, import_batch_id, source_row_reference, target_entity_type, target_record_id, row_status, source_fingerprint, message, processed_at`

### Tab 11: `AppConfig` (4 columns)
`config_key, config_value, description, updated_at`

---

## 6. Deprecated Tab Policy: `Enrollments`

The `Enrollments` tab introduced unnecessary architectural complexity for a private tutoring practice. All course blocks and billing arrangements link directly from `Packages` to `Students`.

The `Enrollments` tab is deprecated throughout the application code, tests, and navigation. When the schema migration runner is executed on an empty `Enrollments` sheet, it is physically deleted.

# 04 — Google Sheets Data Model

**Status:** Authoritative Architecture Specification  
**Version:** 2.0.0 (Finalized Owner Data Model)  
**Applies to:** Personal Dashboard / Student Management Dashboard  
**Canonical Datastore:** One private Google Spreadsheet (`Private Class Dashboard`, ID: `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`)  
**Spreadsheet Owner:** `ashreya0502@gmail.com`  
**Apps Script Project ID:** `1CC_ZjGrLBD8BnrAm6CP9oDUJmUPqFy4MCc-MkBiBvCNkMA616uF_pCPL`

---

## 1. Purpose & Principles

This document is the authoritative specification for the Google Sheets database used by the Personal Dashboard. The Google Apps Script backend and React frontend follow these exact schemas, field definitions, and integrity rules.

### Core Principles:
1. **Requirements-First**: Only fields strictly needed for private tutoring operations are maintained. Obsolete CRM fields (`first_name`, `last_name`, `dob`, `city`, etc.) are eliminated.
2. **One Permanent Student Name**: `student_name` is a single unified field.
3. **Strict Email Separation**: `parent_email` and `student_email` are independent columns. `student_email` never overwrites `parent_email`.
4. **Dedicated Subject**: `subject` is stored in its own dedicated physical column in `Students`.
5. **Direct Relational Links**: Course blocks (`Packages`) link directly to `Students` without an intermediate `Enrollments` table.
6. **No Drifting Balances**: Class credit balances are dynamically derived from `ClassSessions` attendance; net fees are derived from `FeeObligations` and `Payments`.

---

## 2. Canonical Tab Inventory

The database consists of **6 Visible Working Tabs**, **5 Retained Operational Tabs**, and **1 Deprecated Tab**:

```
Visible Working Tabs (6)
├── 1. Students          (9 columns: Student directory, parent contacts, subject, status)
├── 2. Packages          (11 columns: Packages, plans, price, per_class, end_date, due_date)
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

## 3. Authoritative Working Tab Schemas

### Tab 1: `Students` (Exactly 9 columns)

| # | Column Name | Type | Required | Description |
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

*Decisions:*
- Exactly these 9 columns in this physical order.
- `student_phone` and `student_email` are optional.
- `parent_email` is optional, validated when present. Never overwritten by `student_email`.
- `status` distinguishes active/inactive students. Inactivation preserves historical records without cascade deletion.
- Excluded from table: `notes`, `created_at`, `updated_at`, `archived_at`, `first_name`, `last_name`, `dob`, `city`.

---

### Tab 2: `Packages` (Exactly 11 columns)

| # | Column Name | Type | Required | Description |
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

*Decisions:*
- Exactly these 11 columns in this physical order.
- Direct association to `student_id`.
- Uses `end_date` (replacing former `expiry_date`).
- Excluded from table: `enrollment_id`, `plan_name`, `plan_status`, `package_status`, `in_INR`, `notes`, `created_at`, `updated_at`.

---

### Tab 3: `FeeObligations` (Exactly 16 columns)

| # | Column Name | Type | Required | Description |
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

---

### Tab 4: `Payments` (Exactly 16 columns)

| # | Column Name | Type | Required | Description |
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

---

### Tab 5: `ClassSessions` (Exactly 19 columns)

| # | Column Name | Type | Required | Description |
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

---

### Tab 6: `MeetingLinks` (Exactly 10 columns)

| # | Column Name | Type | Required | Description |
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

---

## 4. Retained Operational Tabs

- **`StudentNotes` (9 columns):** `note_id, student_id, note_type, note_text, follow_up_date, follow_up_status, created_at, updated_at, created_by`.
- **`AuditLog` (12 columns):** `audit_id, occurred_at, actor_id, actor_email, entity_type, entity_id, action, before_summary, after_summary, request_id, outcome, error_code`.
- **`ImportBatches` (14 columns):** `import_batch_id, source_name, source_spreadsheet_id, source_tab_name, started_at, completed_at, import_status, total_rows, imported_rows, skipped_rows, failed_rows, duplicate_rows, initiated_by, notes`.
- **`ImportRowResults` (9 columns):** `import_row_result_id, import_batch_id, source_row_reference, target_entity_type, target_record_id, row_status, source_fingerprint, message, processed_at`.
- **`AppConfig` (4 columns):** `config_key, config_value, description, updated_at`.

---

## 5. Deprecated Tab Policy: `Enrollments`

`Enrollments` is deprecated throughout the code, tests, and documentation. Course blocks and financial billing link directly to `Students`. When the migration runner is executed on an empty `Enrollments` tab, it is physically deleted.

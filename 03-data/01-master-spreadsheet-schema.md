# 03 Data — 01 Master Spreadsheet Schema

**Status:** Authoritative Architecture Specification  
**Version:** 3.0.0 (Finalized Owner 6-Table Schema)  
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

The React frontend never accesses the spreadsheet directly. All reads and writes pass through the authenticated Google Apps Script backend.

### Key Principles:
1. **Single Source of Truth**: Business requirements are the source of truth. The database matches the owner's exact requirements without enterprise complexity a single tutor does not need.
2. **Simplified Entity Directory**: Single `student_name` replaces fragmented name fields; strict isolation between `parent_email` and `student_email`; dedicated `subject` column.
3. **Streamlined Financial & Attendance Model**:
   - `Packages` tracks package price, per-class rate, classes purchased, start/end dates, and next due date.
   - `Payments` (Payment Details) directly records payments received with manually entered `in_inr` (never overwritten by automated conversion).
   - `ClassSessions` tracks scheduled lessons and a boolean `deduct_class` flag. Attended classes deduct 1 credit; absences ask the owner; cancelled lessons do not deduct unless explicitly applied.
   - Available class credits are derived by summing sessions where `deduct_class == true` and deducting FIFO by `start_date`.
4. **Physical Column Alignment**: The spreadsheet contains exactly the approved columns in exact physical order without hidden obsolete columns.
5. **No Redundant Middle Tables**: Direct relationships: `Packages`, `Payments`, `ClassSessions`, `MeetingLinks`, and `StudentNotes` link directly to `student_id`.

---

## 2. Global Conventions

### 2.1 Spreadsheet Structure
- **Row 1**: Exact header names in exact physical column order. Bold styling applied.
- **Row 2 onward**: Data records begin immediately on row 2.
- **No Merged Cells**: Cells must never be merged. No title rows or summary cards inside data tabs.
- **Dynamic Header Mapping**: Backend code resolves columns by validated header name via `HeaderMapper.gs`.
- **Sorting Safety**: Sorting rows never alters record identity.

### 2.2 Field Formats
- `*_id`: Immutable backend-generated identifier with semantic prefix (`stu_`, `pkg_`, `cls_`, etc.).
- **Dates**: ISO `YYYY-MM-DD` date-only strings, invariant across timezones.
- **Timestamps**: ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`). UI displays in `Asia/Kolkata`.
- **Monetary Amounts**: Numeric cell values in original currency or INR.
- **Enums & Booleans**: Uppercase tokens (`ACTIVE`, `INACTIVE`) and booleans (`TRUE`/`FALSE`).

---

## 3. Authoritative Tab Inventory

The database consists of **6 Working Tabs** for day-to-day tutoring operations and **4 Operational Tabs** for system governance. Legacy middle tabs (`Enrollments`, `FeeObligations`) are deprecated and archived/removed.

```
Working Business Tables (6)
├── 1. Students          (9 columns: student directory, contacts, subject, status)
├── 2. Packages          (11 columns: plan details, pricing, classes purchased, due dates)
├── 3. Payments          (6 columns: payment details, original amount, manual in_inr)
├── 4. ClassSessions     (8 columns: class session id, schedule, attendance, deduct_class)
├── 5. MeetingLinks      (4 columns: flat student meeting link 1 and meeting link 2)
└── 6. StudentNotes      (5 columns: student notes, note date, text, follow-up date)

Operational Governance Tab (1)
└── 7. AuditLog          (12 columns: immutable event log of administrative actions)

Permanently Retired Tabs (5)
├── 8. ImportBatches     (Retired; bulk import removed)
├── 9. ImportRowResults  (Retired; bulk import removed)
├── 10. AppConfig        (Retired; replaced by ConfigService and ScriptProperties)
├── 11. Enrollments      (Deprecated; removed if empty, renamed to Enrollments_Archive if data exists)
└── 12. FeeObligations   (Deprecated; removed if empty, renamed to FeeObligations_Archive if data exists)
```

---

## 4. Working Tabs Specification

### Tab 1: `Students` (Exactly 9 columns)
**Physical Sheet Name:** `Students`

| # | Column Name | Data Type | Required | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Unique, immutable identifier (`stu_...`). Primary key. |
| 2 | `student_name` | Text | Yes | Student's full display name (unified; no separate first/last name). |
| 3 | `parent_name` | Text | Yes | Primary parent or guardian contact name. |
| 4 | `parent_phone` | Text | Yes | Primary phone number (WhatsApp/calling). Stored as text to preserve `+`. |
| 5 | `student_phone` | Text | No | Direct student phone number (optional). |
| 6 | `parent_email` | Text | No | Parent email address for invoices/billing. Strictly isolated from student email. |
| 7 | `student_email` | Text | No | Direct student email for calendar invites. Never overwrites parent email. |
| 8 | `subject` | Text | No | Dedicated subject column (e.g., "Physics", "Grade 10 Mathematics"). |
| 9 | `status` | Enum | Yes | `ACTIVE`, `INACTIVE`. Distinguishes active/inactive students. Default `ACTIVE`. |

---

### Tab 2: `Packages` (Exactly 11 columns)
**Physical Sheet Name:** `Packages`

| # | Column Name | Data Type | Required | Description |
|---:|---|---|---|---|
| 1 | `package_id` | String ID | Yes | Unique immutable package identifier (`pkg_...`). Primary key. |
| 2 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. |
| 3 | `student_name` | Text | Yes | Student name snapshot for readability in Google Sheets. |
| 4 | `plan_type` | Enum/Text | Yes | Billing model: `PACKAGE`, `MONTHLY`, `YEARLY`, `PER_CLASS`. |
| 5 | `currency` | Text | Yes | Currency code (`INR` default). |
| 6 | `package_price` | Money | Yes | Agreed price for package or periodic billing amount. Numeric. |
| 7 | `per_class` | Money | No | Effective rate per individual class session. Numeric. |
| 8 | `classes_purchased` | Integer | Yes | Total sessions purchased (positive integer; 0 for unlimited time plans). |
| 9 | `start_date` | Date | Yes | Plan commencement date (`YYYY-MM-DD`). |
| 10 | `end_date` | Date | No | Plan expiration or validity end date (`YYYY-MM-DD`). |
| 11 | `next_due_date` | Date | No | Next billing payment due date (`YYYY-MM-DD`). |

---

### Tab 3: `Payments` (Payment Details — Exactly 6 columns)
**Physical Sheet Name:** `Payments`

| # | Column Name | Data Type | Required | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. |
| 2 | `student_name` | Text | Yes | Student name snapshot. |
| 3 | `payment_date` | Date | Yes | Date payment was received (`YYYY-MM-DD`). |
| 4 | `amount` | Money | Yes | Received amount in original currency. Numeric, greater than zero. |
| 5 | `currency` | Text | Yes | Original payment currency (e.g., `INR`, `USD`, `GBP`). |
| 6 | `in_inr` | Money | No | Equivalent amount in INR. Entered manually; never overwritten by automatic conversion. |

---

### Tab 4: `ClassSessions` (Exactly 8 columns)
**Physical Sheet Name:** `ClassSessions`

| # | Column Name | Data Type | Required | Description |
|---:|---|---|---|---|
| 1 | `class_session_id` | String ID | Yes | Unique class session identifier (`cls_...`). Primary key. |
| 2 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. |
| 3 | `scheduled_start` | Timestamp | Yes | Scheduled start time (ISO 8601). |
| 4 | `scheduled_end` | Timestamp | Yes | Scheduled end time (ISO 8601). |
| 5 | `attendance_status` | Enum | Yes | `NOT_MARKED`, `ATTENDED`, `PRESENT`, `ABSENT`, `CANCELLED`. |
| 6 | `session_status` | Enum | Yes | `SCHEDULED`, `COMPLETED`, `CANCELLED`. |
| 7 | `cancellation_reason` | Text | No | Reason for cancellation if session was cancelled. |
| 8 | `deduct_class` | Boolean | Yes | `TRUE` if this class deducts 1 session credit; `FALSE` otherwise. |

**Deduction Rules:**
- `ATTENDED` / `PRESENT` automatically deducts 1 class (`deduct_class = true`).
- `ABSENT` asks the owner whether to deduct (`deduct_class` explicitly set by caller).
- `NOT_MARKED` does not deduct (`deduct_class = false`).
- `CANCELLED` does not automatically deduct (`deduct_class = false` unless explicitly applied by owner).
- Total consumed credits for a student = count of sessions for `student_id` where `deduct_class == true`. Deducted FIFO from packages by `start_date`.

---

### Tab 5: `MeetingLinks` (Exactly 4 columns)
**Physical Sheet Name:** `MeetingLinks`

| # | Column Name | Data Type | Required | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. Primary key (1 row per student). |
| 2 | `student_name` | Text | Yes | Student name snapshot. |
| 3 | `meeting_link_1` | URL/Text | Yes | Primary virtual meeting room URL (e.g. Google Meet). |
| 4 | `meeting_link_2` | URL/Text | No | Optional secondary / backup virtual meeting room URL (e.g. Zoom). |

---

### Tab 6: `StudentNotes` (Exactly 5 columns)
**Physical Sheet Name:** `StudentNotes`

| # | Column Name | Data Type | Required | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. |
| 2 | `student_name` | Text | Yes | Student name snapshot. |
| 3 | `note_date` | Date | Yes | Date note was recorded (`YYYY-MM-DD`). |
| 4 | `note_text` | Text | Yes | Pedagogical notes, student progress remarks, or homework notes. |
| 5 | `follow_up_date` | Date | No | Optional follow-up date (`YYYY-MM-DD`). |

---

## 5. Operational Governance Tabs

### Tab 7: `AuditLog` (12 columns)
`audit_id, occurred_at, actor_id, actor_email, entity_type, entity_id, action, before_summary, after_summary, request_id, outcome, error_code`

### Tab 8: `ImportBatches` (14 columns)
`import_batch_id, source_name, source_spreadsheet_id, source_tab_name, started_at, completed_at, import_status, total_rows, imported_rows, skipped_rows, failed_rows, duplicate_rows, initiated_by, notes`

### Tab 9: `ImportRowResults` (9 columns)
`import_row_result_id, import_batch_id, source_row_reference, target_entity_type, target_record_id, row_status, source_fingerprint, message, processed_at`

### Tab 10: `AppConfig` (4 columns)
`config_key, config_value, description, updated_at`

---

## 6. Deprecated Legacy Tabs Policy

- **`Enrollments`**: Deprecated. If empty ($\le 1$ row), physically deleted by migration runner; if non-empty, renamed to `Enrollments_Archive`.
- **`FeeObligations`**: Deprecated; superseded by `Payments` (Payment Details). If empty ($\le 1$ row), physically deleted by migration runner; if non-empty, renamed to `FeeObligations_Archive`.

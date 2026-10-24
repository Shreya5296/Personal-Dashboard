# 04 — Google Sheets Data Model

**Status:** Authoritative Architecture Specification  
**Version:** 3.0.0 (Finalized Owner 6-Table Schema)  
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
5. **Direct Relational Links**: Course blocks (`Packages`), payments (`Payments`), class sessions (`ClassSessions`), meeting links (`MeetingLinks`), and student notes (`StudentNotes`) link directly to `Students` without intermediate tables.
6. **No Drifting Balances**: Class credit balances are dynamically derived from `ClassSessions` attendance; student financial balances are derived from `Packages` and `Payments`.

---

## 2. Canonical Tab Inventory

The database consists of **6 Working Tables** and **4 Operational Governance Tabs**:

```
Working Business Tables (6)
├── 1. Students          (9 columns: student directory, parent contacts, subject, status)
├── 2. Packages          (11 columns: package details, pricing, classes purchased, due dates)
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
| 9 | `status` | Enum | Yes | `ACTIVE`, `INACTIVE`. Distinguishes active/inactive students. Default `ACTIVE`. |

---

### Tab 2: `Packages` (Exactly 11 columns)

| # | Column Name | Type | Required | Description |
|---:|---|---|---|---|
| 1 | `package_id` | String ID | Yes | Unique immutable package identifier (`pkg_...`). Primary key. |
| 2 | `student_id` | String ID | Yes | Foreign key linking package to `Students.student_id`. |
| 3 | `student_name` | Text | Yes | Student name snapshot for spreadsheet readability. |
| 4 | `plan_type` | Enum/Text | Yes | Billing model: `PACKAGE`, `MONTHLY`, `YEARLY`, `PER_CLASS`. |
| 5 | `currency` | Text | Yes | Currency code (`INR` default). |
| 6 | `package_price` | Money | Yes | Total agreed price for package or periodic billing amount. Numeric. |
| 7 | `per_class` | Money | No | Effective rate per individual class session. Numeric. |
| 8 | `classes_purchased` | Integer | Yes | Total sessions purchased (positive integer; 0 for unlimited time plans). |
| 9 | `start_date` | Date | Yes | Plan commencement date (`YYYY-MM-DD`). |
| 10 | `end_date` | Date | No | Plan expiration or validity end date (`YYYY-MM-DD`). |
| 11 | `next_due_date` | Date | No | Next billing payment due date (`YYYY-MM-DD`). |

---

### Tab 3: `Payments` (Payment Details — Exactly 6 columns)

| # | Column Name | Type | Required | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. |
| 2 | `student_name` | Text | Yes | Student name snapshot. |
| 3 | `payment_date` | Date | Yes | Date payment was received (`YYYY-MM-DD`). |
| 4 | `amount` | Money | Yes | Received amount in original currency. Numeric, greater than zero. |
| 5 | `currency` | Text | Yes | Original payment currency (e.g., `INR`, `USD`, `GBP`). |
| 6 | `in_inr` | Money | No | Amount in INR. Entered manually; never overwritten by automatic conversion. |

---

### Tab 4: `ClassSessions` (Exactly 8 columns)

| # | Column Name | Type | Required | Description |
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
- Balance derivation: sum of sessions for that student where `deduct_class == true`. Deducted FIFO from packages by `start_date`.

---

### Tab 5: `MeetingLinks` (Exactly 4 columns)

| # | Column Name | Type | Required | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. Primary key (1 row per student). |
| 2 | `student_name` | Text | Yes | Student name snapshot. |
| 3 | `meeting_link_1` | URL/Text | Yes | Primary virtual meeting room URL (e.g. Google Meet). |
| 4 | `meeting_link_2` | URL/Text | No | Optional secondary / backup virtual meeting room URL (e.g. Zoom). |

---

### Tab 6: `StudentNotes` (Exactly 5 columns)

| # | Column Name | Type | Required | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. |
| 2 | `student_name` | Text | Yes | Student name snapshot. |
| 3 | `note_date` | Date | Yes | Date note was recorded (`YYYY-MM-DD`). |
| 4 | `note_text` | Text | Yes | Pedagogical notes, student progress remarks, or homework notes. |
| 5 | `follow_up_date` | Date | No | Optional follow-up date (`YYYY-MM-DD`). |

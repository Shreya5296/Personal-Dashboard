# 03 Data — 01 Master Spreadsheet Schema

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** Data-01
- **Status:** Authoritative Master Spreadsheet Specification
- **Version:** 4.0.0 (Strict Six-Table Canonical Architecture)
- **Canonical Spreadsheet:** `Private Class Dashboard` (`1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`)
- **Default Timezone:** `Asia/Kolkata`
- **Default Currency:** `INR`

---

## 2. Canonical Tab Inventory (Six Tables Only)

The master spreadsheet consists of **strictly six canonical data tables**. No other active data tables exist.

```text
The Six Canonical Tables:
├── 1. Students          (9 columns: student directory, parent contacts, subject, status)
├── 2. Packages          (12 columns: package pricing, class count, duration, recurring schedule)
├── 3. Payments          (6 columns: payment date, original amount, currency, manual in_inr)
├── 4. ClassSessions     (8 columns: schedule date & time, attendance status, deduct_class, cancellation)
├── 5. MeetingLinks      (4 columns: flat student meeting link 1 and meeting link 2)
└── 6. StudentNotes      (5 columns: pedagogical notes, note date, text, follow-up date)

Archived & Retired Sheets:
├── _Archived_ClassSchedules (Archived during canonical schema migration)
├── _Backup_PreCanonical_Packages (Archived backup)
├── _Backup_PreCanonical_ClassSchedules (Archived backup)
├── StudentId_Migration_Backup (Archived backup from STU_001 migration)
└── Permanently Retired: Enrollments, FeeObligations, AppConfig, ImportBatches, ImportRowResults
```

---

## 3. Detailed Physical Column Order & Field Specifications

### 3.1 Tab 1: `Students` (9 Columns)
| # | Column Name | Type | Key | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | PK | Immutable unique student identifier (`STU_001` format). |
| 2 | `student_name` | Text | — | Student's full display name. |
| 3 | `parent_name` | Text | — | Primary parent or guardian contact name. |
| 4 | `parent_phone` | Text | — | Primary parent phone (WhatsApp/call). Stored with `'` prefix if starting with `+`. |
| 5 | `parent_email` | Text | — | Parent email address (optional). |
| 6 | `student_phone` | Text | — | Direct student phone number (optional). |
| 7 | `student_email` | Text | — | Direct student email for calendar invites (optional). |
| 8 | `subject` | Text | — | Enrolled subject or subjects (e.g. `AP Calculus BC`). |
| 9 | `status` | Enum | — | Student status: `ACTIVE`, `INACTIVE`, `ARCHIVED`. Default `ACTIVE`. |

**Canonical Column Order:**
`student_id, student_name, parent_name, parent_phone, parent_email, student_phone, student_email, subject, status`

---

### 3.2 Tab 2: `Packages` (12 Columns)
| # | Column Name | Type | Key | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | FK | Links to `Students.student_id`. Primary retrieval key. |
| 2 | `student_name` | Text | — | Student name snapshot for spreadsheet readability. |
| 3 | `plan_type` | Enum/Text | — | Plan type: `PACKAGE`, `MONTHLY`, `YEARLY`, `PER_CLASS`. |
| 4 | `currency` | Text | — | Agreed currency code (e.g. `INR`, `USD`, `GBP`, `EUR`). Default `INR`. |
| 5 | `package_price` | Numeric | — | Total agreed package price or periodic billing amount. |
| 6 | `per_class` | Numeric | — | Effective rate per individual class session. |
| 7 | `classes_purchased` | Integer | — | Total sessions purchased (positive integer). |
| 8 | `start_date` | Date/Text | — | Package start date (`YYYY-MM-DD` / `dd/mm/yyyy`). |
| 9 | `end_date` | Date/Text | — | Projected package end date (`YYYY-MM-DD` / `dd/mm/yyyy`). |
| 10 | `next_due_date` | Date/Text | — | Next billing or renewal due date (derived by N-4 rule). |
| 11 | `class_duration` | Integer | — | Class duration in minutes (default `60`). |
| 12 | `class_schedule` | Text | — | Recurring schedule string (e.g. `Mon - 6:00 PM, Wed - 6:00 PM`). |

**Canonical Column Order:**
`student_id, student_name, plan_type, currency, package_price, per_class, classes_purchased, start_date, end_date, next_due_date, class_duration, class_schedule`

*Important Schema Rules:*
- **There is no `package_id` column** in the sheet. Packages are uniquely identified by `student_id`.
- `class_schedule` is the single source of truth for recurring weekly schedule patterns.

---

### 3.3 Tab 3: `Payments` (6 Columns)
| # | Column Name | Type | Key | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | FK | Links to `Students.student_id`. |
| 2 | `student_name` | Text | — | Student name snapshot. |
| 3 | `payment_date` | Date/Text | — | Date payment was received (`YYYY-MM-DD` / `dd/mm/yyyy`). |
| 4 | `amount` | Numeric | — | Amount received in original payment currency. Greater than zero. |
| 5 | `currency` | Text | — | Original payment currency (e.g. `INR`, `USD`, `GBP`). |
| 6 | `in_inr` | Numeric | — | Manually entered INR-equivalent amount. Never overwritten by automated rates. |

**Canonical Column Order:**
`student_id, student_name, payment_date, amount, currency, in_inr`

*Important Schema Rules:*
- Original payment currency is preserved in `currency`.
- INR conversion is never done via third-party rate lookups. Unconverted foreign payments contribute 0 to INR financial summaries.

---

### 3.4 Tab 4: `ClassSessions` (8 Columns)
| # | Column Name | Type | Key | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | FK | Links to `Students.student_id`. |
| 2 | `student_name` | Text | — | Student name snapshot. |
| 3 | `schedule_date` | Date/Text | — | Scheduled class date (`YYYY-MM-DD` / `dd/mm/yyyy`). Formatted as plain text `@`. |
| 4 | `schedule_time` | Text | — | Scheduled start time in `Asia/Kolkata` (24-hour `HH:mm`, e.g. `18:00`). |
| 5 | `attendance_status` | Enum | — | `NOT_MARKED`, `PRESENT`, `ATTENDED`, `ABSENT`, `CANCELLED`, `CANCELLED_LATE`. |
| 6 | `session_status` | Enum | — | `SCHEDULED`, `COMPLETED`, `CANCELLED`. |
| 7 | `deduct_class` | Boolean | — | `TRUE` if class consumes package balance; `FALSE` otherwise. |
| 8 | `cancellation_reason` | Text | — | Reason for cancellation or rescheduling note. |

**Canonical Column Order:**
`student_id, student_name, schedule_date, schedule_time, attendance_status, session_status, deduct_class, cancellation_reason`

*Important Schema Rules:*
- **There is no session ID column and no stored end-time column** in Google Sheets.
- **Session Identity:** Sessions are identified by composite key `student_id__schedule_date__schedule_time` (or 1-based row index).
- **Derived End Time:** End time is dynamically derived as `schedule_time + Packages.class_duration`.
- **Consumed Balance Derivation:** The application counts sessions for that student where `deduct_class === true`. Remaining balance is `classes_purchased - consumed_classes`.

---

### 3.5 Tab 5: `MeetingLinks` (4 Columns)
| # | Column Name | Type | Key | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | FK | Links to `Students.student_id`. Primary key (1 row per student). |
| 2 | `student_name` | Text | — | Student name snapshot. |
| 3 | `meeting_link_1` | Text/URL | — | Primary virtual meeting room URL (Google Meet). |
| 4 | `meeting_link_2` | Text/URL | — | Secondary or backup virtual meeting room URL (Zoom). |

**Canonical Column Order:**
`student_id, student_name, meeting_link_1, meeting_link_2`

---

### 3.6 Tab 6: `StudentNotes` (5 Columns)
| # | Column Name | Type | Key | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | FK | Links to `Students.student_id`. |
| 2 | `student_name` | Text | — | Student name snapshot. |
| 3 | `note_date` | Date/Text | — | Date note was recorded (`YYYY-MM-DD` / `dd/mm/yyyy`). |
| 4 | `note_text` | Text | — | Pedagogical remarks, progress notes, or follow-up content. |
| 5 | `follow_up_date` | Date/Text | — | Optional follow-up target date (`YYYY-MM-DD` / `dd/mm/yyyy`). |

**Canonical Column Order:**
`student_id, student_name, note_date, note_text, follow_up_date`

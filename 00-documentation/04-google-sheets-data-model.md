# 04 — Google Sheets Data Model (Canonical Schema)

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** 04
- **Status:** Authoritative Datastore Specification
- **Version:** 4.0.0 (Strict Six-Table Canonical Architecture)
- **Canonical Spreadsheet:** `Private Class Dashboard` (`1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`)
- **Spreadsheet Owner:** `ashreya0502@gmail.com`

---

## 2. Canonical Data Architecture Principles

1. **Strictly Six Tables Only:**
   The entire application datastore consists of **exactly six Google Sheets tables**. No other active data tables exist.
2. **Schema Restrictions (Non-Negotiable):**
   Documentation and code must never invent, reference, or create any of the following as active Google Sheets tables:
   - `ClassSchedules` (Archived as `_Archived_ClassSchedules`)
   - `PackageHistory`
   - `StudentPayments`
   - `Attendance`
   - `SessionLogs`
   - `Educators` / `Teachers` / `Users`
   - `FeeObligations` (Permanently retired)
   - `Enrollments` (Permanently retired)
   - `AppConfig`, `ImportBatches`, `ImportRowResults` (Permanently retired)
3. **No `package_id` Column:**
   `Packages` has no `package_id` column. A package is uniquely associated with and retrieved by `student_id`.
4. **No `session_id` or Stored End-Time in `ClassSessions`:**
   `ClassSessions` has no `session_id` column and no stored end-time column. Individual sessions are identified by composite key `student_id__schedule_date__schedule_time` (or 1-based row index). Session end time is dynamically calculated using `schedule_time + Packages.class_duration`.
5. **Direct Relational Links:**
   All tables link directly to `Students` via `student_id`.

---

## 3. Authoritative Google Sheets Tables & Column Specifications

### 3.1 Table 1: `Students` (Exactly 9 columns)

| # | Column Name | Type | Required | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Unique, permanent student identifier (`STU_001` format). Primary key. |
| 2 | `student_name` | Text | Yes | Student's full display name. |
| 3 | `parent_name` | Text | Yes | Primary parent or guardian contact name. |
| 4 | `parent_phone` | Text | Yes | Primary phone number (WhatsApp/call). Prepend with `'` if starting with `+`. |
| 5 | `parent_email` | Text | No | Parent email address for communication. Independent of `student_email`. |
| 6 | `student_phone` | Text | No | Direct student phone number (optional). |
| 7 | `student_email` | Text | No | Direct student email for calendar invites (optional). |
| 8 | `subject` | Text | No | Enrolled subject or subjects (e.g. `Physics`, `AP Calculus BC`). |
| 9 | `status` | Enum | Yes | Student status: `ACTIVE`, `INACTIVE`, or `ARCHIVED`. Default `ACTIVE`. |

**Canonical Column Order:**
`student_id, student_name, parent_name, parent_phone, parent_email, student_phone, student_email, subject, status`

---

### 3.2 Table 2: `Packages` (Exactly 12 columns)

| # | Column Name | Type | Required | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. Primary retrieval key. |
| 2 | `student_name` | Text | Yes | Student name snapshot for spreadsheet readability. |
| 3 | `plan_type` | Enum/Text | Yes | Plan type: `PACKAGE`, `MONTHLY`, `YEARLY`, `PER_CLASS`. |
| 4 | `currency` | Text | Yes | Agreed currency code (e.g. `INR`, `USD`, `GBP`, `EUR`). Default `INR`. |
| 5 | `package_price` | Numeric | Yes | Total agreed price for package or periodic billing amount. |
| 6 | `per_class` | Numeric | No | Effective rate per individual class session. |
| 7 | `classes_purchased` | Integer | Yes | Total sessions purchased (positive integer). |
| 8 | `start_date` | Date/Text | Yes | Package commencement date (`YYYY-MM-DD` / `dd/mm/yyyy`). |
| 9 | `end_date` | Date/Text | No | Projected or agreed validity end date (`YYYY-MM-DD` / `dd/mm/yyyy`). |
| 10 | `next_due_date` | Date/Text | No | Next billing or renewal due date (derived by N-4 rule). |
| 11 | `class_duration` | Integer | Yes | Duration of each class session in minutes (default `60`). |
| 12 | `class_schedule` | Text | No | Human-readable recurring schedule (e.g. `Mon - 6:00 PM, Wed - 6:00 PM`). |

**Canonical Column Order:**
`student_id, student_name, plan_type, currency, package_price, per_class, classes_purchased, start_date, end_date, next_due_date, class_duration, class_schedule`

*Important Implementation Notes:*
- There is **no `package_id` column** in the sheet. The backend identifies and updates a student's package by matching `student_id` (or row index). Ephemeral `package_id` strings created in-memory by API handlers are mapped back to `student_id`.
- `class_schedule` is the authoritative storage for recurring weekly schedule patterns.

---

### 3.3 Table 3: `Payments` (Exactly 6 columns)

| # | Column Name | Type | Required | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. |
| 2 | `student_name` | Text | Yes | Student name snapshot. |
| 3 | `payment_date` | Date/Text | Yes | Date payment was received (`YYYY-MM-DD` / `dd/mm/yyyy`). |
| 4 | `amount` | Numeric | Yes | Amount received in original payment currency. Greater than zero. |
| 5 | `currency` | Text | Yes | Original payment currency (e.g. `INR`, `USD`, `GBP`). |
| 6 | `in_inr` | Numeric | No | Manually entered INR-equivalent amount. Never overwritten by automated rates. |

**Canonical Column Order:**
`student_id, student_name, payment_date, amount, currency, in_inr`

*Important Implementation Notes:*
- Original payment currency is strictly preserved in `currency`.
- INR conversion is never done via third-party rate lookups. If `currency === 'INR'`, `in_inr` equals `amount`. If foreign currency, `in_inr` is populated from the manually supplied value. If no manual `in_inr` exists, it contributes 0 to INR financial aggregations to avoid mixing currencies.

---

### 3.4 Table 4: `ClassSessions` (Exactly 8 columns)

| # | Column Name | Type | Required | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. |
| 2 | `student_name` | Text | Yes | Student name snapshot. |
| 3 | `schedule_date` | Date/Text | Yes | Scheduled class date (`YYYY-MM-DD` / `dd/mm/yyyy`). |
| 4 | `schedule_time` | Text | Yes | Scheduled start time in `Asia/Kolkata` (24-hour `HH:mm`, e.g. `18:00`). |
| 5 | `attendance_status` | Enum | Yes | `NOT_MARKED`, `PRESENT`, `ATTENDED`, `ABSENT`, `CANCELLED`, `CANCELLED_LATE`. |
| 6 | `session_status` | Enum | Yes | `SCHEDULED`, `COMPLETED`, `CANCELLED`. |
| 7 | `deduct_class` | Boolean | Yes | `TRUE` if class consumes package balance; `FALSE` otherwise. |
| 8 | `cancellation_reason` | Text | No | Reason for cancellation or rescheduling note. |

**Canonical Column Order:**
`student_id, student_name, schedule_date, schedule_time, attendance_status, session_status, deduct_class, cancellation_reason`

*Important Implementation Notes:*
- There is **no session ID column** and **no stored end-time column** in Google Sheets.
- **Session Identity:** Sessions are identified in memory and during API operations by composite key: `student_id__schedule_date__schedule_time` (e.g. `STU_001__2026-01-19__18:00`) or by 1-based `_rowIndex`.
- **Derived End Time:** End time is computed on the fly as `schedule_time + class_duration` (using `Packages.class_duration` for that student, defaulting to 60 minutes).
- **Consumed Balance Derivation:** The application counts sessions for that student where `deduct_class === true` (or `'TRUE'`). Remaining balance is `classes_purchased - consumed_classes`.

---

### 3.5 Table 5: `MeetingLinks` (Exactly 4 columns)

| # | Column Name | Type | Required | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. Primary key (1 row per student). |
| 2 | `student_name` | Text | Yes | Student name snapshot. |
| 3 | `meeting_link_1` | Text/URL | Yes | Primary virtual meeting room URL (e.g. Google Meet). |
| 4 | `meeting_link_2` | Text/URL | No | Secondary or backup virtual meeting room URL (e.g. Zoom). |

**Canonical Column Order:**
`student_id, student_name, meeting_link_1, meeting_link_2`

---

### 3.6 Table 6: `StudentNotes` (Exactly 5 columns)

| # | Column Name | Type | Required | Description |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Foreign key to `Students.student_id`. |
| 2 | `student_name` | Text | Yes | Student name snapshot. |
| 3 | `note_date` | Date/Text | Yes | Date note was recorded (`YYYY-MM-DD` / `dd/mm/yyyy`). |
| 4 | `note_text` | Text | Yes | Pedagogical remarks, progress notes, or follow-up content. |
| 5 | `follow_up_date` | Date/Text | No | Optional follow-up target date (`YYYY-MM-DD` / `dd/mm/yyyy`). |

**Canonical Column Order:**
`student_id, student_name, note_date, note_text, follow_up_date`

---

## 4. Header Normalization & Sheet Access Mechanics

1. **Header Row Location:** Header names are on Row 1. Data begins strictly on Row 2.
2. **Case-Sensitive Dynamic Resolution:** `HeaderMapper.gs` maps column names to 0-based row indexes dynamically by exact trimmed string matching. Code never relies on hardcoded column letters (e.g. "Column A").
3. **Date Normalization:**
   - On read, `HeaderMapper.gs` normalizes date strings formatted as `dd/mm/yyyy` (or Google Sheets Date objects) into ISO `yyyy-mm-dd`.
   - On write, `DateFormatService.gs` applies standard `dd/MM/yyyy` spreadsheet number formatting.
   - For `ClassSessions`, column 3 (`schedule_date`) and column 4 (`schedule_time`) use plain text format `@` to avoid timezone offset shifts during Google Sheets date parsing.

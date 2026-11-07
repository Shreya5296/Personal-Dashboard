# 05 — Business Rules and Workflows

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** 05
- **Status:** Authoritative Business Rules Specification
- **Version:** 4.0.0
- **Audience:** Developers, business logic reviewers, AI coding agents

---

## 2. Student Lifecycle & Status Rules

### 2.1 Student Creation
- Generated via 4-section modal in `StudentsPage`:
  1. **Personal Details:** Student name (required), phone (optional), email (optional), enrolled subject(s) (multi-select).
  2. **Parent Details:** Parent name (required), parent phone (required), parent email (optional).
  3. **Package Details:** Plan type, package price, classes purchased, class duration, per-class rate, start date.
  4. **Schedule Details:** Weekly recurring schedule slots (day of week, start time) and first class date.
- **Permanent Student ID:** Backend generates permanent sequential IDs in the format `STU_001`, `STU_002`, ..., `STU_026`. IDs are immutable and never reassigned.
- **Idempotent Retry:** If registration encounters an intermittent network failure, retrying with the same student name reuses the existing student record rather than creating a duplicate.

### 2.2 Student Status Classification (`studentStatusClassifier.ts`)
Students are categorized into **Active** and **Inactive** tabs:
- **Inactive Criteria (any of the following makes a student Inactive):**
  1. `status` column is explicitly set to `INACTIVE` or `ARCHIVED`.
  2. The student has a package where `classes_purchased > 0` and `remaining_classes <= 0` (package balance exhausted).
  3. The student's last completed class date occurred **$\ge 1$ calendar month ago** relative to the reference date (calculated using month-end clamping via `calculateOneCalendarMonthBefore`).
- **Active Criteria:**
  - `status === 'ACTIVE'`, has remaining classes ($> 0$), and has a completed class within the past month.
  - **Exception for New Students:** A student with **0 completed classes** remains **Active** even if their registration or package start date is in the past.

---

## 3. Package Lifecycle & Date Calculations

### 3.1 Package Terms
- **Plan Types:** `PACKAGE`, `MONTHLY`, `YEARLY`, `PER_CLASS`.
- **Per-Class Rate Recalculation:** Automatically calculated as $\text{Package Price} / \text{Classes Purchased}$. The rate is editable by the user; changing the package price or class count recalculates the per-class rate.
- **Class Duration:** Duration of each class session in minutes (default `60`). Stored in `Packages.class_duration`.

### 3.2 Recurring Schedule Storage (`class_schedule`)
- Recurring weekly schedules are stored directly inside `Packages.class_schedule` as a human-readable comma-separated string, e.g.:
  `Mon - 6:00 PM, Wed - 6:00 PM, Sat - 10:00 AM`
- Serialized by `_formatScheduleString` and parsed by `_parseScheduleString`.
- Day abbreviations: `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`.

### 3.3 Automatic Date Derivations
- **Package End Date:** Calculated by projecting `classes_purchased` occurrences along the configured recurring schedule days starting from `start_date`.
- **Next Fee Due Date (N-4 Rule):** For package renewals, `next_due_date` is automatically set to the date of the **4th session before package completion** ($\text{index} = \max(0, N - 5)$ in 0-based indexing).
- **Yearly Package Calculation:** For yearly plans, if class count is not specified, `_calcYearlyOccurrences` projects all schedule occurrences between `start_date` and `end_date` (defaulting to 1 year ahead).

---

## 4. Class Scheduling & Session Workflow

### 4.1 Session Identity & Mutation Architecture
- In `ClassSessions`, each row represents one scheduled or past session.
- **No `session_id` Column:** The sheet has exactly 8 columns. The application identifies sessions in memory and API payloads by composite key:
  $$\text{Composite Key} = \text{student\_id} + \text{"\_\_"} + \text{schedule\_date} + \text{"\_\_"} + \text{schedule\_time}$$
  where `schedule_date` is normalized to ISO `YYYY-MM-DD` and `schedule_time` is normalized to 24-hour `HH:mm` (e.g. `STU_001__2026-01-19__18:00`).
- **Row Index Priority & Fallback Strategy:**
  - When mutating sessions (`Classes_update`), if a 1-based `_rowIndex` is provided, the backend accesses the row directly via `sheet.getRange(rowNum, 1, ...)`.
  - Direct row index access includes a safety check: `updates.student_id === rec.student_id`. If the check fails or `_rowIndex` is omitted, the backend falls back to scanning all rows for the matching composite key (`student_id && schedule_date && schedule_time`).
- **Attendance Update Flow:**
  - `Classes_complete` first retrieves the session via `Classes_getById(spreadsheet, sid)`, which attaches `_rowIndex` to the session record.
  - It then executes `Classes_update` with `_rowIndex` and sets `attendance_status = 'PRESENT'`, `session_status = 'COMPLETED'`, and `deduct_class = true`.
- **Rescheduling & Session Identity:**
  - Rescheduling updates `schedule_date` and `schedule_time` in place on the targeted row. This immediately changes the session's composite key.
- **Cancellation & Restoration Workflow:**
  - `Classes_cancel` locates the session via `_rowIndex` or composite key and marks `session_status = 'CANCELLED'`.
  - If cancelled $< 4$ hours in advance without a waiver, `deduct_class = true` and `attendance_status = 'CANCELLED_LATE'`.
  - If cancelled $\ge 4$ hours in advance or explicitly waived, `deduct_class = false`, `attendance_status = 'CANCELLED'`, and the system automatically inserts a replacement session at the next recurring slot and updates `Packages.end_date`.
  - `Classes_restoreCredit` locates the cancelled session, verifies `deduct_class === true`, and resets it to `false`.
- **Duplicate Handling & Limitations:**
  - Duplicate scheduling is prevented on creation via `Classes_schedule` (overlap validation) and `Classes_batchSchedule` (in-memory unique key dictionary `existingKeys[date + '__' + time]`).
  - *Limitation on Identical Sessions:* If two rows inadvertently share the identical `student_id`, `schedule_date`, and `schedule_time`, composite key scanning will match and update only the *first* matching row. The second row can only be mutated if addressed directly by `_rowIndex`.
  - *Row Insertion/Deletion Risk:* If rows are manually inserted, deleted, or sorted directly inside Google Sheets while client-side state is active, client-held `_rowIndex` values will become stale. The backend student ID verification guard will prevent cross-student mutations, but could misdirect updates to an unintended session of the same student.

> [!WARNING]
> **CRITICAL ROW-INDEX SAFETY LIMITATION & OPERATIONAL RULE:**
> A stale `_rowIndex` can target a different session belonging to the same student after manual row insertion, deletion, or sorting directly in Google Sheets. While the backend's `updates.student_id === rec.student_id` guard prevents cross-student data corruption, it cannot detect if row positions shifted among sessions of the same student.
> **Operational Rule:** **Never manually sort, insert, delete, or rearrange `ClassSessions` rows while operations relying on cached row indices may be in progress.** Any direct spreadsheet maintenance must only occur during maintenance windows when all client sessions are inactive.
- **Derived End Time & Class Duration:**
  - There is no stored end-time column in the sheet. Session end time is derived dynamically as:
    $$\text{End Time} = \text{schedule\_time} + \text{class\_duration}$$
  - `class_duration` is configured **per package** on `Packages.class_duration` (valid values: 30, 40, or 60 minutes). It is not globally uniform.
  - `ConfigService.DEFAULT_CLASS_DURATION_MINUTES` (`60`) serves strictly as a server-side fallback if a package does not specify a duration.
  - Settings Regional Preferences only configures application timezone and display currency; it does not configure class duration.
- **Chronological Session Numbering:** Calculated dynamically for each student by sorting sessions chronologically (`#01 / 48`, `#02 / 48`).

### 4.2 Conflict Prevention
- Before inserting a new session, the backend checks for overlapping sessions for the same student.
- Duplicate scheduling at the exact same student + date + start time is rejected with `SCHEDULING_CONFLICT`.

---

## 5. Attendance & Class Credit Deduction

### 5.1 Deduction Rules
Class balance is consumed only when `ClassSessions.deduct_class` is `TRUE`:
1. **`PRESENT` / `ATTENDED`:**
   - Marks `session_status = COMPLETED`, `attendance_status = PRESENT`.
   - Automatically sets `deduct_class = true`.
2. **`ABSENT` / `NO_SHOW`:**
   - Prompts the administrator. If unexcused, `deduct_class = true`. If excused, `deduct_class = false`.
3. **`NOT_MARKED`:**
   - Default state for scheduled future classes. `deduct_class = false`.

### 5.2 Cancellation Policy & Automatic Replacement
When a class session is cancelled (`Classes_cancel`):
1. **Late Cancellation Threshold:**
   - If cancelled **$< 4$ hours** before scheduled class time and credit is not waived:
     - `session_status = CANCELLED`, `attendance_status = CANCELLED_LATE`, `deduct_class = true`.
     - Consumes 1 class credit.
2. **Advance Cancellation or Credit Waived:**
   - If cancelled $\ge 4$ hours in advance or explicitly waived (`credit_waiver: true` or "waiv"/"excused" in reason):
     - `session_status = CANCELLED`, `attendance_status = CANCELLED`, `deduct_class = false`.
     - Credit is preserved.
3. **Automatic Replacement Scheduling:**
   - When a session is cancelled with `deduct_class = false`, the system scans the student's recurring schedule, finds the next available open slot following their latest scheduled session, and inserts a new replacement `ClassSessions` record.
   - The package `end_date` is extended accordingly.

### 5.3 Class Balance Calculation
- **Consumed Classes:** Count of all `ClassSessions` rows for that student where `deduct_class === true` (or `'TRUE'`).
- **Remaining Classes:** $\max(0, \text{classes\_purchased} - \text{consumed\_classes})$.
- **Exhausted Status:** `remaining_classes <= 0`.

---

## 6. Calendar Display & 3-Color Event Classification

### 6.1 Multi-View Time Grid
- Supports **Day View**, **Week View** (7 days, 06:00 to 23:00 grid), and **Month View** in timezone `Asia/Kolkata`.
- Event positioning accurately maps local start time and duration (e.g. 30-min duration renders 26px height).

### 6.2 Unified 3-Color Event Status Logic (`calendarClassification.ts`)
Every calendar slot is classified into one of three visual categories:
1. **`PAST_COMPLETED` (Soft Muted Green):**
   - Applied to past sessions where `session_status === 'COMPLETED'` or `attendance_status === 'PRESENT'`.
2. **`CANCELLED` (Soft Muted Red):**
   - Applied to explicitly cancelled sessions (`session_status === 'CANCELLED'`, `attendance_status === 'CANCELLED'`, `ABSENT`, `NO_SHOW`), OR any past session that was not completed.
3. **`UPCOMING` (Amber / Warm Accent):**
   - Applied to scheduled future sessions (dated or recurring placeholders).

### 6.3 Hybrid Event Synthesis
- Dated class sessions take precedence.
- For active students with recurring schedule rules, recurring slots on the visible week that have no corresponding dated session are rendered as upcoming recurring placeholders, preventing double-booking.

---

## 7. Financial Calculations & Multi-Currency Rules

### 7.1 Consolidated Financial Metrics (`ReportService.gs`)
1. **Total Agreed Invoiced Value:** Sum of `package_price` across active student packages in INR.
2. **Collected Earnings:** Sum of received payments in INR.
3. **Total Outstanding Balance:** Sum across students of $\max(0, \text{Billed INR} - \text{Paid INR})$.

### 7.2 Multi-Currency Handling
- Payments and packages retain their original currency code (`INR`, `USD`, `GBP`, `EUR`).
- **Domestic Transactions (`INR`):** Amount is used directly.
- **Foreign Transactions (non-`INR`):**
  - Uses the manually entered `in_inr` value.
  - If a foreign payment has no valid manual `in_inr`, it contributes **`0`** to INR totals.
  - The application **never** fetches external automated exchange rates to prevent financial drift or rate discrepancy.
- **Debtor Balance Insulation:** Overpayment by one student in foreign or domestic currency never offsets another student's debt.

---

## 8. Meeting Links & Student Notes

### 8.1 Meeting Links
- Each student has up to two meeting links stored in `MeetingLinks`:
  - `meeting_link_1`: Primary meeting link (typically Google Meet).
  - `meeting_link_2`: Secondary or backup meeting link (typically Zoom).
- Automated platform detection classifies URLs and applies platform badges.
- One-click button launches the room; copy action provides subtle visual confirmation.

### 8.2 Student Notes
- Stored in `StudentNotes`: `student_id, student_name, note_date, note_text, follow_up_date`.
- Allows pedagogical notes, student progress tracking, and scheduled follow-up dates displayed on the dashboard.

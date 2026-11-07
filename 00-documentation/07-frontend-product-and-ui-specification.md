# 07 — Frontend Product and UI Specification

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** 07
- **Status:** Authoritative Frontend UI Specification
- **Version:** 4.0.0
- **Audience:** Frontend engineers, UI designers, AI coding agents

---

## 2. Layout Structure & Global Navigation

The application uses a persistent two-panel shell (`AppShell.tsx`):
1. **Left Sidebar (`Sidebar.tsx`):**
   - Brand title: `Student Manager` / `Personal Dashboard`.
   - Navigation Items:
     - 📊 **Dashboard** (`dashboard`)
     - 📅 **Calendar** (`calendar`)
     - 🎓 **Students** (`students`)
     - ⏱️ **Class Schedule** (`classes`)
     - 💰 **Finances** (`finances`)
     - 🔗 **Meeting Links** (`meeting-links`)
   - Footer: Authenticated user avatar, display name, and email.
   - Mobile: Responsive overlay sidebar with backdrop and toggle.
2. **Top Bar (`TopBar.tsx`):**
   - Left: Mobile hamburger menu toggle.
   - Center/Left: "Welcome Back, [User]!" greeting.
   - Right: Live updating date and 12-hour AM/PM clock formatted in `Asia/Kolkata` (`useLiveHeaderTime.ts`).
   - Far Right: `AccountDropdown.tsx` with user initial avatar, profile details, Settings link, and Sign Out button.

---

## 3. Screen Specifications

### 3.1 Dashboard (`DashboardPage.tsx`)
- **TopBar Metrics (`DashboardSummary.tsx`):**
  - Active Students count.
  - Upcoming Classes (next 7 days).
  - Total Outstanding Fees in INR.
- **Today's Classes (`TodayClassesSection.tsx`):**
  - Displays scheduled sessions for current date in `Asia/Kolkata`.
  - Shows student name, enrolled subject, scheduled 12-hour time (e.g. `6:00 PM – 7:00 PM`).
  - **Join Class Button:** Prominent green button linking directly to the student's meeting URL.
- **Weekly Schedule (`DashboardCalendar.tsx`):**
  - 7-day compact grid showing scheduled class slots.
- **Things That Need Attention (`ThingsThatNeedAttention.tsx`):**
  - Displays actionable alert cards for active students with:
    - Missing meeting links (warning).
    - Missing recurring schedules (warning).
    - Low package balance ($\le 4$ classes remaining) prompting package renewal.

---

### 3.2 Calendar (`CalendarPage.tsx`)
- **Controls Bar (`CalendarControlsBar.tsx`):**
  - View switchers: **Day**, **Week**, **Month**.
  - Date navigation: Previous, Next, and "Today" button.
  - Date range display in `Asia/Kolkata`.
- **Weekly Time Grid (`WeeklyTimeGrid.tsx`):**
  - 7-day vertical columns (Monday through Sunday).
  - Time slots: 06:00 to 23:00 (hourly grid lines).
  - Exact event positioning based on local time and duration.
- **Unified 3-Color Event Status Logic:**
  - 🟢 **Soft Muted Green (`PAST_COMPLETED`):** Past session marked completed or attended.
  - 🔴 **Soft Muted Red (`CANCELLED`):** Explicitly cancelled session, or uncompleted past session.
  - 🟡 **Amber / Warm Accent (`UPCOMING`):** Scheduled future class or recurring slot placeholder.
- **Interaction:** Clicking an event opens session attendance details or meeting room link.

---

### 3.3 Students Directory (`StudentsPage.tsx`)
- **Status Tabs:** **All Students**, **Active** (default), **Inactive**.
- **Search Bar:** Real-time debounced search by student name or subject.
- **Action Button:** `+ Add Student` opening the 4-section registration modal.
- **Directory Table (`StudentRow.tsx`):**
  - Student Name (with red Inactive badge if inactive).
  - Subject(s).
  - Recurring Schedule summary.
  - Class Progress bar (`consumed / purchased`, e.g. `01 / 48`).
  - Row click expands inline details.
- **Inline Expandable Details (`StudentExpandedDetails.tsx`):**
  - Personal contact info (student phone, student email).
  - Parent contact info (parent name, phone, email).
  - Configured Meeting Links with 1-click launch and copy buttons.
  - Package terms (plan type, rate, validity dates).
  - Action buttons: **Edit Student**, **Add Note**.
- **Add Student Modal (`AddStudentModal.tsx`):**
  - Section 1: Student Details & Multi-Subject Selector (chips with add/remove).
  - Section 2: Parent Details.
  - Section 3: Package Details with auto-calculated editable per-class rate.
  - Section 4: Schedule Details (multi-day recurring entries & first class date).
- **Edit Student Modal (`EditStudentModal.tsx`):**
  - Modal with scrolling body lock.
  - Edit personal details, meeting links, package terms, and recurring schedule.

---

### 3.4 Class Schedule (`ClassesPage.tsx`)
- **Student Filter:** Dropdown to isolate sessions for a specific student or view all.
- **Auto-Schedule Button:** Opens auto-schedule generator for a student.
- **Sessions Table:**
  - Date (`dd/mm/yyyy`) and 12-hour Time (e.g. `10:00 AM`).
  - Student Name and Subject.
  - Attendance Status badge (`PRESENT`, `ABSENT`, `NOT_MARKED`, `CANCELLED`).
  - Class Deduction badge (`Deducted` vs `Credit Preserved`).
  - **Inline Attendance Controls (`AttendanceControl.tsx`):**
    - `Present`: Marks attended and deducts credit.
    - `Absent`: Prompts deduction preference.
    - `Cancel`: Prompts cancellation reason and waiver.
    - `Restore Credit`: Restores credit if mistakenly deducted.

---

### 3.5 Finances (`FinancesPage.tsx`)
- **Financial Metric Cards (`FinanceSummaryCards.tsx`):**
  - **Total Invoice:** Agreed package billing value in INR.
  - **Collected Earnings:** Actual payments received in INR.
  - **Total Outstanding:** Uncollected student debt in INR.
- **Tabs:**
  1. **Student Balances Tab (`StudentBalanceTable.tsx`):**
     - Student Name, Total Invoiced, Total Paid, Net Outstanding Balance, Payment Count.
     - **Add Payment Button:** Opens `AddPaymentModal.tsx` prefilled with selected student, payment date picker, amount, currency, and manual `in_inr`.
  2. **Payment History Tab (`FinancialHistoryTable.tsx`):**
     - Ascending chronological list of all payments.
     - Search by student name or reference number.
     - Date range filter.
     - **Export to CSV:** Client-side CSV generation of filtered payment records.

---

### 3.6 Meeting Links (`MeetingLinksPage.tsx`)
- **Student Meeting Links Table (`MeetingLinkTable.tsx`):**
  - Student Name.
  - Primary Meeting Link (Google Meet badge, clickable room button, copy button).
  - Secondary Meeting Link (Zoom / custom badge, clickable room button, copy button).
  - Actions: Edit links or delete slot link.
- **Add / Edit Modal (`MeetingLinkModal.tsx`):**
  - Student selection, Primary Room URL, Secondary Room URL with scheme validation.

---

### 3.7 Settings (`SettingsPage.tsx`)
- Displays system time zone (`Asia/Kolkata`), default currency (`INR`), and default duration.

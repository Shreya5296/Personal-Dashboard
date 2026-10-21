# Schema Redesign: Owner Decisions & Policy Confirmation

**Document Version:** 1.0.0  
**Status:** Awaiting Project Owner Confirmation  
**Date:** October 21, 2026

---

## 1. Overview

Before modifying the master spreadsheet schema, deploying backend schema adapters, or migrating live records, the following **7 operational and business decisions** require your explicit approval.

---

### Decision 1: Working Tab Structure (6 Visible Tabs + 4 Hidden Operational Tabs)

* **Proposed Visible Tabs (6):**
  1. `Students` (Directory, parent contacts, subjects, active status)
  2. `Packages` (Course agreements, prepaid packages, monthly/yearly plans, next due dates)
  3. `ClassSessions` (Calendar, attendance tracking, credit deductions)
  4. `FeeObligations` (Invoices, billing demands, outstanding balances)
  5. `Payments` (Immutable receipt ledger, cash/UPI records, partial payments)
  6. `MeetingLinks` (Primary and backup virtual room URLs)
* **Operational Tabs to Hide (4):**
  `AuditLog`, `ImportBatches`, `ImportRowResults`, `AppConfig` will remain active in the spreadsheet for backend logging and import reconciliation, but will be hidden from the bottom tab bar.
* **Legacy `Enrollments` Tab:**
  Retained intact and un-deleted.
* **Owner Action:** Approve reducing visible daily tabs to 6 and hiding the 4 internal tabs.

---

### Decision 2: Multiple Fee Models & Package Structures

* **Supported Billing Models:**
  1. **Prepaid Class Packages:** e.g., 10 classes for ₹12,000. Balance tracks down from 10 to 0 as lessons occur.
  2. **Monthly Recurring Subscriptions:** e.g., ₹8,000/month. Auto-generates monthly fee obligations; class count can be fixed (e.g. 8 classes/mo) or unlimited.
  3. **Yearly Subscriptions:** e.g., ₹90,000/year billed annually with milestone tracking.
  4. **Per-Class Billing:** e.g., ₹1,500 charged per completed session, invoiced at the end of the month.
* **Field Additions in `Packages`:**
  - `plan_type` (`PACKAGE`, `MONTHLY`, `YEARLY`, `PER_CLASS`)
  - `billing_frequency` (`ONE_OFF`, `MONTHLY`, `YEARLY`, `PER_CLASS`)
  - `per_class_rate` (Unit session rate)
  - `next_due_date` (Recurring invoice milestone date)
* **Owner Action:** Confirm that these 4 billing models satisfy all your current and planned tutoring arrangements.

---

### Decision 3: Explicit Attendance & Class Credit Deduction Policy

How should class credits be deducted or preserved based on session attendance?

* **Recommended Business Rules:**
  1. **Scheduled Class:** `credit_deducted = 0`. Credits are **never** deducted in advance while a class is merely scheduled.
  2. **Completed Class (`ATTENDED`):** Teacher and student attend $\rightarrow$ `credit_deducted = 1`.
  3. **Student Absent with Notice (`ABSENT_EXCUSED`):** Student gave $\ge$ 24 hours notice $\rightarrow$ `credit_deducted = 0`. Credit is preserved for a future rescheduled class.
  4. **Student Absent without Notice (`ABSENT_UNEXCUSED` / No-Show):** Student missed without advance notice $\rightarrow$ `credit_deducted = 1`. Class slot was reserved and tutor attended.
  5. **Teacher Cancelled / Rescheduled:** `credit_deducted = 0`. No penalty to student.
  6. **Administrative Credit Restoration:** If a credit was erroneously deducted, an explicit credit restoration session record is logged with `credit_deducted = -1`, which automatically recalculates the remaining balance upward by 1.
* **Owner Action:** Confirm or adjust the proposed attendance and credit deduction rules.

---

### Decision 4: Financial Ledger Invariants (Partial Payments & Immutability)

* **Partial Payments:** A single fee obligation (e.g. ₹12,000) can receive multiple partial payments (e.g. ₹5,000 on Oct 1st, ₹7,000 on Oct 15th). The fee status automatically transitions from `OPEN` $\rightarrow$ `PARTIALLY_PAID` $\rightarrow$ `PAID`.
* **Immutable Payment History:** Payments are **never** merged into student rows or silently updated. Corrections must be handled by recording an explicit `VOID` transaction with a reason, preserving a clear audit trail.
* **Owner Action:** Confirm the preservation of the immutable transaction ledger and support for partial payments.

---

### Decision 5: Student Directory & Contact Details

* **Single Full Name Field:** Student names will be stored as `student_name` (e.g. "Aarav Sharma") rather than separate first/last name columns.
* **Primary Contacts:** Standardized to `parent_name`, `parent_phone`, `student_phone`, `parent_email`, and `student_email`.
* **Subject Tracking:** A new `subject` column (e.g. "Grade 10 Math", "Physics") will be added to the student directory for immediate context.
* **Owner Action:** Confirm the simplified student contact fields.

---

### Decision 6: Treatment of Legacy `Enrollments` Tab

* **Analysis:** Historically, `Enrollments` served as an intermediate link between students and courses. In the simplified 6-tab model, `Packages` acts as the single authoritative course agreement.
* **Recommendation:** Keep `Enrollments` untouched during this phase. Do not delete or rename it until real data has been imported and validated.
* **Owner Action:** Approve keeping `Enrollments` intact as an archive tab.

---

### Decision 7: Pre-Launch Backup & Test Data Cleanup Authorization

* **Current Sheet State:** The live Google Sheet contains synthetic test rows created during automated E2E tests.
* **Recommended Next Steps After Your Approval:**
  1. Create a complete spreadsheet copy: `Personal Dashboard — Pre-Migration Backup`.
  2. Deploy dual-read backend adapters to Apps Script.
  3. Run the header-preserving row cleanup script to clear synthetic test rows (preserving Row 1 headers).
  4. Import your real student roster.
* **Owner Action:** Authorize taking the pre-launch backup and executing safe synthetic test data cleanup.

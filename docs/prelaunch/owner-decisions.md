# Pre-Launch Decisions for Project Owner Approval

**Document Version:** 1.0.0  
**Status:** Pending Project Owner Decisions  
**Date:** October 21, 2026  
**Canonical Scope:** Personal Dashboard (Zero-GCP, Google Sheets + Google Apps Script + React/Vite)

---

## Overview

All 16 unit and integration test suites (73 tests) and end-to-end browser suites are verified against the live Google Apps Script `@17` backend and live Google Spreadsheet. Zero real student data has been imported or modified.

To streamline daily operations and eliminate visual spreadsheet clutter, this document presents **6 clear, numbered decisions** for your approval prior to production launch, Vercel deployment, and Phase 11 data migration.

---

### Decision 1: Google Sheets Tab Count and Visibility (12 Tabs -> 7 Visible Tabs)

* **Current Architecture:** 12 tabs (`Students`, `Enrollments`, `Packages`, `FeeObligations`, `Payments`, `ClassSessions`, `MeetingLinks`, `StudentNotes`, `AuditLog`, `ImportBatches`, `ImportRowResults`, `AppConfig`).
* **Problem:** Managing 12 open tabs in Google Sheets creates visual clutter and risks accidental edits to internal system logs.
* **Recommendation:**
  1. **Hide 4 Operational Tabs:** Right-click and hide `AuditLog`, `ImportBatches`, `ImportRowResults`, and `AppConfig` in Google Sheets. The Apps Script backend will continue reading/writing to them with zero code disruption.
  2. **Consolidate `Enrollments` into `Packages`:** Fold formal enrollment boundaries directly into the `Packages` tab (since tutoring agreements are structured around class packages).
* **Resulting Daily Working Tabs (7 Tabs Total):**
  1. `Students` (Student & Parent Directory)
  2. `Packages` (Course Blocks & Class Credits)
  3. `FeeObligations` (Fee Invoices & Billing Demands)
  4. `Payments` (Cash & UPI Transaction Ledger)
  5. `ClassSessions` (Schedule & Attendance)
  6. `MeetingLinks` (Video Room URLs)
  7. `StudentNotes` (Progress & Parent Discussion Logs)
* **Owner Action:** Approve reducing visible tabs to 7 and hiding operational tabs.

---

### Decision 2: Student and Parent Information Field Consolidation

* **Current State:** Student form captures `full_name`, `email`, `phone`, `parent_name`, `parent_phone`. The underlying sheet has additional unpopulated columns: `preferred_name`, `date_of_birth`, `city`, `parent_guardian_relationship`, `secondary_phone`.
* **Recommendation:**
  1. **Retain Canonical Fields in UI:** `Full Name` (required), `Student Email` (optional), `Student Phone` (optional), `Parent Name` (required), `Parent Phone` (optional).
  2. **Schema Invariant:** Retain `date_of_birth`, `city`, and `relationship` in the Google Sheet schema as optional columns so future reporting or grade tracking remains possible without breaking backwards compatibility.
  3. **Field Naming Clarity:** Standardize internal naming to `primary_phone` and `parent_phone`.
* **Owner Action:** Confirm student contact model (single primary student phone + primary parent phone).

---

### Decision 3: Package, Enrollment, Fee, and Payment Fields

* **Current State:** Separate `Enrollments` and `Packages` tabs require double-entry when setting up a student's course.
* **Recommendation:**
  1. **Canonical Class Block Entity:** Use `Packages` as the single authoritative purchasing entity (`package_name`, `total_classes`, `package_price`, `start_date`, `expiry_date`).
  2. **Fee Invoicing:** `FeeObligations` records `obligation_description`, `amount_due`, `due_date`, `status` (`OPEN`, `PARTIALLY_PAID`, `PAID`, `VOID`).
  3. **Strict Payment Ledger Invariant:** Maintain `Payments` as an immutable individual transaction ledger (`amount`, `payment_method`, `payment_date`, `transaction_reference`, `idempotency_key`, `status`). **Never merge payment transactions directly into student rows.**
* **Owner Action:** Approve using `Packages` as the single course agreement entity and preserving the transaction-level payment ledger.

---

### Decision 4: Class Scheduling and Attendance Credit Safeguards

* **Current State:** Scheduling records `class_title`, `scheduled_start`, `duration_minutes`, `attendance_status`, and `class_credit_effect`.
* **Recommendation:**
  1. Keep automated credit deduction: marking attendance as `ATTENDED` decrements 1 class from the student's active package.
  2. Keep credit restoration safeguard: marking `ABSENT_EXCUSED` or cancelling with notice preserves the student's credit balance (`NO_CONSUME`).
* **Owner Action:** Confirm that excused absences should preserve class credits.

---

### Decision 5: Safe Pre-Launch Test Record Cleanup

* **Current State:** The live Google Sheet contains 27 synthetic test student records, 8 fee obligations, 3 payment transactions, 3 packages, and 2 class sessions created during automated E2E testing.
* **Proposed Procedure:**
  1. Duplicate the current Google Sheet to create a backup snapshot: `Class Dashboard (Pre-Launch Synthetic Snapshot)`.
  2. Run the automated header-preserving truncation script to clear rows `2+` on `Students`, `FeeObligations`, `Payments`, `Packages`, `ClassSessions`, `MeetingLinks`, and `StudentNotes`.
  3. Preserve all Row 1 canonical header columns.
* **Owner Action:** Authorize running the safe header-preserving cleanup script before importing real students.

---

### Decision 6: Production Access Key & Vercel Authorization

* **Current State:** Development/test access key is currently active in Apps Script Script Properties (`123456`).
* **Recommendation:**
  1. Set your final private, high-entropy `ADMIN_AUTH_KEY` in Google Apps Script (**Project Settings > Script Properties**).
  2. Authorize deployment of the static frontend bundle to Vercel with environment variable:
     `VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w/exec`
  3. Authorize initiating Phase 11 (Controlled Data Migration) with your real student spreadsheet.
* **Owner Action:** Provide production `ADMIN_AUTH_KEY` and authorize Vercel deployment.

---

## 7. Next Steps After Owner Approval

1. **Execute Level 1 & Level 2 Spreadsheet Simplification:** Hide operational tabs in Google Sheets UI and consolidate `Enrollments` into `Packages`.
2. **Execute Safe Test Data Cleanup:** Take pre-launch snapshot and clear synthetic test rows.
3. **Deploy Frontend to Vercel:** Connect Git repository to owner Vercel project and configure environment variables.
4. **Phase 11 Production Data Migration:** Run live import pipeline against owner's real student roster.

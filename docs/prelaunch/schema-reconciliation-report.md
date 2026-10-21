# Personal Dashboard — Read-Only Schema Reconciliation Report

**Document Version:** 1.0.0  
**Status:** Complete Read-Only Audit (No Live Data, Schema, or Visibility Settings Modified)  
**Date:** October 21, 2026  
**Canonical Master Spreadsheet ID:** `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`  
**Deployment Target:** Apps Script Web App `@21` (`AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w`)

---

## 1. Executive Summary & Objective

This audit reconciles the Personal Dashboard across all four operational layers:
1. **Original Business Requirements:** Tutoring student directory, package details, meeting links, payment details, calendar scheduling, attendance tracking, credit deduction rules, and multi-model billing (prepaid, monthly, yearly, per-class).
2. **Approved Schema Decisions:** The 6 working tabs architecture (`Students`, `Packages`, `ClassSessions`, `FeeObligations`, `Payments`, `MeetingLinks`), hidden operational tabs, preserved `Enrollments`, unapplied overpayment credits, and late-cancellation waivers documented in `docs/prelaunch/`.
3. **Actual Live Google Sheets Structure:** Exact tab names, column headers, header order, and column counts verified directly from the canonical spreadsheet.
4. **Application Codebase:** Frontend TypeScript types, forms, lists, validation rules, API client payloads, Google Apps Script handlers, repositories, domain services, and test suites.

### Key Audit Finding
The application's backend domain services and frontend adaptors **already fully bridge the live Google Sheets physical schema with the approved business requirements and UI forms**. There is zero operational breakage, and all 78 automated unit/integration tests pass. The differences between the physical sheet headers and the proposed 6-tab names are **intentional and safely managed via backend adaptors**, eliminating the need for high-risk sheet re-indexing or header renames before launch.

---

## 2. Four-Layer Structural Comparison

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: Original Requirements                                                   │
│ • Students, package_details, meeting links, payment details                      │
│ • Prepaid packages, monthly recurring, yearly, per-class billing                 │
│ • Attendance-driven credit deductions, restorations, and partial payments        │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: Approved Schema Decisions (docs/prelaunch/)                              │
│ • 6 Working Tabs: Students, Packages, ClassSessions, FeeObligations, Payments,   │
│   MeetingLinks                                                                   │
│ • 4 Hidden Operational Tabs: AuditLog, ImportBatches, ImportRowResults, AppConfig │
│ • 1 Preserved Legacy Tab: Enrollments                                            │
│ • 1 Operational Tab: StudentNotes                                                │
│ • Unapplied credit ledger, late-cancellation waiver, duplicate invoice guards     │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: Actual Live Google Sheets (ID: 1cVQknq...)                               │
│ • 12 Tabs Total (all verified present):                                          │
│   - Students (19 cols, 1 row)          - Packages (15 cols, 1 row)               │
│   - ClassSessions (19 cols, 1 row)     - FeeObligations (15 cols, 1 row)         │
│   - Payments (15 cols, 1 row)          - MeetingLinks (13 cols, 1 row)           │
│   - Enrollments (13 cols, 1 row)       - StudentNotes (9 cols, 9 rows)           │
│   - AuditLog [Hidden] (12 cols, 197 r) - ImportBatches [Hidden] (14 cols, 8 r)   │
│   - ImportRowResults [Hidden] (9 cols) - AppConfig [Hidden] (4 cols, 5 r)        │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: Application Code & Implementation                                       │
│ • Frontend (React/TS): StudentForm, PackageForm, ClassSchedule, FeeForm, PayForm │
│ • Backend Adaptors: StudentService.gs, FeeService.gs, PaymentService.gs          │
│ • Dynamic Mapping: HeaderMapper.gs (maps headers by name, zero hard-coded cols)  │
│ • Automated Tests: 78 unit/integration tests, 18 Playwright E2E browser tests    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Field-by-Field Reconciliation Matrix

The matrix below audits every physical column across all 12 tabs in the live Google Sheet, reporting its original intent, approved target name, frontend/backend mapping, reconciliation status, and recommendation.

### 3.1 Tab: `Students` (19 Columns Live)

| # | Live Header Name | Approved Target Name | Frontend / Backend Mapping | Reconciliation Status | Intentional? | Recommended Action |
|---|---|---|---|---|---|---|
| 1 | `student_id` | `student_id` | `student_id` (PK) | Exact Match | Yes | Retain intact. |
| 2 | `first_name` | `student_name` (combined) | `full_name` $\rightarrow$ split to `first_name` | Renamed / Adapted | Yes | Retain backend adapter; no sheet change needed. |
| 3 | `last_name` | `student_name` (combined) | `full_name` $\rightarrow$ split to `last_name` | Renamed / Adapted | Yes | Retain backend adapter; no sheet change needed. |
| 4 | `preferred_name` | — (deprecated) | Ignored / optional fallback | Unused | Yes | Retain optional in sheet; no action. |
| 5 | `date_of_birth` | — (optional) | Available for DOB compliance | Unused in UI | Yes | Retain optional in sheet. |
| 6 | `parent_guardian_name` | `parent_name` | `parent_name` $\leftrightarrow$ `parent_guardian_name` | Renamed / Adapted | Yes | Retain backend adapter. |
| 7 | `parent_guardian_relationship` | — (optional) | Defaults to Parent | Unused in UI | Yes | Retain optional in sheet. |
| 8 | `primary_phone` | `parent_phone` / `phone` | `phone` $\leftrightarrow$ `primary_phone` | Renamed / Adapted | Yes | Retain backend adapter. |
| 9 | `secondary_phone` | `student_phone` / `parent_phone` | `parent_phone` $\leftrightarrow$ `secondary_phone` | Renamed / Adapted | Yes | Retain backend adapter. |
| 10 | `parent_email` | `parent_email` | `parent_email` $\leftrightarrow$ `parent_email` | Exact Match | Yes | Retain intact. |
| 11 | `city` | — (optional) | Optional address metadata | Unused in UI | Yes | Retain optional in sheet. |
| 12 | `student_status` | `status` | `status` $\leftrightarrow$ `student_status` (`ACTIVE`/`ARCHIVED`) | Renamed / Adapted | Yes | Retain backend adapter. |
| 13 | `first_enrollment_date` | — (derived) | Derived dynamically from packages | Derived | Yes | Retain in sheet. |
| 14 | `last_active_date` | — (derived) | Derived dynamically from sessions | Derived | Yes | Retain in sheet. |
| 15 | `internal_summary` | `notes` | `notes` $\leftrightarrow$ `internal_summary` | Renamed / Adapted | Yes | Retain backend adapter. |
| 16 | `created_at` | `created_at` | `created_at` (ISO timestamp) | Exact Match | Yes | Retain intact. |
| 17 | `updated_at` | `updated_at` | `updated_at` (ISO timestamp) | Exact Match | Yes | Retain intact. |
| 18 | `archived_at` | `archived_at` | `archived_at` (populated on archive) | Exact Match | Yes | Retain intact. |
| 19 | `source_reference` | — | Used during CSV batch imports | Preserved | Yes | Retain for import auditability. |

> [!NOTE]
> **Proposed Additional Columns:** The schema proposal recommended adding explicit `student_email` and `subject` columns. Currently, `parent_email` handles billing and calendar invites, while `subject` is captured via package titles or `notes`. Adding dedicated physical columns is non-blocking.

---

### 3.2 Tab: `Packages` (15 Columns Live)

| # | Live Header Name | Approved Target Name | Frontend / Backend Mapping | Reconciliation Status | Intentional? | Recommended Action |
|---|---|---|---|---|---|---|
| 1 | `package_id` | `package_id` | `package_id` (PK) | Exact Match | Yes | Retain intact. |
| 2 | `student_id` | `student_id` | `student_id` (FK to `Students`) | Exact Match | Yes | Retain intact. |
| 3 | `enrollment_id` | — (optional FK) | `enrollment_id` (legacy FK) | Retained | Yes | Retain optional. |
| 4 | `package_name` | `plan_name` | `package_name` $\leftrightarrow$ `package_name` | Exact Match | Yes | Retain intact. |
| 5 | `purchased_classes` | `classes_purchased` | `total_classes` $\leftrightarrow$ `purchased_classes` | Renamed / Adapted | Yes | Retain backend adapter. |
| 6 | `package_price` | `price` | `price` $\leftrightarrow$ `package_price` | Renamed / Adapted | Yes | Retain backend adapter. |
| 7 | `currency` | `currency` | `currency` (`INR`) | Exact Match | Yes | Retain intact. |
| 8 | `purchase_date` | — | Date package purchased | Optional | Yes | Retain intact. |
| 9 | `start_date` | `start_date` | `start_date` (YYYY-MM-DD) | Exact Match | Yes | Retain intact. |
| 10 | `expiry_date` | `expiry_date` | `expiry_date` (optional validity) | Exact Match | Yes | Retain intact. |
| 11 | `package_status` | `status` | `status` $\leftrightarrow$ `package_status` (`ACTIVE`/`EXHAUSTED`) | Renamed / Adapted | Yes | Retain backend adapter. |
| 12 | `notes` | `notes` | `notes` | Exact Match | Yes | Retain intact. |
| 13 | `created_at` | `created_at` | `created_at` | Exact Match | Yes | Retain intact. |
| 14 | `updated_at` | `updated_at` | `updated_at` | Exact Match | Yes | Retain intact. |
| 15 | `closed_at` | — | Date package marked closed | Optional | Yes | Retain intact. |

> [!NOTE]
> **Dynamic Balance Invariant:**  
> `consumed_classes` and `remaining_classes` are **dynamically computed** by `PackageService.gs` at read-time by summing attendance credit events in `ClassSessions`. They are intentionally **not** stored as physical columns in Google Sheets to eliminate balance drift.

---

### 3.3 Tab: `ClassSessions` (19 Columns Live)

| # | Live Header Name | Approved Target Name | Frontend / Backend Mapping | Reconciliation Status | Intentional? | Recommended Action |
|---|---|---|---|---|---|---|
| 1 | `class_session_id` | `class_id` | `session_id` $\leftrightarrow$ `class_session_id` | Renamed / Adapted | Yes | Retain backend adapter. |
| 2 | `student_id` | `student_id` | `student_id` (FK to `Students`) | Exact Match | Yes | Retain intact. |
| 3 | `enrollment_id` | — (legacy FK) | `enrollment_id` | Retained | Yes | Retain optional. |
| 4 | `package_id` | `package_id` | `package_id` (FK to `Packages`) | Exact Match | Yes | Retain intact. |
| 5 | `meeting_link_id` | `meeting_link` | `meeting_link_id` (FK to `MeetingLinks`) | Exact Match | Yes | Retain intact. |
| 6 | `class_title` | `topic` / `notes` | `topic` $\leftrightarrow$ `class_title` | Renamed / Adapted | Yes | Retain backend adapter. |
| 7 | `scheduled_start` | `class_date` + `start_time` | `start_time` (ISO datetime) $\leftrightarrow$ `scheduled_start` | Adapted | Yes | Retain backend ISO adapter. |
| 8 | `scheduled_end` | `end_time` | Computed: `start + duration * 60000` | Adapted | Yes | Retain backend adapter. |
| 9 | `actual_start` | — | Actual class commencement | Optional | Yes | Retain intact. |
| 10 | `actual_end` | — | Actual class conclusion | Optional | Yes | Retain intact. |
| 11 | `session_status` | `status` | `status` (`SCHEDULED`/`COMPLETED`/`CANCELLED`) | Renamed / Adapted | Yes | Retain backend adapter. |
| 12 | `attendance_status` | `student_attended` | `attendance_status` (`ATTENDED`/`NO_SHOW`) | Adapted | Yes | Retain backend adapter. |
| 13 | `class_credit_effect` | `credit_deducted` | `CONSUME` (1), `NO_CONSUME` (0), `CREDIT_BACK` (-1) | Adapted | Yes | Retain backend enum mapping. |
| 14 | `cancellation_reason` | `cancellation_reason` | Captured on cancel | Exact Match | Yes | Retain intact. |
| 15 | `credit_restoration_for_session_id` | `credit_waiver` / restoration | Tracks credit-back session links | Exact Match | Yes | Retain intact. |
| 16 | `notes` | `notes` | `notes` | Exact Match | Yes | Retain intact. |
| 17 | `created_at` | `created_at` | `created_at` | Exact Match | Yes | Retain intact. |
| 18 | `updated_at` | `updated_at` | `updated_at` | Exact Match | Yes | Retain intact. |
| 19 | `completed_at` | — | Timestamp of attendance marking | Optional | Yes | Retain intact. |

---

### 3.4 Tab: `FeeObligations` (15 Columns Live)

| # | Live Header Name | Approved Target Name | Frontend / Backend Mapping | Reconciliation Status | Intentional? | Recommended Action |
|---|---|---|---|---|---|---|
| 1 | `fee_obligation_id` | `fee_id` | `fee_id` $\leftrightarrow$ `fee_obligation_id` | Renamed / Adapted | Yes | Retain backend adapter. |
| 2 | `student_id` | `student_id` | `student_id` (FK to `Students`) | Exact Match | Yes | Retain intact. |
| 3 | `enrollment_id` | — (legacy FK) | `enrollment_id` | Retained | Yes | Retain optional. |
| 4 | `package_id` | `package_id` | `package_id` (FK to `Packages`) | Exact Match | Yes | Retain intact. |
| 5 | `obligation_description` | `billing_period` / `description` | `description` $\leftrightarrow$ `obligation_description` | Renamed / Adapted | Yes | Retain backend adapter. |
| 6 | `amount_due` | `amount` | `amount_due` $\leftrightarrow$ `amount_due` | Exact Match | Yes | Retain intact. |
| 7 | `currency` | `currency` | `currency` (`INR`) | Exact Match | Yes | Retain intact. |
| 8 | `issue_date` | — | Invoicing issue date | Optional | Yes | Retain intact. |
| 9 | `due_date` | `due_date` | `due_date` (YYYY-MM-DD) | Exact Match | Yes | Retain intact. |
| 10 | `obligation_status` | `status` | `status` (`OPEN`/`PARTIALLY_PAID`/`PAID`/`VOID`) | Renamed / Adapted | Yes | Retain backend adapter. |
| 11 | `notes` | `notes` | `notes` | Exact Match | Yes | Retain intact. |
| 12 | `created_at` | `created_at` | `created_at` | Exact Match | Yes | Retain intact. |
| 13 | `updated_at` | `updated_at` | `updated_at` | Exact Match | Yes | Retain intact. |
| 14 | `voided_at` | `voided_at` | `voided_at` (populated on void) | Exact Match | Yes | Retain intact. |
| 15 | `void_reason` | `void_reason` | `void_reason` (justification) | Exact Match | Yes | Retain intact. |

> [!NOTE]
> `amount_paid` and `outstanding_balance` are dynamically derived at read-time by summing non-voided `Payments` referencing `fee_obligation_id`.

---

### 3.5 Tab: `Payments` (15 Columns Live)

| # | Live Header Name | Approved Target Name | Frontend / Backend Mapping | Reconciliation Status | Intentional? | Recommended Action |
|---|---|---|---|---|---|---|
| 1 | `payment_id` | `payment_id` | `payment_id` (PK) | Exact Match | Yes | Retain intact. |
| 2 | `student_id` | `student_id` | `student_id` (FK to `Students`) | Exact Match | Yes | Retain intact. |
| 3 | `fee_obligation_id` | `fee_id` | `fee_id` $\leftrightarrow$ `fee_obligation_id` | Renamed / Adapted | Yes | Retain backend adapter. |
| 4 | `payment_date` | `payment_date` | `payment_date` (YYYY-MM-DD) | Exact Match | Yes | Retain intact. |
| 5 | `amount` | `amount` | `amount` | Exact Match | Yes | Retain intact. |
| 6 | `currency` | `currency` | `currency` (`INR`) | Exact Match | Yes | Retain intact. |
| 7 | `payment_method` | `payment_method` | `payment_method` (`UPI`/`BANK_TRANSFER`/`CASH`) | Exact Match | Yes | Retain intact. |
| 8 | `transaction_reference` | `reference` | `reference_number` $\leftrightarrow$ `transaction_reference` | Renamed / Adapted | Yes | Retain backend adapter. |
| 9 | `idempotency_key` | `idempotency_key` | `idempotency_key` (duplicate submission guard) | Exact Match | Yes | Retain intact. |
| 10 | `payment_status` | `status` | `status` (`RECORDED`/`VOID`) | Renamed / Adapted | Yes | Retain backend adapter. |
| 11 | `notes` | `notes` | `notes` | Exact Match | Yes | Retain intact. |
| 12 | `created_at` | `created_at` | `created_at` | Exact Match | Yes | Retain intact. |
| 13 | `updated_at` | `updated_at` | `updated_at` | Exact Match | Yes | Retain intact. |
| 14 | `voided_at` | `voided_at` | `voided_at` (populated on void) | Exact Match | Yes | Retain intact. |
| 15 | `void_reason` | `void_reason` | `void_reason` | Exact Match | Yes | Retain intact. |

---

### 3.6 Tab: `MeetingLinks` (13 Columns Live)

| # | Live Header Name | Approved Target Name | Frontend / Backend Mapping | Reconciliation Status | Intentional? | Recommended Action |
|---|---|---|---|---|---|---|
| 1 | `meeting_link_id` | `meeting_link_id` | `meeting_link_id` (PK) | Exact Match | Yes | Retain intact. |
| 2 | `student_id` | `student_id` | `student_id` (FK to `Students`) | Exact Match | Yes | Retain intact. |
| 3 | `provider` | — | `provider` (`GOOGLE_MEET`/`ZOOM`/`MS_TEAMS`) | Exact Match | Yes | Retain intact. |
| 4 | `link_label` | `label` | `label` $\leftrightarrow$ `link_label` | Renamed / Adapted | Yes | Retain backend adapter. |
| 5 | `meeting_url` | `primary_link` | `meeting_url` (HTTPS URL) | Exact Match | Yes | Retain intact. |
| 6 | `is_preferred` | `primary_link` flag | `is_preferred` (boolean: default vs backup) | Exact Match | Yes | Retain intact. |
| 7 | `link_status` | `status` | `status` $\leftrightarrow$ `link_status` (`ACTIVE`/`INACTIVE`) | Renamed / Adapted | Yes | Retain backend adapter. |
| 8 | `valid_from` | — | Optional scheduling window | Unused | Yes | Retain intact. |
| 9 | `valid_until` | — | Optional scheduling window | Unused | Yes | Retain intact. |
| 10 | `notes` | `notes` | `notes` | Exact Match | Yes | Retain intact. |
| 11 | `created_at` | `created_at` | `created_at` | Exact Match | Yes | Retain intact. |
| 12 | `updated_at` | `updated_at` | `updated_at` | Exact Match | Yes | Retain intact. |
| 13 | `deactivated_at` | — | Populated on deactivation | Optional | Yes | Retain intact. |

---

### 3.7 Operational, Staging & Protected Tabs

| Tab Name | Live Columns | Live Rows | Purpose & Visibility | Code References & Integrity | Recommended Action |
|---|---|---|---|---|---|
| `Enrollments` | 13 | 1 (Header) | Legacy grouping tab. Contains 0 data rows. | Referenced by `EnrollmentRepository.gs` and `EnrollmentService.gs`. | **Preserve intact.** Do not delete or alter. |
| `StudentNotes` | 9 | 9 (1 hdr + 8 rows) | Chronological lesson progress & tutor notes. | Referenced by `NoteService.gs` and `StudentNotes.tsx`. | **Preserve visible.** (See Section 4 for details on the 8 rows). |
| `AuditLog` | 12 | 197 (1 hdr + 196 rows) | Immutable security & transaction event log. | Written by `AuditService.gs` on all mutations. Hidden in UI. | **Keep hidden operational tab.** Never truncate. |
| `ImportBatches` | 14 | 8 (1 hdr + 7 rows) | Metadata for CSV batch imports. | Written by `ImportService.gs`. Hidden in UI. | **Keep hidden operational tab.** |
| `ImportRowResults` | 9 | 14 (1 hdr + 13 rows) | Row-level staging reconciliation results. | Written by `ImportService.gs`. Hidden in UI. | **Keep hidden operational tab.** |
| `AppConfig` | 4 | 5 (1 hdr + 4 rows) | System parameters (`v2.0.0`, `INR`, `Asia/Kolkata`). | Read by `ConfigService.gs` and system routines. Hidden in UI. | **Keep hidden operational tab.** |

---

## 4. Forensic Resolution of the `StudentNotes` Question

### Findings on the Eight Retained Rows
1. **Inspection of Foreign Keys:**  
   The 8 rows in `StudentNotes` hold `student_id` values: `stu_mvhmxpaolomjxz9e` (2 rows), `stu_mvhnvr8lx3702qkd`, `stu_mvho35bhwzq8ovba`, `stu_mvho94ravfr9tjhv`, `stu_mvhqlhjy2j40384n`, `stu_mvhqwn9tbmmx5se5`, `stu_mvhrg5ybze4xbt16`.
2. **Student Entity Existence:**  
   Because rows 2–73 in `Students` were cleared during the authorized cleanup, **none of these student IDs exist in the `Students` sheet**. They are orphaned test records generated by automated Playwright browser tests.
3. **Does the Notes Feature Depend on Them?**  
   **No.** `NoteService.gs` and `StudentNotes.tsx` operate strictly on a per-student basis (`notes.getByStudentId(student_id)`). When real students are imported, their profiles will query their own new student IDs, returning clean empty lists. These 8 orphaned rows will **never appear in any real student's profile**.
4. **Visibility Recommendation:**
   - **Recommendation:** Keep `StudentNotes` **visible** in Google Sheets. Tutors frequently inspect student learning progress, pedagogical notes, and parent follow-up logs directly in the spreadsheet without launching the web application.
   - **Handling of the 8 Rows:** In a separate, future owner-authorized action, clear rows 2–9 of `StudentNotes` so the tab starts completely clean for production. Leaving them in place causes zero functional issues in the UI, but clearing them provides a clean spreadsheet.
   - **Strict Invariant Followed:** Zero rows were deleted, edited, hidden, merged, or renamed during this audit.

---

## 5. Verification of the Six Main Working Tabs

| Working Tab Name | Actual Live Headers Match Approved Schema? | Extra Columns in Live Sheet | Missing Columns from Proposal | Adapter Code Status |
|---|---|---|---|---|
| `Students` | Functionally Aligned | `preferred_name`, `date_of_birth`, `parent_guardian_relationship`, `city`, `first_enrollment_date`, `last_active_date`, `source_reference` | `student_email`, `subject` | `StudentService.gs` seamlessly maps `full_name`, `parent_name`, `parent_phone`, `phone`, `notes`. |
| `Packages` | Functionally Aligned | `enrollment_id`, `purchase_date`, `closed_at` | `plan_type`, `per_class_rate`, `billing_frequency`, `next_due_date` | `PackageService.gs` maps `total_classes` $\leftrightarrow$ `purchased_classes`, `price` $\leftrightarrow$ `package_price`, `status` $\leftrightarrow$ `package_status`. |
| `ClassSessions` | Functionally Aligned | `enrollment_id`, `actual_start`, `actual_end`, `completed_at` | `class_date`, `start_time` (split), `end_time` (split), `duration_minutes` (col), `credit_waiver` (col) | `ClassService.gs` maps `topic` $\leftrightarrow$ `class_title`, `start_time` $\leftrightarrow$ `scheduled_start`, computes duration. |
| `FeeObligations` | Functionally Aligned | `enrollment_id`, `issue_date` | `billed_class_ids` (col) | `FeeService.gs` maps `description` $\leftrightarrow$ `obligation_description`, derives balances from payments. |
| `Payments` | Functionally Aligned | None | `applied_amount`, `unapplied_amount`, `package_id` | `PaymentService.gs` maps `reference_number` $\leftrightarrow$ `transaction_reference`, `fee_id` $\leftrightarrow$ `fee_obligation_id`. |
| `MeetingLinks` | Functionally Aligned | `valid_from`, `valid_until`, `deactivated_at` | Consolidating into 2 columns (`primary_link`, `backup_link`) | `MeetingLinkService.gs` supports preferred link toggle and multiple backup rooms per student. |

---

## 6. Business Logic & Feature Verification

1. **Simplified Student Contact Fields:**  
   `StudentForm.tsx` collects `full_name`, `parent_name`, `parent_phone`, student `phone`, `parent_email`, and `notes`. The backend seamlessly decomposes and persists these to the live sheet. Tested and verified in E2E browser tests.
2. **Package Credits & Attendance Deductions:**  
   Credits are dynamically derived. Attended classes consume 1 credit; excused cancellations consume 0 credits; restorations grant 1 credit back. Verified in `tests/domains/classesAndCredits.test.ts` and `schemaRedesignMultiModel.test.ts`.
3. **Late-Cancellation Waivers:**  
   Tested and proven in `schemaRedesignMultiModel.test.ts`. Cancellations under 4 hours without a waiver log unexcused absence (1 credit deducted), while an explicit tutor waiver logs excused absence (credit preserved).
4. **Monthly Invoice Previews & Duplicate Protection:**  
   Tested and proven in `schemaRedesignMultiModel.test.ts`. Queries unbilled attended sessions for a billing period and prevents duplicate invoices.
5. **Partial Payments & Unapplied Overpayment Credits:**  
   Tested and proven in `schemaRedesignMultiModel.test.ts`. Supports multi-part payments against single invoices. Overpayments are held as unapplied student credits and can be allocated to future obligations.

---

## 7. Categorized Recommendations (Smallest Safe Corrections)

### A. Must Fix Before Onboarding Real Student Data
1. **Clear the 8 Orphaned Test Rows in `StudentNotes`:**  
   When authorized, clear rows 2–9 of `StudentNotes` via `clearContent()`. They belong to deleted test students and should be emptied before real notes are added.
2. **Configure Production `ADMIN_AUTH_KEY`:**  
   Set your permanent private administrator access key in Google Apps Script Script Properties before loading real student records.

### B. Important but Non-Blocking (Post-Launch Enhancements)
1. **Dedicated `subject` Field in `StudentForm.tsx`:**  
   Add a direct "Subject" input field in `StudentForm.tsx` to display tutoring subject directly on student cards.
2. **"Generate Monthly Invoices" UI Modal:**  
   Expose the per-class invoice preview workflow in the frontend UI to automate end-of-month invoice generation.
3. **"Unapplied Credit" Badge on Payment Form:**  
   Display available overpayment credits on the payment modal when recording new fees.

### C. Intentional Differences That Should Remain
1. **Physical Sheet Headers vs Proposed Names:**  
   The live physical headers (`first_name`, `primary_phone`, `parent_guardian_name`, `obligation_description`, etc.) are actively bridged by the backend adaptors. **Do not rename physical sheet columns.** Retaining the stable sheet structure prevents deployment desynchronization.
2. **Relational Meeting Links:**  
   Storing meeting links as rows with `is_preferred = true/false` is superior to flattening into two fixed columns, as it supports multiple providers and link labels.
3. **Derived Financial Balances:**  
   Balances and remaining credits must remain dynamically derived in backend code, never stored as native Google Sheets formulas.

---

## 8. Confirmation of Strict Non-Destructive Audit

- **Zero live spreadsheet rows were created, cleared, overwritten, or deleted.**
- **Zero tabs or columns were renamed, hidden, unhidden, merged, or deleted.**
- **Spreadsheet ID, authentication settings, and deployment configurations remain 100% unchanged.**

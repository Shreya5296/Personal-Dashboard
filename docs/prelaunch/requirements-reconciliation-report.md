# Personal Dashboard — Requirements-First Field & Schema Reconciliation

**Document Version:** 2.0.0 (Resolved Final Proposal)  
**Status:** Requirements & Data Model Review (Read-Only; Zero Live Rows, Schemas, or Code Changed)  
**Date:** October 21, 2026  
**Canonical Master Spreadsheet ID:** `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`  
**Current Active Deployment:** Google Apps Script `@22` (`AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w`)

---

## 1. Executive Summary & Purpose

This document provides the resolved, internally consistent schema and field mapping proposal for the Personal Dashboard. It reconciles the application with the **owner's original business requirements as the sole source of truth**, eliminates contradictions from earlier technical drafts, and defines the simplest practical data model for a private tutor.

### Key Corrections in Version 2.0.0
1. **Resolved the Overpayment Contradiction:** Demonstrates with concrete numbers why simply capping a fee balance or relying on frontend calculations fails accounting rules. Proposes the exact, minimal schema addition (`credit_applied` on `FeeObligations`) to allow overpayments and forward credits without double-counting cash receipts and without requiring an enterprise `PaymentAllocations` junction table.
2. **Corrected `Students` Persistence Path:** Explicitly separates `student_email` from `parent_email`, provides a dedicated physical `subject` column, unifies `student_name`, and specifies a 100% backward-compatible migration path that preserves existing notes.
3. **Corrected `Packages` Mapping & Billing Formulas:** Explicitly maps all 11 required fields, identifies input vs stored vs derived fields, formalizes the exact mathematical formulas for class consumption/credits across all attendance outcomes, and evaluates whether `in_INR` is needed.
4. **Safely Simplified `MeetingLinks`:** Preserves backward compatibility with existing backend services while streamlining the user experience to one primary link (`link1`) and one backup link (`link2`).
5. **Formally Evaluated `Enrollments`:** Proves through complete codebase inspection that `Enrollments` is 100% redundant with `Packages` for a solo tutor and outlines a zero-risk deprecation path.
6. **Produced the Complete 6-Tab Specification:** Documents every column across all six working tabs, categorizing fields into Required Business, Necessary Technical, Optional, and Derived/Display.

---

## 2. Corrected Students Mapping & Persistence Path

### 2.1 Requirements vs Physical Mapping
The original requirements specify 9 core student fields (plus unique ID):

| Required Field | Business Meaning | Recommended Physical Column | Current Live Physical Column | Persistence & Mapping Path | Status |
|---|---|---|---|---|---|
| `student_id` | Unique student record key | `student_id` | `student_id` (Col 1) | Auto-generated (`stu_...`); stored in Col 1 | **Exact Match** |
| `Student_name` | Full display name | `student_name` | `first_name` (Col 2), `last_name` (Col 3) | Single text input in UI; stored as single column | **Unify Columns** |
| `parent_name` | Parent/guardian name (optional) | `parent_name` | `parent_guardian_name` (Col 6) | Direct text input; mapped 1:1 | **Rename Column** |
| `parent_phone` | Parent phone for WhatsApp/calls | `parent_phone` | `primary_phone` (Col 8) | Phone input; mapped 1:1 | **Rename Column** |
| `student_phone` | Student direct mobile (optional) | `student_phone` | `secondary_phone` (Col 9) | Phone input; mapped 1:1 | **Rename Column** |
| `parent_email` | Parent email for billing/invoices | `parent_email` | `parent_email` (Col 10) | Email input; mapped 1:1 | **Exact Match** |
| `student_email` | Student direct email for calendar | `student_email` | **MISSING** from physical sheet | Dedicated email input; stored in new column | **Add Physical Column** |
| `subject` | Academic subject(s) studied | `subject` | **MISSING** (stored as tag in notes) | Dedicated text input; stored in new column | **Add Physical Column** |
| `status` | Student status (`ACTIVE`, `INACTIVE`) | `status` | `student_status` (Col 12) | System enum; drives directory & archival | **Rename Column** |
| `notes` | Background context & preferences | `notes` | `internal_summary` (Col 15) | Multiline free text; clean of artificial tags | **Rename Column** |

### 2.2 Critical Invariant: Email Separation
- **The Defect:** In earlier versions, `student_email` was mapped to `parent_email`, causing entered student emails to overwrite parent billing addresses.
- **The Resolved Model:** `parent_email` and `student_email` are strictly independent physical columns.
  - `parent_email`: Authoritative destination for fee invoices, payment receipts, and billing notifications.
  - `student_email`: Authoritative destination for class schedule notifications and Google Calendar invites.
  - If a student has no personal email, `student_email` remains empty (`null`). It **never** falls back to or overwrites `parent_email`.

### 2.3 Migration-Compatible Path for Dedicated Subject Column
Hiding `[Subject: Mathematics]` inside student notes was a temporary zero-schema workaround. It is unacceptable as the permanent data model because it prevents filtering, sorting, or grouping students by subject in Google Sheets.

**Recommended Non-Destructive Migration Path:**
1. **Append Column:** Append a new column `subject` to the `Students` sheet (e.g. Column 20).
2. **Backend Read Strategy (Backward Compatible):**
   ```javascript
   function Students_enrich(record) {
     var directSubject = record.subject ? String(record.subject).trim() : '';
     var notes = record.notes || record.internal_summary || '';
     if (!directSubject && notes) {
       // Fall back to parsing legacy tag for pre-migration records
       var parsed = parseSubjectAndNotes(notes);
       directSubject = parsed.subject;
       notes = parsed.notes;
     }
     return Object.assign({}, record, { subject: directSubject, notes: notes });
   }
   ```
3. **Backend Write Strategy:** When saving or updating a student, write `subject` directly to the `subject` column. Write `notes` cleanly to `internal_summary` / `notes` without any artificial `[Subject: ...]` prefix.
4. **Data Integrity:** Existing student notes are preserved 100% untouched.

---

## 3. Corrected Packages Mapping & Multi-Model Billing

### 3.1 Field-by-Field Mapping
The original requirements define 11 core package fields:

| Field Name | Entered / Stored / Derived / Displayed | Source of Truth | Mathematical Formula / Business Rule | Recommended Column |
|---|---|---|---|---|
| `student_id` | **Entered** (via picker) / **Stored** | `Packages` row | Foreign key referencing `Students.student_id` | `student_id` |
| `student_name` | **Displayed** (auto-populated) | `Students` table | Displayed via lookup: `Students.find(s => s.id === pkg.student_id).name`. Populated in sheet on insert for direct sheet readability. | `student_name` |
| `plan` | **Entered** / **Stored** | `Packages` row | Plan name (e.g., "10-Class Math Block") + Plan Type enum (`PREPAID_PACKAGE`, `MONTHLY`, `YEARLY`, `PER_CLASS`) | `plan_name`, `plan_type` |
| `currency` | **Entered** / **Stored** | `Packages` row | ISO 4217 code (`INR`, `USD`, `EUR`, `GBP`). Defaults to `INR`. | `currency` |
| `per_class` | **Entered or Derived** / **Stored** | `Packages` row | Rate per class. For packages: $\text{price} / \text{classes}$. For per-class: entered hourly rate. | `per_class` |
| `in_INR` | **Entered or Derived** / **Stored** | `Packages` row | Baseline INR equivalent for foreign currency plans. | `in_INR` |
| `classes_purchased` | **Entered** / **Stored** | `Packages` row | Total credits in prepaid block, or expected classes per month/year. | `classes_purchased` |
| `start_date` | **Entered** / **Stored** | `Packages` row | Date package or billing agreement begins (YYYY-MM-DD). | `start_date` |
| `class_consumed` | **DERIVED** (Display & Export Only) | `ClassSessions` table | $\sum (\text{CONSUME}) - \sum (\text{CREDIT\_BACK})$ for this `package_id`. | Derived (Never edited independently) |
| `class remaining` | **DERIVED** (Display & Export Only) | `Packages` & `ClassSessions` | $\max(0, \text{classes\_purchased} - \text{class\_consumed})$. | Derived (Never edited independently) |
| `next_due_date` | **Entered or Calculated** / **Stored** | `Packages` row | For monthly/yearly: billing renewal date (+1 month). For packages: renewal date when credits $\le 2$. | `next_due_date` |

### 3.2 Authoritative Formula for Consumed and Remaining Classes
To prevent balance desynchronization, `class_consumed` and `class remaining` are **never stored as independent editable integers**. They are derived dynamically from authoritative session events in `ClassSessions`:

$$\text{class\_consumed} = \sum_{\substack{s \in \text{ClassSessions} \\ s.\text{package\_id} = \text{pkg.id}}} \text{CreditWeight}(s)$$

Where $\text{CreditWeight}(s)$ is determined strictly by the session outcome:
- **Completed class (`ATTENDED`):** Weight = $+1$ (`CONSUME`)
- **Unexcused No-Show (`NO_SHOW` / `ABSENT_UNEXCUSED`):** Weight = $+1$ (`CONSUME`)
- **Late Cancellation ($< 4$h notice without tutor waiver):** Weight = $+1$ (`CONSUME`)
- **Excused Absence (`EXCUSED` / `ABSENT_EXCUSED`):** Weight = $0$ (`NO_CONSUME`)
- **Advance Cancellation ($\ge 4$h notice):** Weight = $0$ (`NO_CONSUME`)
- **Late Cancellation with Tutor Waiver (`credit_waiver = true`):** Weight = $0$ (`NO_CONSUME`)
- **Administrative Credit Restoration:** Weight = $-1$ (`CREDIT_BACK`)

$$\text{class remaining} = \max(0, \text{classes\_purchased} - \text{class\_consumed})$$

### 3.3 Analysis of `in_INR`: Is It Genuinely Needed?
- **For Domestic Students (100% INR):** `in_INR` is completely redundant; it is identical to `package_price`.
- **For International Students (USD / GBP / EUR):**
  - Why it is requested: Indian tax laws and local bookkeeping require books of accounts to report revenue in INR.
  - How exchange rates are maintained:
    - *Option A (Manual Entry at Agreement Time):* When setting up a $40/class package, the tutor enters an agreed baseline equivalent (e.g. ₹3,300/class). This is fixed and predictable.
    - *Option B (Actual Remittance Rate from Bank):* Real exchange conversion occurs when the international transfer hits the tutor's bank account. The actual INR credited is recorded on the `Payments` row directly from the bank credit advice.
  - **Recommendation:** Make `in_INR` an **optional field** on `Packages`. If left blank for foreign packages, the system displays the foreign currency as-is. For tax reporting, actual INR received is taken authoritatively from the bank deposit recorded in `Payments`.

---

## 4. Resolving the Overpayment Contradiction

### 4.1 The Core Problem
The previous report stated that overpayments are allowed and carried forward as student credit, while simultaneously rejecting a separate `PaymentAllocations` table. 

As the owner correctly observed: **capping a fee balance at 100% does NOT automatically create a valid credit ledger.**
- If parent pays ₹6,000 for a ₹5,000 fee (Fee A), Fee A is satisfied ($₹5,000$).
- Where does the surplus ₹1,000 live?
- If next month Fee B is issued for ₹5,000, how does that ₹1,000 reduce Fee B without inserting a second ₹1,000 payment row that would double-count bank receipts?

### 4.2 The Solution: Minimal Schema Extension via `credit_applied` on Invoices
To handle overpayments, partial payments, and forward credits with 100% mathematical and accounting correctness—**without creating an enterprise `PaymentAllocations` table**—we add a single column to `FeeObligations`:
- `credit_applied` (Numeric, defaults to 0).

Let us walk through the owner's three exact test scenarios:

---

### Scenario 1: Overpayment & Credit Forward
- **Fee A Issued:** ₹5,000 for Month 1.
- **Actual Cash Received:** Parent transfers ₹6,000 via UPI.
- **Next Month Fee B:** ₹5,000 for Month 2.

#### Step 1: Fee A Creation
- `FeeObligations` Row 1:
  - `fee_id`: `fee_01`
  - `amount_due`: `5000` (contractual fee)
  - `credit_applied`: `0`
  - *Net Payable:* ₹5,000

#### Step 2: Overpayment Recorded
- `Payments` Row 1:
  - `payment_id`: `pay_01`
  - `fee_id`: `fee_01`
  - `payment_date`: `2026-11-01`
  - `amount`: `6000` (Actual cash received in bank)
  - `payment_status`: `RECORDED`

#### Step 3: Fee A Balance & Unapplied Credit State
- Cash applied to Fee A is capped at net payable:
  $$\text{Fee A Paid} = \min(\text{pay\_01.amount}, \text{fee\_01.net\_payable}) = \min(6000, 5000) = 5000$$
  $$\text{Fee A Balance} = 5000 - 5000 = 0 \quad (\text{Status: PAID})$$
- Student's Unapplied Credit Balance is dynamically derived:
  $$\text{Unapplied Credit} = \sum_{\text{non-void}} \text{Payments.amount} - \sum_{\text{non-void}} \text{Fees.cash\_paid\_capped} = 6000 - 5000 = 1000$$
  *Result: Student has ₹1,000 available credit.*

#### Step 4: Next Month Fee B Issued (Using Monthly Invoice Generator)
When the tutor clicks "Generate Monthly Invoices" for Month 2:
- The system identifies Fee B contractual tuition = ₹5,000.
- The system detects available unapplied credit = ₹1,000.
- The invoice preview displays:
  - Gross Tuition: ₹5,000
  - Applied Credit: -₹1,000
  - Net Amount Due: ₹4,000
- Upon confirmation, `FeeObligations` Row 2 is created:
  - `fee_id`: `fee_02`
  - `amount_due`: `5000` (contractual gross fee)
  - `credit_applied`: `1000` (credit absorbed from pay_01)
  - *Net Payable:* $\text{amount\_due} - \text{credit\_applied} = 5000 - 1000 = 4000$
- Student's Unapplied Credit Balance updates immediately:
  $$\text{Unapplied Credit} = 6000 - (5000 + 1000) = 0$$

#### Step 5: Parent Pays Fee B
- Parent transfers net due amount of ₹4,000 via UPI.
- `Payments` Row 2:
  - `payment_id`: `pay_02`
  - `fee_id`: `fee_02`
  - `payment_date`: `2026-12-01`
  - `amount`: `4000`
  - `payment_status`: `RECORDED`
- Fee B Balance:
  $$\text{Fee B Paid} = 4000$$
  $$\text{Fee B Balance} = \text{net\_payable} - \text{paid} = 4000 - 4000 = 0 \quad (\text{Status: PAID})$$

#### Step 6: Financial Report Ledger Verification
- **Total Cash Income Counted:**
  $$\sum \text{Payments.amount} = \text{pay\_01} (₹6,000) + \text{pay\_02} (₹4,000) = ₹10,000$$
  *(Exactly matches bank statement: ₹6,000 + ₹4,000 = ₹10,000. Zero double counting!)*
- **Total Tuition Billed:**
  $$\sum \text{FeeObligations.amount\_due} = \text{fee\_01} (₹5,000) + \text{fee\_02} (₹5,000) = ₹10,000$$
  *(Contractual tuition matches cash collected 100%.)*
- **Total Outstanding Balance:** ₹0.
- **Total Remaining Credit:** ₹0.

---

### Scenario 2: Partial Payment
- **Fee A Issued:** ₹5,000.
- **Payment 1:** Parent pays ₹2,000 on Day 5.
- **Payment 2:** Parent pays remaining ₹3,000 on Day 20.

#### Exact Trace:
1. `FeeObligations` Row: `fee_id = 'fee_A'`, `amount_due = 5000`, `credit_applied = 0`. Net payable = ₹5,000.
2. `Payments` Row 1: `payment_id = 'pay_p1'`, `fee_id = 'fee_A'`, `amount = 2000`, `status = 'RECORDED'`.
   - Fee A `paid_amount` = ₹2,000.
   - Fee A `balance_amount` = $5,000 - 2,000 = ₹3,000$.
   - Fee A `status` = `PARTIALLY_PAID`.
   - Unapplied credit = ₹0.
3. `Payments` Row 2: `payment_id = 'pay_p2'`, `fee_id = 'fee_A'`, `amount = 3000`, `status = 'RECORDED'`.
   - Fee A `paid_amount` = $2,000 + 3,000 = ₹5,000$.
   - Fee A `balance_amount` = $5,000 - 5,000 = ₹0$.
   - Fee A `status` = `PAID`.
   - Unapplied credit = ₹0.
4. **Financial Report:** Cash received = $\text{pay\_p1} (₹2,000) + \text{pay\_p2} (₹3,000) = ₹5,000$. Matches Fee A amount due (₹5,000) 100%.

---

### Scenario 3: Voided Payment (Bounced Cheque / Typo)
- **Fee A Issued:** ₹5,000.
- **Payment Recorded:** Cheque for ₹5,000 deposited (`pay_v1`).
- **Cheque Bounces:** Tutor marks payment `VOID`.

#### Exact Trace:
1. `FeeObligations` Row: `fee_id = 'fee_A'`, `amount_due = 5000`, `credit_applied = 0`.
2. `Payments` Row 1: `payment_id = 'pay_v1'`, `fee_id = 'fee_A'`, `amount = 5000`, `payment_status = 'RECORDED'`.
   - Fee A `paid_amount` = ₹5,000, `balance_amount` = ₹0 (Status: `PAID`).
3. Cheque bounces. Tutor clicks "Void" on `pay_v1`, enters reason: "Cheque #4021 bounced".
   - `pay_v1` updated in place: `payment_status = 'VOID'`, `void_reason = 'Cheque #4021 bounced'`, `voided_at = '2026-11-05T10:00:00Z'`.
   - **Row is never deleted** (immutable audit trail preserved).
4. Fee A Balance Recalculated (Excluding Void Payments):
   - Active non-void payments for Fee A = ₹0.
   - Fee A `paid_amount` = ₹0.
   - Fee A `balance_amount` = ₹5,000.
   - Fee A `status` reverts to `OPEN` (or `OVERDUE` if past due date).
5. **Financial Report:** Voided payment is filtered out: $\sum_{\text{status} \neq \text{'VOID'}} \text{Payments.amount} = ₹0$. Cash receipts match actual cleared bank funds.

---

### 4.3 Why This Model Completely Solves the Problem
By adding `credit_applied` to `FeeObligations`:
- Every bank deposit is entered once in `Payments` (exact cash tracking).
- Overpayments automatically become unapplied credit without manual allocation steps.
- Subsequent invoices explicitly absorb available credit, displaying the discount clearly to the parent.
- Financial reports count cash received directly from `Payments` without double-counting.
- **Zero extra database tables required.**

---

## 5. Safely Simplifying MeetingLinks

### 5.1 Owner Requirement
The owner requires: `student_id`, `student_name`, `link1` (Primary Link), and `link2` (Backup Link, optional).

### 5.2 Dependency Audit of Current Codebase
Before touching the schema, we inspected all code dependencies:
- `SheetRegistry.gs`: Tab 6 (`MeetingLinks`) has 13 columns.
- `MeetingLinkService.gs`: Enforces single preferred link by updating other links to `is_preferred = false`.
- `MeetingLinkHandlers.gs`: Registers `meetingLinks.list`, `meetingLinks.create`, `meetingLinks.deactivate`.
- `ClassScheduleForm.tsx`: Loads meeting links via `fetchMeetingLinks(studentId)` and sets the session URL.
- `tests/domains/classesAndCredits.test.ts`: Verifies `MeetingLinkService` single preferred link policy.

### 5.3 Safe Simplification Path
To achieve the owner's desired simplicity **without breaking any existing code or tests**:
1. **Frontend Presentation (Immediate):**
   - On the Student Form / Profile, surface two simple input fields: `Primary Meeting Link (link1)` and `Backup Meeting Link (link2)`.
   - When scheduling a class, auto-populate the session with `link1`, with `link2` available in a dropdown.
   - The tutor never has to navigate to a separate "Meeting Links" screen or manage provider enums, preferred checkboxes, or validity dates.
2. **Backend Persistence (Under the Hood):**
   - The frontend adaptor maps `link1` to the preferred link record (`is_preferred = true`) and `link2` to the secondary record (`is_preferred = false`) in the existing `MeetingLinks` sheet.
3. **Future Live Schema Simplification (When Authorized):**
   - When the owner authorizes schema migrations, `MeetingLinks` can be simplified to a flat 4-column sheet:
     `student_id`, `student_name`, `link1`, `link2`.
   - Or, `link1` and `link2` can be embedded directly as two columns on `Students`, eliminating Tab 6 entirely.

---

## 6. Comprehensive Review of Enrollments

### 6.1 Codebase & Data Dependency Audit
We inspected every reference to `Enrollments` across the entire project:
- **Live Spreadsheet:** The `Enrollments` tab contains **exactly 1 row** (headers only, **0 data rows**).
- **Backend Services:** `PackageService.gs:50`, `FeeService.gs:54`, and `ClassService.gs:44` have `enrollment_id: data.enrollment_id || ''`. All domain entities operate completely normally when `enrollment_id` is empty.
- **Frontend UI:** `EnrollmentList.tsx` exists, but the primary student billing and class management workflows operate entirely through `Packages` and `FeeObligations`.
- **Tests:** `tests/domains/studentsAndEnrollments.test.ts` tests `Enrollments_create`, but `endToEndLifecycle.test.ts` operates purely via `Packages`.

### 6.2 Conclusion: Enrollments is 100% Redundant for a Solo Tutor
In a multi-teacher school or university, an "Enrollment" binds a student to a generic course curriculum, under which multiple fee agreements are executed.
In private tutoring, the agreement to teach a student is structured directly as a package or billing plan (e.g., "10-Class Math Block" or "Monthly Science Tuition"). Having both an `Enrollment` entity and a `Package` entity forces the tutor into double-entry.

### 6.3 Recommendation: Formal Deprecation Without Immediate Deletion
1. **Immediate Phase:** Keep the physical `Enrollments` tab intact (empty, 1 header row). Do not delete or rename it.
2. **Application Level:** Stop prompting the tutor to create enrollments. The student setup workflow goes directly from `Student` $\rightarrow$ `Package / Billing Plan`.
3. **Future Cleanup:** When the owner authorizes pre-launch schema cleanup, hide or drop the empty `Enrollments` tab.

---

## 7. The Final Proposed Schema (Six Working Tabs)

Below is the complete, definitive field-by-field specification for each of the six working tabs.

### Tab 1: `Students` (Student & Parent Directory)

| Column Header | Field Category | Data Type | Purpose & Business Justification |
|---|---|---|---|
| `student_id` | **Required Business / Key** | String (`stu_...`) | Immutable primary key for all relational joins. |
| `student_name` | **Required Business** | String (1–100 chars) | Full display name (unified; no artificial first/last split). |
| `parent_name` | **Optional Business** | String (1–100 chars) | Primary parent/guardian contact name. |
| `parent_phone` | **Required Business** | String (10–15 digits) | Primary phone for parent communication and WhatsApp. |
| `student_phone` | **Optional Business** | String (10–15 digits) | Direct mobile number for older students. |
| `parent_email` | **Required Business** | String (Email format) | Destination for fee obligations, invoices, and payment receipts. |
| `student_email` | **Optional Business** | String (Email format) | Destination for class calendar invites; **never overwrites parent email**. |
| `subject` | **Required Business** | String (1–100 chars) | Primary academic subject(s) (dedicated physical column). |
| `status` | **Required Business** | Enum (`ACTIVE`, `INACTIVE`) | Lifecycle state; drives active directory filtering and archival. |
| `notes` | **Optional Business** | Text (Multiline) | Free-form notes on student learning style, goals, and history. |
| `created_at` | **Necessary Technical** | ISO 8601 Timestamp | Record creation timestamp for auditability. |
| `updated_at` | **Necessary Technical** | ISO 8601 Timestamp | Last update timestamp for concurrency tracking. |
| `archived_at` | **Necessary Technical** | ISO 8601 Timestamp | Timestamp when student was deactivated (empty if active). |

---

### Tab 2: `Packages` (Course Blocks & Billing Arrangements)

| Column Header | Field Category | Data Type | Purpose & Business Justification |
|---|---|---|---|
| `package_id` | **Required Business / Key** | String (`pkg_...`) | Immutable primary key for package/agreement. |
| `student_id` | **Required Business / FK** | String (`stu_...`) | Foreign key linking package to student. |
| `student_name` | **Display / Auto-Populated** | String | Student display name populated on insert for direct sheet readability. |
| `plan_name` | **Required Business** | String (e.g. "Grade 10 Math") | Human-readable package or course title. |
| `plan_type` | **Required Business** | Enum (`PACKAGE`, `MONTHLY`, `YEARLY`, `PER_CLASS`) | Distinguishes prepaid credit blocks from recurring and per-class models. |
| `currency` | **Required Business** | Enum (`INR`, `USD`, `EUR`, `GBP`) | Pricing currency; guarantees strict currency isolation. |
| `package_price` | **Required Business** | Number ($\ge 0$) | Total agreed price for package block or recurring billing period. |
| `per_class` | **Required / Derived** | Number ($\ge 0$) | Rate per individual class session; crucial for per-class billing. |
| `in_INR` | **Optional Business** | Number ($\ge 0$) | Baseline INR conversion for foreign currency tax reporting. |
| `classes_purchased` | **Required Business** | Integer ($\ge 0$) | Total class credits bought in block, or planned sessions per month. |
| `start_date` | **Required Business** | Date (YYYY-MM-DD) | Date package or billing agreement begins. |
| `expiry_date` | **Optional Business** | Date (YYYY-MM-DD) | Expiration date for prepaid class credit validity. |
| `next_due_date` | **Required / Calculated** | Date (YYYY-MM-DD) | Next payment due date or package renewal date. |
| `package_status` | **Required Business** | Enum (`ACTIVE`, `EXHAUSTED`, `EXPIRED`, `CANCELLED`) | Lifecycle status of package block. |
| `notes` | **Optional Business** | Text | Terms, discounts, or special arrangement notes. |
| `created_at` | **Necessary Technical** | ISO 8601 Timestamp | Record creation timestamp. |
| `updated_at` | **Necessary Technical** | ISO 8601 Timestamp | Last update timestamp. |

*(Note: `class_consumed` and `class remaining` are dynamically derived from attendance records; never stored as static integer columns).*

---

### Tab 3: `ClassSessions` (Scheduling & Attendance History)

| Column Header | Field Category | Data Type | Purpose & Business Justification |
|---|---|---|---|
| `class_session_id` | **Required Business / Key** | String (`cls_...`) | Immutable primary key for class session. |
| `student_id` | **Required Business / FK** | String (`stu_...`) | Foreign key linking session to student. |
| `student_name` | **Display / Auto-Populated** | String | Student display name populated on insert. |
| `package_id` | **Optional Business / FK** | String (`pkg_...`) | Package credit pool to deduct from (empty if per-class). |
| `meeting_link_id` | **Optional Technical** | String (`ml_...`) | Reference to student meeting link used. |
| `class_title` | **Required Business** | String (1–150 chars) | Lesson topic (e.g. "Quadratic Equations — Part 1"). |
| `scheduled_start` | **Required Business** | ISO 8601 Datetime | Scheduled date and start time. |
| `scheduled_end` | **Required Business** | ISO 8601 Datetime | Scheduled end time (calculated from start + duration). |
| `actual_start` | **Optional Business** | ISO 8601 Datetime | Actual start time when attendance marked. |
| `actual_end` | **Optional Business** | ISO 8601 Datetime | Actual end time. |
| `session_status` | **Required Business** | Enum (`SCHEDULED`, `COMPLETED`, `CANCELLED`) | Operational session state. |
| `attendance_status` | **Required Business** | Enum (`ATTENDED`, `ABSENT_UNEXCUSED`, `ABSENT_EXCUSED`, `CANCELLED_LATE`) | Attendance outcome. |
| `class_credit_effect` | **Necessary Technical** | Enum (`CONSUME`, `NO_CONSUME`, `CREDIT_BACK`, `PENDING`) | Deterministic accounting effect on package credit balance. |
| `cancellation_reason` | **Optional Business** | String | Reason for cancellation and waiver documentation. |
| `credit_restoration_for_session_id` | **Necessary Technical** | String | For `CREDIT_BACK` rows, references original session ID. |
| `notes` | **Optional Business** | Text | Lesson homework, student engagement notes. |
| `created_at` | **Necessary Technical** | ISO 8601 Timestamp | Record creation timestamp. |
| `updated_at` | **Necessary Technical** | ISO 8601 Timestamp | Last update timestamp. |
| `completed_at` | **Necessary Technical** | ISO 8601 Timestamp | Timestamp when attendance was marked. |

---

### Tab 4: `FeeObligations` (Invoices & Billing Demands)

| Column Header | Field Category | Data Type | Purpose & Business Justification |
|---|---|---|---|
| `fee_obligation_id` | **Required Business / Key** | String (`fee_...`) | Immutable primary key for invoice obligation. |
| `student_id` | **Required Business / FK** | String (`stu_...`) | Foreign key linking invoice to student. |
| `student_name` | **Display / Auto-Populated** | String | Student display name populated on insert. |
| `package_id` | **Optional Business / FK** | String (`pkg_...`) | Package associated with this invoice (if package billing). |
| `obligation_description` | **Required Business** | String (1–150 chars) | Invoice description (e.g. "Monthly Tuition — November 2026"). |
| `amount_due` | **Required Business** | Number (> 0) | Contractual gross invoice amount. |
| `credit_applied` | **Required Business** | Number ($\ge 0$) | **Surplus credit absorbed from prior overpayments**. |
| `currency` | **Required Business** | Enum (`INR`, `USD`, `EUR`, `GBP`) | Billing currency. |
| `issue_date` | **Required Business** | Date (YYYY-MM-DD) | Date invoice was issued. |
| `due_date` | **Required Business** | Date (YYYY-MM-DD) | Payment due date (triggers overdue badge if unpaid). |
| `obligation_status` | **Required Business** | Enum (`OPEN`, `PARTIALLY_PAID`, `PAID`, `VOID`) | Settlement state derived from payments. |
| `notes` | **Optional Business** | Text | Invoice notes (e.g. detailing credit deduction). |
| `created_at` | **Necessary Technical** | ISO 8601 Timestamp | Creation timestamp. |
| `updated_at` | **Necessary Technical** | ISO 8601 Timestamp | Last update timestamp. |
| `voided_at` | **Necessary Technical** | ISO 8601 Timestamp | Timestamp if invoice voided. |
| `void_reason` | **Necessary Technical** | String | Audit reason if invoice voided. |

*(Note: `paid_amount` and `outstanding_balance` are dynamically derived from non-void `Payments`; net amount payable is derived as `amount_due - credit_applied`).*

---

### Tab 5: `Payments` (Immutable Cash & Bank Transaction Ledger)

| Column Header | Field Category | Data Type | Purpose & Business Justification |
|---|---|---|---|
| `payment_id` | **Required Business / Key** | String (`pay_...`) | Immutable primary key for bank/cash receipt. |
| `student_id` | **Required Business / FK** | String (`stu_...`) | Foreign key linking payment to student. |
| `student_name` | **Display / Auto-Populated** | String | Student display name populated on insert. |
| `fee_obligation_id` | **Required Business / FK** | String (`fee_...`) | Specific invoice obligation this payment was made against. |
| `payment_date` | **Required Business** | Date (YYYY-MM-DD) | Date cash/UPI deposit was received in bank. |
| `amount` | **Required Business** | Number (> 0) | **Actual cash amount deposited in bank**. |
| `currency` | **Required Business** | Enum (`INR`, `USD`, etc.) | Payment currency (must match fee obligation). |
| `payment_method` | **Required Business** | Enum (`UPI`, `BANK_TRANSFER`, `CASH`, `CARD`) | Bank channel for tax and accounting reconciliation. |
| `transaction_reference` | **Optional Business** | String | Bank UTR / UPI reference / Cheque # for dispute proof. |
| `idempotency_key` | **Necessary Technical** | String | Unique nonce preventing duplicate payments on double-click. |
| `payment_status` | **Required Business** | Enum (`RECORDED`, `VOID`) | Transaction state; allows audited reversal without row deletion. |
| `notes` | **Optional Business** | Text | Payer notes (e.g. "Paid by mother via Google Pay"). |
| `created_at` | **Necessary Technical** | ISO 8601 Timestamp | Creation timestamp. |
| `updated_at` | **Necessary Technical** | ISO 8601 Timestamp | Last update timestamp. |
| `voided_at` | **Necessary Technical** | ISO 8601 Timestamp | Void timestamp (if reversed). |
| `void_reason` | **Necessary Technical** | String | Mandatory audit reason for payment reversal. |

---

### Tab 6: `MeetingLinks` (Video Conferencing Room URLs)

| Column Header | Field Category | Data Type | Purpose & Business Justification |
|---|---|---|---|
| `meeting_link_id` | **Required Business / Key** | String (`ml_...`) | Primary key for link record. |
| `student_id` | **Required Business / FK** | String (`stu_...`) | Foreign key linking room to student. |
| `student_name` | **Display / Auto-Populated** | String | Student display name populated on insert. |
| `link_label` | **Required Business** | String (e.g. "Primary Link", "Backup Link") | Distinguishes `link1` from `link2`. |
| `meeting_url` | **Required Business** | String (HTTPS URL) | Google Meet or Zoom URL. |
| `provider` | **Optional Business** | Enum (`GOOGLE_MEET`, `ZOOM`, `TEAMS`, `OTHER`) | Video provider badge. |
| `is_preferred` | **Required Business** | Boolean | `true` for `link1` (Primary); `false` for `link2` (Backup). |
| `link_status` | **Required Business** | Enum (`ACTIVE`, `INACTIVE`) | Active state of link. |
| `created_at` | **Necessary Technical** | ISO 8601 Timestamp | Creation timestamp. |
| `updated_at` | **Necessary Technical** | ISO 8601 Timestamp | Last update timestamp. |

---

## 8. Summary of Migration Risks & Safeguards

1. **Live Header Integrity:** The canonical spreadsheet currently contains row 1 headers with zero data rows in working tabs. Appending columns (`subject`, `student_email`, `per_class`, `in_INR`, `next_due_date`, `credit_applied`, `student_name`) to the end of existing sheets preserves 100% backward compatibility with `HeaderMapper.gs`.
2. **Formula Immunity:** Zero native spreadsheet formulas exist; all calculations are executed in Apps Script domain services. Adding columns can never break cell formulas.
3. **Backup Snapshot:** An authoritative pre-launch master backup copy exists (`Master Backup (Pre-Launch 2026-10-21T06-54-52-647Z)`). An automated snapshot will be taken immediately before any schema additions.
4. **Read-Only Verification:** During this review phase, zero live rows, headers, or settings were modified. All 103 Vitest tests pass.

---

## 9. Final Concluding Summary

### 1. The Recommended Final Schema
The **Pragmatic 6-Tab Architecture**:
- **`Students`:** 10 core fields with dedicated physical `subject` and `student_email` columns, plus unified `student_name`.
- **`Packages`:** 11 core fields covering all four billing models (`PACKAGE`, `MONTHLY`, `YEARLY`, `PER_CLASS`) with `per_class` and `next_due_date`.
- **`ClassSessions`:** Scheduling, lesson topics, attendance marking, and credit deduction safeguards.
- **`FeeObligations`:** Invoices with `credit_applied` to handle forward credits cleanly.
- **`Payments`:** Immutable cash transaction ledger with bank UTR reference and voiding support.
- **`MeetingLinks`:** Streamlined primary (`link1`) and backup (`link2`) room URLs.
- *Operational tabs (`AuditLog`, `AppConfig`, `ImportBatches`) remain completely hidden in the background.*

### 2. The Minimum Necessary Changes
1. Add physical `subject` column to `Students` sheet.
2. Add physical `student_email` column to `Students` sheet.
3. Add physical `per_class` and `next_due_date` columns to `Packages` sheet.
4. Add physical `credit_applied` column to `FeeObligations` sheet.
5. Add `student_name` column to child sheets (`Packages`, `ClassSessions`, `FeeObligations`, `Payments`, `MeetingLinks`) for direct sheet readability.

### 3. Changes That Can Be Avoided
1. **DO NOT ADD `PaymentAllocations` table:** Enterprise overhead avoided. Solved with single `credit_applied` column on invoices.
2. **DO NOT DELETE `Enrollments` tab immediately:** Deprecate at the application level; leave the physical tab empty to avoid risk.
3. **DO NOT COMPLICATE `MeetingLinks` UI:** Avoid multi-screen meeting link management; surface `link1` and `link2` directly on Student and Class forms.
4. **DO NOT STORE STATIC BALANCES:** Keep `class_consumed`, `class remaining`, and `outstanding_balance` dynamically derived to guarantee zero data drift.

### 4. Decisions That Genuinely Require Owner Approval
Before implementation begins, your explicit confirmation is requested on:
1. **Approval to append the 6 missing columns** (`subject`, `student_email`, `per_class`, `next_due_date`, `credit_applied`, `student_name`) to the canonical Google Sheet.
2. **Approval of the `credit_applied` model** for carrying overpayments forward without a separate `PaymentAllocations` table.
3. **Decision on `in_INR`:** Confirm whether to include `in_INR` as an optional column on `Packages` or omit it.
4. **Approval of the final migration plan** before pushing changes to Apps Script version `@23`.

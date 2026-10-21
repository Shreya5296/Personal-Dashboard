# Minimal Schema Redesign & Final Data Model Proposal

**Document Version:** 1.0.0  
**Status:** Ready for Project Owner Review (No live data modified)  
**Date:** October 21, 2026  
**Architecture:** Google Sheets + Google Apps Script + React/TypeScript/Vite (Zero-GCP)

---

## 1. Executive Summary & Objective

The objective of this schema redesign is to streamline the Personal Dashboard's Google Sheets data model into **6 clean working tabs** while maintaining strict auditability, zero data drift, and complete support for private tutoring operations:
1. **Student & Parent Directory** with primary contact channels and subjects.
2. **Multiple Fee & Package Models**: Monthly subscriptions, yearly subscriptions, per-class billing, and prepaid class packages.
3. **Rigorous Credit Calculation**: Consumed and remaining class credits dynamically derived from authoritative attendance records, preventing balance drift from manual sheet edits.
4. **Calendar Scheduling & Attendance**: Manual teacher and student attendance tracking with explicit credit deduction rules.
5. **Session & Student Meeting Links**: Primary and backup links per student, with optional session-level meeting URL overrides.
6. **Financial Invoicing & Payment History**: Clear separation of fee obligations and immutable, partial-payment-supporting transaction records.
7. **Protected Internal State**: Hiding internal audit and import tabs from daily view without breaking backend integration.
8. **Preservation of `Enrollments`**: The legacy `Enrollments` tab remains intact and un-deleted pending owner approval.

---

## 2. Final Working Tab Architecture (6 Visible Tabs + 4 Hidden Operational Tabs)

```
Visible Working Tabs (6)
├── 1. Students          (Student profile, parent contacts, subjects, active status)
├── 2. Packages          (Prepaid blocks, monthly/yearly plans, per-class rates, next due dates)
├── 3. ClassSessions     (Scheduled classes, teacher/student attendance, credit deductions)
├── 4. FeeObligations    (Invoices, recurring billing periods, due amounts)
├── 5. Payments          (Immutable cash/UPI transaction ledger, partial payments)
└── 6. MeetingLinks      (Primary and backup video conference URLs)

Retained & Hidden Operational Tabs (4)
├── 7. AuditLog          (Immutable event log of all administrative actions)
├── 8. ImportBatches     (Batch metadata for spreadsheet import and reconciliation)
├── 9. ImportRowResults  (Row-level staging and reconciliation results)
└── 10. AppConfig        (Runtime system settings, currency formatting, version flags)

Legacy Tab Retained Intact (1)
└── 11. Enrollments      (Preserved during transition; no live columns or rows altered)
```

---

## 3. Detailed Data Model Specification

### Tab 1: `Students` (Exactly 9 columns)
Authoritative directory of active and archived students.

| Column Header | Data Type | Required | Description | Sample Value |
|---|---|---|---|---|
| `student_id` | String (`stu_...`) | Yes | Unique immutable identifier | `stu_k92j8fms01` |
| `student_name` | String | Yes | Student's full display name | `Aarav Sharma` |
| `parent_name` | String | Yes | Primary parent or guardian name | `Rajesh Sharma` |
| `parent_phone` | String | Yes | Parent phone number (WhatsApp/call) | `+919876543210` |
| `student_phone` | String | No | Direct student phone number | `+919876543211` |
| `parent_email` | String | No | Parent email for billing notifications | `parent.sharma@example.com` |
| `student_email` | String | No | Student email for calendar invites | `aarav@example.com` |
| `subject` | String | No | Dedicated subject column | `Grade 10 Mathematics` |
| `status` | Enum | Yes | `ACTIVE`, `INACTIVE`, `ARCHIVED` | `ACTIVE` |

---

### Tab 2: `Packages` (Exactly 11 columns)
Defines course blocks, fee structures, and billing plans.

| Column Header | Data Type | Required | Description | Sample Value |
|---|---|---|---|---|
| `package_id` | String (`pkg_...`) | Yes | Unique package/plan identifier | `pkg_82hx91nd44` |
| `student_id` | String (`stu_...`) | Yes | Foreign key to `Students` | `stu_k92j8fms01` |
| `student_name` | String | Yes | Student name snapshot for readability | `Aarav Sharma` |
| `plan_type` | Enum/Text | Yes | Billing model: `PACKAGE`, `MONTHLY`, `YEARLY`, `PER_CLASS` | `PACKAGE` |
| `currency` | String | Yes | Currency code (`INR`) | `INR` |
| `package_price` | Number | Yes | Total agreed price or recurring billing amount | `12000` |
| `per_class` | Number | No | Effective rate per individual session | `1200` |
| `classes_purchased` | Number | Yes | Total sessions purchased (0 for unlimited time plans) | `10` |
| `start_date` | Date (YYYY-MM-DD) | Yes | Plan commencement date | `2026-10-01` |
| `end_date` | Date (YYYY-MM-DD) | No | Plan expiration or validity end date | `2026-11-01` |
| `next_due_date` | Date (YYYY-MM-DD) | No | Next billing invoice milestone date | `2026-11-01` |

> [!IMPORTANT]
> **Authoritative Balance Invariant:**  
> `consumed_classes` and `remaining_classes` are **NOT** stored as static, drifting columns in the spreadsheet. They are dynamically derived at read-time by summing valid `credit_deducted` entries in `ClassSessions`.

---

### Tab 3: `ClassSessions` (Exactly 19 columns)
Calendar events, completed lessons, teacher/student attendance, and credit effects.

| Column Header | Data Type | Required | Description | Sample Value |
|---|---|---|---|---|
| `class_session_id` | String (`cls_...`) | Yes | Unique class session identifier | `cls_91nd72bf11` |
| `student_id` | String (`stu_...`) | Yes | Foreign key to `Students` | `stu_k92j8fms01` |
| `student_name` | String | Yes | Student name snapshot | `Aarav Sharma` |
| `package_id` | String (`pkg_...`) | No | Associated package (if consuming prepaid credits) | `pkg_82hx91nd44` |
| `meeting_link_id` | String (`ml_...`) | No | Virtual meeting room link used for class | `ml_19nd83hf44` |
| `class_title` | String | Yes | Human-readable title | `Rotational Mechanics` |
| `scheduled_start` | ISO Timestamp | Yes | Scheduled start time | `2026-10-21T17:00:00.000Z` |
| `scheduled_end` | ISO Timestamp | Yes | Scheduled end time | `2026-10-21T18:00:00.000Z` |
| `actual_start` | ISO Timestamp | No | Actual start time if recorded | `2026-10-21T17:02:00.000Z` |
| `actual_end` | ISO Timestamp | No | Actual end time if recorded | `2026-10-21T18:01:00.000Z` |
| `session_status` | Enum | Yes | `SCHEDULED`, `COMPLETED`, `CANCELLED`, `RESCHEDULED`, `NO_SHOW` | `COMPLETED` |
| `attendance_status` | Enum | Yes | `NOT_MARKED`, `ATTENDED`, `ABSENT`, `EXCUSED` | `ATTENDED` |
| `class_credit_effect` | Enum | Yes | `PENDING`, `CONSUME`, `NO_CONSUME`, `CREDIT_BACK` | `CONSUME` |
| `cancellation_reason` | String | No | Reason for cancellation or notice window | `Sick with >24h notice` |
| `credit_restoration_for_session_id` | String | Conditional | Populated ONLY for `CREDIT_BACK` records | `` |
| `notes` | String | No | Lesson homework, topics covered, or remarks | `Covered Rotational Dynamics` |
| `created_at` | ISO Timestamp | Yes | Record creation timestamp | `2026-10-20T10:00:00.000Z` |
| `updated_at` | ISO Timestamp | Yes | Last modification timestamp | `2026-10-21T18:05:00.000Z` |
| `completed_at` | ISO Timestamp | No | Timestamp when attendance was marked | `2026-10-21T18:05:00.000Z` |

---

### Tab 4: `FeeObligations` (Exactly 16 columns)
Authoritative invoice demands and recurring fee obligations.

| Column Header | Data Type | Required | Description | Sample Value |
|---|---|---|---|---|
| `fee_obligation_id` | String (`fee_...`) | Yes | Unique fee obligation identifier | `fee_48fn19kd22` |
| `student_id` | String (`stu_...`) | Yes | Foreign key to `Students` | `stu_k92j8fms01` |
| `student_name` | String | Yes | Student name snapshot | `Aarav Sharma` |
| `package_id` | String (`pkg_...`) | No | Optional reference to package | `pkg_82hx91nd44` |
| `obligation_description` | String | Yes | Period or description | `October 2026 Tutoring (4 classes @ ₹1,500)` |
| `amount_due` | Number | Yes | Total billed obligation before credit | `6000.00` |
| `credit_applied` | Number | Yes | Overpayment credit absorbed by invoice | `0.00` |
| `currency` | String | Yes | Currency code (`INR`) | `INR` |
| `issue_date` | Date (YYYY-MM-DD) | Yes | Issuance date | `2026-10-21` |
| `due_date` | Date (YYYY-MM-DD) | Yes | Payment deadline | `2026-11-05` |
| `obligation_status` | Enum | Yes | `OPEN`, `PARTIALLY_PAID`, `PAID`, `VOID` | `OPEN` |
| `notes` | String | No | Invoicing remarks or payment terms | `Generated via Monthly Invoice Preview` |
| `created_at` | ISO Timestamp | Yes | Creation timestamp | `2026-10-25T09:00:00.000Z` |
| `updated_at` | ISO Timestamp | Yes | Last modification timestamp | `2026-10-26T14:30:00.000Z` |
| `voided_at` | ISO Timestamp | No | Timestamp if invoice was voided | `` |
| `void_reason` | String | No | Administrative justification for void | `` |

---

### Tab 5: `Payments` (Exactly 16 columns)
Immutable ledger of financial receipts, partial payments, and unapplied student credit.

| Column Header | Data Type | Required | Description | Sample Value |
|---|---|---|---|---|
| `payment_id` | String (`pay_...`) | Yes | Unique payment receipt identifier | `pay_73kd91nb33` |
| `student_id` | String (`stu_...`) | Yes | Foreign key to `Students` | `stu_k92j8fms01` |
| `student_name` | String | Yes | Student name snapshot | `Aarav Sharma` |
| `fee_obligation_id` | String (`fee_...`) | Yes | Foreign key to `FeeObligations` | `fee_48fn19kd22` |
| `payment_date` | Date (YYYY-MM-DD) | Yes | Date funds were received | `2026-10-26` |
| `amount` | Number | Yes | Total amount received in this transaction | `7000.00` |
| `currency` | String | Yes | Transaction currency (`INR`) | `INR` |
| `payment_method` | Enum | Yes | `UPI`, `BANK_TRANSFER`, `CASH`, `CHEQUE`, `OTHER` | `UPI` |
| `transaction_reference` | String | No | Bank UTR or transaction reference number | `UPI/428919201928` |
| `idempotency_key` | String | Yes | Client UUID preventing double-submission | `idemp_83fn2019` |
| `payment_status` | Enum | Yes | `RECORDED`, `VOID` | `RECORDED` |
| `notes` | String | No | Transaction remarks | `Overpayment of ₹1,000 tracked as unapplied credit` |
| `created_at` | ISO Timestamp | Yes | Creation timestamp | `2026-10-26T14:30:00.000Z` |
| `updated_at` | ISO Timestamp | Yes | Modification timestamp | `2026-10-26T14:30:00.000Z` |
| `voided_at` | ISO Timestamp | No | Timestamp if payment was voided | `` |
| `void_reason` | String | No | Justification for void | `` |

---

### Tab 6: `MeetingLinks` (Exactly 10 columns)
Configured virtual meeting rooms and online conference URLs per student.

| Column Header | Data Type | Required | Description | Sample Value |
|---|---|---|---|---|
| `meeting_link_id` | String (`ml_...`) | Yes | Unique meeting link identifier | `ml_19nd83hf44` |
| `student_id` | String (`stu_...`) | Yes | Foreign key to `Students` | `stu_k92j8fms01` |
| `student_name` | String | Yes | Student name snapshot | `Aarav Sharma` |
| `link_label` | String | Yes | Label (e.g. Primary Google Meet, Backup Zoom) | `Primary Google Meet` |
| `meeting_url` | String (HTTPS URL) | Yes | Default Google Meet / Zoom URL | `https://meet.google.com/abc-defg-hij` |
| `provider` | Enum | Yes | `GOOGLE_MEET`, `ZOOM`, `OTHER` | `GOOGLE_MEET` |
| `is_preferred` | Boolean | Yes | `TRUE` if default primary link for student | `TRUE` |
| `link_status` | Enum | Yes | `ACTIVE`, `INACTIVE` | `ACTIVE` |
| `created_at` | ISO Timestamp | Yes | Creation timestamp | `2026-10-01T09:00:00.000Z` |
| `updated_at` | ISO Timestamp | Yes | Modification timestamp | `2026-10-01T09:00:00.000Z` |

---

## 4. Unapplied Payment Credit & Ledger Invariant

Overpayments are explicitly supported and tracked as student credit balances rather than being rejected or silently misallocated:

1. **Storage Invariant:**
   - When a payment is recorded against an obligation `fee_id`:
     * If `payment.amount <= fee.outstanding_balance`:
       - `applied_amount = payment.amount`
       - `unapplied_amount = 0`
     * If `payment.amount > fee.outstanding_balance`:
       - `applied_amount = fee.outstanding_balance`
       - `unapplied_amount = payment.amount - fee.outstanding_balance`
   - Advance payments recorded without an existing `fee_id` are stored with:
     * `applied_amount = 0`
     * `unapplied_amount = payment.amount`
2. **Dynamic Balance Derivation:**
   $$\text{Student Unapplied Credit} = \sum_{\text{Payments}} (\text{unapplied\_amount}) - \sum_{\text{Credit Applications}} (\text{allocated\_amount})$$
3. **Application to Future Obligations:**
   - When a new fee invoice is created, the system inspects the student's available unapplied credit.
   - If available, the UI presents an **"Apply Available Credit"** banner.
   - Upon confirmation, an allocation transaction is recorded linking the credit to the target `fee_id`.
4. **Auditability & Void Reversal:**
   - If a payment with unapplied credit is voided, both its applied portion and unapplied portion are immediately zeroed out.
   - An audit event (`PAYMENT_VOID`) is written to `AuditLog`.

---

## 5. Monthly Per-Class Invoice Generation Workflow

To prevent billing errors and give the tutor explicit review control:

1. **Preview Step (Non-destructive):**
   - Tutor selects a billing month (e.g. October 2026) and student.
   - System queries all `ClassSessions` matching:
     * `student_id == student`
     * `session_status == 'COMPLETED'`
     * `teacher_attended == TRUE && student_attended == TRUE` (or unexcused no-show)
     * `billed_fee_id == ''` (unbilled)
     * `class_date` falls within the billing window.
   - Renders a preview table displaying:
     * Student name
     * Billing period
     * List of eligible class dates & topics
     * Applicable session rate (e.g. ₹1,500)
     * Currency (`INR`)
     * Total proposed fee amount
2. **Duplicate-Generation Protection:**
   - The system checks whether a `FeeObligations` record already exists for the same `student_id` and `billing_period`.
   - If found, creation is prevented with a descriptive warning.
3. **Explicit Confirmation & Generation:**
   - Upon tutor clicking **"Confirm & Create Invoice"**:
     * A new `FeeObligations` record is created.
     * `billed_class_ids` is stored on the obligation as a comma-separated list of session IDs.
     * Each included `ClassSessions` record has its `billed_fee_id` stamped with the new `fee_id`.
4. **Audit Trail:**
   - The event `INVOICE_BATCH_GENERATE` is logged to `AuditLog`.

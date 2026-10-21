# Field Migration & Transition Mapping

**Document Version:** 1.0.0  
**Status:** Pre-Launch Proposal (No live changes applied)  
**Date:** October 21, 2026

---

## 1. Domain-by-Domain Field Migration Matrix

### 1.1 `Students` Tab Mapping

| Current Column | Proposed Column | Transformation / Rule | Action | Justification |
|---|---|---|---|---|
| `student_id` | `student_id` | Direct 1:1 copy | **Keep** | Primary key |
| `first_name` + `last_name` | `student_name` | `CONCAT(first_name, ' ', last_name).trim()` | **Combine** | Eliminates artificial split between first and last names in single-tutor setup |
| `preferred_name` | — | Fallback to `student_name` | **Deprecate** | Never utilized; captured in `notes` if needed |
| `date_of_birth` | — | Retained optionally | **Retain in schema** | Kept optional for grade/age compliance |
| `parent_guardian_name` | `parent_name` | Direct 1:1 copy | **Rename** | Cleaner, more concise standard naming |
| `primary_phone` | `parent_phone` | Direct 1:1 copy | **Rename** | Clarifies that primary contact phone is the parent's phone |
| `secondary_phone` | `student_phone` | Direct 1:1 copy | **Rename** | Clarifies direct student mobile channel |
| `parent_email` | `parent_email` | Direct 1:1 copy | **Keep** | Essential for invoice distribution |
| `(API / new)` | `student_email` | Populated from student record | **Add Column** | Dedicated column for calendar and meeting invitations |
| `(new)` | `subject` | Populated from initial package or course | **Add Column** | Allows immediate identification of tutoring subject on student directory |
| `student_status` | `status` | Direct 1:1 copy (`ACTIVE`, `INACTIVE`, `ARCHIVED`) | **Rename** | Standardized status column |
| `internal_summary` | `notes` | Direct 1:1 copy | **Rename** | Standardized notes column |
| `first_enrollment_date` | — | Derived from earliest `Packages.start_date` | **Derive** | Dynamic derivation prevents stale dates |
| `last_active_date` | — | Derived from latest `ClassSessions.class_date` | **Derive** | Dynamic derivation from attendance |
| `created_at`, `updated_at` | `created_at`, `updated_at` | Direct 1:1 copy | **Keep** | Audit timestamps |

---

### 1.2 `Packages` Tab Mapping

| Current Column | Proposed Column | Transformation / Rule | Action | Justification |
|---|---|---|---|---|
| `package_id` | `package_id` | Direct 1:1 copy | **Keep** | Primary key |
| `student_id` | `student_id` | Direct 1:1 copy | **Keep** | Foreign key to `Students` |
| `(new)` | `plan_type` | `PACKAGE`, `MONTHLY`, `YEARLY`, `PER_CLASS` | **Add Column** | Supports all 4 required tutoring billing models |
| `package_name` | `plan_name` | Direct 1:1 copy | **Rename** | Generic title accommodating non-package recurring plans |
| `currency` | `currency` | Direct 1:1 copy (`INR`) | **Keep** | Explicit currency declaration |
| `(new)` | `per_class_rate` | `package_price / purchased_classes` or rate | **Add Column** | Explicit session rate for per-class billing models |
| `package_price` | `price` | Direct 1:1 copy | **Rename** | Total agreement price or recurring subscription rate |
| `purchased_classes` | `classes_purchased` | Direct 1:1 copy | **Rename** | Total session credit allocation (0 for time subscriptions) |
| `start_date` | `start_date` | Direct 1:1 copy | **Keep** | Start of agreement |
| `(new)` | `billing_frequency` | `ONE_OFF`, `MONTHLY`, `YEARLY`, `PER_CLASS` | **Add Column** | Governs recurring invoice generation |
| `(new)` | `next_due_date` | Calculated milestone date | **Add Column** | Prevents missed recurring billing cycles |
| `package_status` | `status` | Direct 1:1 copy | **Rename** | Standardized status column |
| `notes` | `notes` | Direct 1:1 copy | **Keep** | Administrative notes |
| `created_at`, `updated_at` | `created_at`, `updated_at` | Direct 1:1 copy | **Keep** | Audit timestamps |

---

### 1.3 `ClassSessions` Tab Mapping

| Current Column | Proposed Column | Transformation / Rule | Action | Justification |
|---|---|---|---|---|
| `class_session_id` | `class_id` | Direct 1:1 copy | **Rename** | Concise standard key |
| `student_id` | `student_id` | Direct 1:1 copy | **Keep** | Foreign key to `Students` |
| `package_id` | `package_id` | Direct 1:1 copy | **Keep** | Foreign key to `Packages` |
| `(new)` | `billed_fee_id` | Populated upon periodic monthly invoicing | **Add Column** | Prevents double-invoicing completed sessions |
| `scheduled_start` (timestamp) | `class_date` + `start_time` | Split ISO into YYYY-MM-DD and HH:mm | **Separate** | Human-readable spreadsheet display & fast daily calendar filtering |
| `scheduled_end` (timestamp) | `end_time` | Extracted HH:mm | **Separate** | Session timing boundary |
| `(new)` | `duration_minutes` | Extracted difference in minutes | **Add Column** | Calendar block rendering |
| `session_status` | `status` | `SCHEDULED`, `COMPLETED`, `CANCELLED`, `RESCHEDULED` | **Rename** | Standardized lifecycle status |
| `attendance_status` | `teacher_attended` + `student_attended` | Boolean breakdown | **Refine** | Independent recording of teacher presence and student attendance |
| `class_credit_effect` | `credit_deducted` | `CONSUME` $\rightarrow$ 1, `NO_CONSUME` $\rightarrow$ 0, `CREDIT_BACK` $\rightarrow$ -1 | **Convert** | Direct numerical credit adjustment; sums directly to total consumed credits |
| `(new)` | `credit_waiver` | Explicit tutor waiver flag | **Add Column** | Records when tutor waives late-cancellation penalty |
| `meeting_link_id` | `meeting_link` | Resolved direct URL or override URL | **Streamline** | One-click access to meeting room without looking up foreign keys |
| `notes` | `notes` | Direct 1:1 copy | **Keep** | Homework, topics, or cancellation remarks |
| `created_at`, `updated_at` | `created_at`, `updated_at` | Direct 1:1 copy | **Keep** | Audit timestamps |

---

### 1.4 `FeeObligations` Tab Mapping

| Current Column | Proposed Column | Transformation / Rule | Action | Justification |
|---|---|---|---|---|
| `fee_obligation_id` | `fee_id` | Direct 1:1 copy | **Rename** | Concise standard key |
| `student_id` | `student_id` | Direct 1:1 copy | **Keep** | Foreign key to `Students` |
| `package_id` | `package_id` | Direct 1:1 copy | **Keep** | Foreign key to `Packages` |
| `obligation_description` | `billing_period` / `description` | Direct 1:1 copy | **Rename** | Accommodates monthly periods ("Oct 2026") and custom fees |
| `(new)` | `billed_class_ids` | Stored comma-separated session IDs | **Add Column** | Explicit audit trail of sessions billed |
| `amount_due` | `amount` | Direct 1:1 copy | **Rename** | Concise amount header |
| `currency` | `currency` | Direct 1:1 copy (`INR`) | **Keep** | Currency isolation |
| `due_date` | `due_date` | Direct 1:1 copy | **Keep** | Invoicing deadline |
| `obligation_status` | `status` | `OPEN`, `PARTIALLY_PAID`, `PAID`, `VOID` | **Rename** | Derived dynamically from non-voided payments |
| `notes` | `notes` | Direct 1:1 copy | **Keep** | Invoice notes |
| `created_at`, `updated_at` | `created_at`, `updated_at` | Direct 1:1 copy | **Keep** | Audit timestamps |
| `voided_at`, `void_reason` | `voided_at`, `void_reason` | Direct 1:1 copy | **Keep** | Financial audit preservation |

---

### 1.5 `Payments` Tab Mapping

| Current Column | Proposed Column | Transformation / Rule | Action | Justification |
|---|---|---|---|---|
| `payment_id` | `payment_id` | Direct 1:1 copy | **Keep** | Primary key |
| `student_id` | `student_id` | Direct 1:1 copy | **Keep** | Foreign key to `Students` |
| `fee_obligation_id` | `fee_id` | Direct 1:1 copy | **Rename** | Foreign key to `FeeObligations` |
| `(new)` | `package_id` | Linked via `FeeObligations.package_id` | **Add Column** | Allows direct financial reporting by course package |
| `payment_date` | `payment_date` | Direct 1:1 copy | **Keep** | Receipt date |
| `amount` | `amount` | Direct 1:1 copy | **Keep** | Exact receipt value |
| `(new)` | `applied_amount` | `min(amount, fee.outstanding)` | **Add Column** | Portion covering target obligation |
| `(new)` | `unapplied_amount` | `max(0, amount - applied_amount)` | **Add Column** | Holds overpayment credit for future fees |
| `currency` | `currency` | Direct 1:1 copy (`INR`) | **Keep** | Currency safety |
| `payment_method` | `payment_method` | `UPI`, `BANK_TRANSFER`, `CASH`, `CHEQUE`, `OTHER` | **Keep** | Payment instrument tracking |
| `transaction_reference` | `reference` | Direct 1:1 copy | **Rename** | Concise header (UTR / Cheque #) |
| `payment_status` | `status` | `RECORDED`, `VOID` | **Rename** | Standardized status |
| `idempotency_key` | `idempotency_key` | Direct 1:1 copy | **Keep** | Duplicate-submission safety |
| `notes` | `notes` | Direct 1:1 copy | **Keep** | Transaction notes |
| `created_at`, `updated_at` | `created_at`, `updated_at` | Direct 1:1 copy | **Keep** | Audit timestamps |
| `voided_at`, `void_reason` | `voided_at`, `void_reason` | Direct 1:1 copy | **Keep** | Financial void audit history |

---

### 1.6 `MeetingLinks` Tab Mapping

| Current Column | Proposed Column | Transformation / Rule | Action | Justification |
|---|---|---|---|---|
| `meeting_link_id` | `meeting_link_id` | Direct 1:1 copy | **Keep** | Primary key |
| `student_id` | `student_id` | Direct 1:1 copy | **Keep** | Foreign key to `Students` |
| `meeting_url` (where `is_preferred = true`) | `primary_link` | Direct copy of preferred link | **Combine** | Eliminates relational join for standard student meeting room |
| `meeting_url` (where `is_preferred = false`) | `backup_link` | Direct copy of secondary link | **Combine** | Provides immediate fallback link if primary Google Meet fails |
| `notes` | `notes` | Direct 1:1 copy | **Keep** | Room passcode or access instructions |
| `created_at`, `updated_at` | `created_at`, `updated_at` | Direct 1:1 copy | **Keep** | Audit timestamps |

---

### 1.7 Operational & Legacy Tabs

| Tab Name | Role | Future Status | Action |
|---|---|---|---|
| `Enrollments` | Legacy parent grouping | Retained intact | **Do not delete or modify live rows** |
| `StudentNotes` | Progress & discussion notes | Can be retained or merged into `Students.notes` | **Retained visible or consolidated** |
| `AuditLog` | Security & compliance trail | Internal operational | **Hide tab in Google Sheets UI** |
| `ImportBatches` | CSV batch metadata | Internal operational | **Hide tab in Google Sheets UI** |
| `ImportRowResults` | Staging reconciliation rows | Internal operational | **Hide tab in Google Sheets UI** |
| `AppConfig` | System parameters | Internal operational | **Hide tab in Google Sheets UI** |

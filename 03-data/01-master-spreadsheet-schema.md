# 03 Data — 01 Master Spreadsheet Schema

**Status:** Architecture specification  
**Version:** 1.0.0  
**Applies to:** Student Management Dashboard, Version 1  
**Canonical datastore:** One private Google Spreadsheet  
**Default timezone:** `Asia/Kolkata`  
**Default currency:** `INR`

## 1. Purpose

This document is the authoritative specification for the master Google Spreadsheet: its tabs, exact column names and order, field types, requiredness, relationships, allowed values, and integrity rules. The frontend must never access the spreadsheet directly. All reads and writes go through the authenticated Google Apps Script backend.

The schema is intentionally normalized enough to preserve history and avoid duplicated financial or class-balance values, without introducing a separate database or unnecessary infrastructure.

## 2. Global conventions

### 2.1 Spreadsheet rules

- Use one private spreadsheet as the canonical datastore.
- Tab names and header names are case-sensitive and must match this document exactly.
- Row 1 of every tab contains the headers; records begin on row 2.
- Do not merge cells, add title rows above headers, or place notes in the data range.
- Do not use row numbers as identifiers or foreign keys.
- Do not rename, reorder, remove, or add production columns manually without a documented schema migration.
- Backend code maps records by validated header name, not fixed column letters.
- Sorting rows must never change the meaning or identity of records.
- Filters and formatting may be used, but must not alter the schema.

### 2.2 Field conventions

- `*_id`: immutable backend-generated string identifier, unique within its entity type.
- `created_at`, `updated_at`, and other timestamp fields: ISO 8601 timestamps with an explicit timezone or normalized UTC representation. The UI displays timestamps in `Asia/Kolkata`.
- Date-only fields: ISO `YYYY-MM-DD` semantics; they must not be shifted by timezone conversion.
- Monetary fields: numeric cell values in INR, never strings containing currency symbols. Use two-decimal precision for calculations and display.
- Boolean fields: actual boolean values, not arbitrary strings such as `yes`, `no`, `true`, or `false`.
- Enum fields: only the documented uppercase values.
- Optional fields: blank when absent; do not use invented placeholders such as `N/A`, `-`, or `unknown` as substitutes for empty values.
- Text values must be trimmed and length-validated by the backend.
- IDs must not be derived from a student's name, phone number, email, or row number.

### 2.3 Identifier format

The backend generates IDs using a type prefix and a collision-resistant unique value. Prefixes are for readability only; uniqueness must not depend on the prefix alone.

Recommended prefixes:

- `stu_` — Students
- `enr_` — Enrollments
- `pkg_` — Packages
- `fee_` — Fee obligations
- `pay_` — Payments
- `cls_` — Class sessions
- `ml_` — Meeting links
- `note_` — Student notes
- `aud_` — Audit log entries
- `imp_` — Import batches
- `irr_` — Import row results

IDs are immutable after creation. Import routines must preserve an existing target ID when updating a matched record; they must not generate a replacement ID for an existing entity.

## 3. Tab inventory

Create exactly these tabs for Version 1, in this order:

1. `Students`
2. `Enrollments`
3. `Packages`
4. `FeeObligations`
5. `Payments`
6. `ClassSessions`
7. `MeetingLinks`
8. `StudentNotes`
9. `AuditLog`
10. `ImportBatches`
11. `ImportRowResults`
12. `AppConfig`

The backend must validate all required tabs and headers before serving normal application requests. It must fail closed when a required tab or required header is missing or duplicated. It must not silently create a differently named replacement tab.

## 4. `Students`

**Purpose:** One durable identity record per student, including basic contact details and lifecycle status.

| # | Column | Type | Required | Rules |
|---:|---|---|---|---|
| 1 | `student_id` | String ID | Yes | Unique, immutable; primary key |
| 2 | `first_name` | Text | Yes | Trimmed; non-empty |
| 3 | `last_name` | Text | No | Trimmed |
| 4 | `preferred_name` | Text | No | Trimmed |
| 5 | `date_of_birth` | Date | No | Valid date; store as date-only |
| 6 | `parent_guardian_name` | Text | Yes | Required contact context |
| 7 | `parent_guardian_relationship` | Text | No | Free text, e.g. parent or guardian |
| 8 | `primary_phone` | Text | Yes | Store as text to preserve `+` and leading zeros |
| 9 | `secondary_phone` | Text | No | Store as text |
| 10 | `parent_email` | Text | No | Validate format when present |
| 11 | `city` | Text | No | Optional |
| 12 | `student_status` | Enum | Yes | `ACTIVE`, `INACTIVE`; default `ACTIVE` |
| 13 | `first_enrollment_date` | Date | No | Earliest known enrollment date; not a substitute for Enrollments |
| 14 | `last_active_date` | Date | No | Last relevant active date, based on defined application behavior |
| 15 | `internal_summary` | Text | No | Brief current summary only; dated notes belong in `StudentNotes` |
| 16 | `created_at` | Timestamp | Yes | Backend-generated |
| 17 | `updated_at` | Timestamp | Yes | Backend-maintained |
| 18 | `archived_at` | Timestamp | No | Set on transition to `INACTIVE`; clear on reactivation only if the lifecycle policy explicitly allows it; history remains in AuditLog |
| 19 | `source_reference` | Text | No | Optional migration reference; not an identity key |

**Integrity rules**

- `student_id` is the primary key.
- Phone number alone is not a safe identity-matching key.
- Inactivation must not delete or cascade-delete related records.
- A returning student should normally reuse the same student record.
- Only the backend may set IDs and system timestamps.
- `internal_summary` must not be used to store a payment ledger, class history, or multiple dated notes.

## 5. `Enrollments`

**Purpose:** A distinct period or agreement under which a student receives services. A returning student can have multiple historical enrollments.

| # | Column | Type | Required | Rules |
|---:|---|---|---|---|
| 1 | `enrollment_id` | String ID | Yes | Primary key |
| 2 | `student_id` | String ID | Yes | FK to `Students.student_id` |
| 3 | `enrollment_name` | Text | No | Human-readable label |
| 4 | `start_date` | Date | No | Date-only |
| 5 | `end_date` | Date | No | Must not precede start date when both are present |
| 6 | `enrollment_status` | Enum | Yes | `ACTIVE`, `COMPLETED`, `PAUSED`, `CANCELLED` |
| 7 | `fee_plan_name` | Text | No | Informational label for the agreed arrangement |
| 8 | `agreed_total_amount` | Money | No | Agreed commercial amount; not a live balance |
| 9 | `currency` | Enum/Text | Yes | `INR` in Version 1 |
| 10 | `billing_notes` | Text | No | Context only; never the authoritative payment record |
| 11 | `created_at` | Timestamp | Yes | Backend-generated |
| 12 | `updated_at` | Timestamp | Yes | Backend-maintained |
| 13 | `closed_at` | Timestamp | No | Set when enrollment is closed, where applicable |

**Integrity rules**

- Every enrollment references an existing student.
- A student may have many enrollments over time.
- Historical enrollments are retained.
- `agreed_total_amount` is not calculated by summing payments and must not be overwritten with the outstanding amount.
- Enrollment status does not automatically archive the student; lifecycle actions must follow business rules.

## 6. `Packages`

**Purpose:** Track a purchased allocation of classes. Packages are not payment transactions.

| # | Column | Type | Required | Rules |
|---:|---|---|---|---|
| 1 | `package_id` | String ID | Yes | Primary key |
| 2 | `student_id` | String ID | Yes | FK to Students |
| 3 | `enrollment_id` | String ID | No | FK to Enrollments; if present, must belong to the same student |
| 4 | `package_name` | Text | Yes | Human-readable label |
| 5 | `purchased_classes` | Integer | Yes | Positive integer |
| 6 | `package_price` | Money | No | Agreed package price; non-negative |
| 7 | `currency` | Enum/Text | Yes | `INR` in Version 1 |
| 8 | `purchase_date` | Date | No | Date-only |
| 9 | `start_date` | Date | No | Date-only |
| 10 | `expiry_date` | Date | No | Must not precede start date when both exist |
| 11 | `package_status` | Enum | Yes | `ACTIVE`, `EXHAUSTED`, `EXPIRED`, `CANCELLED`, `CLOSED` |
| 12 | `notes` | Text | No | Additional context |
| 13 | `created_at` | Timestamp | Yes | Backend-generated |
| 14 | `updated_at` | Timestamp | Yes | Backend-maintained |
| 15 | `closed_at` | Timestamp | No | Closure timestamp when applicable |

**Integrity rules**

- `purchased_classes` is a positive integer and is not edited to imitate class consumption.
- `package_price` is not a payment record.
- Remaining classes are calculated from the purchase allocation and eligible class-session effects; they are not maintained as a manually editable column.
- A package may be closed without deleting its class history.
- If `enrollment_id` is populated, its student must match `student_id`.
- If package adjustments are needed, they require an explicit auditable adjustment model. Version 1 must not invent adjustments through undocumented values.

## 7. `FeeObligations`

**Purpose:** Store each charge or installment that a student owes.

| # | Column | Type | Required | Rules |
|---:|---|---|---|---|
| 1 | `fee_obligation_id` | String ID | Yes | Primary key |
| 2 | `student_id` | String ID | Yes | FK to Students |
| 3 | `enrollment_id` | String ID | No | FK to Enrollments; same student |
| 4 | `package_id` | String ID | No | FK to Packages; same student |
| 5 | `obligation_description` | Text | Yes | Clear description of the charge |
| 6 | `amount_due` | Money | Yes | Numeric, non-negative |
| 7 | `currency` | Enum/Text | Yes | `INR` in Version 1 |
| 8 | `issue_date` | Date | No | Date the obligation was issued |
| 9 | `due_date` | Date | No | Due date for overdue calculation |
| 10 | `obligation_status` | Enum | Yes | `OPEN`, `PARTIALLY_PAID`, `PAID`, `VOID` |
| 11 | `notes` | Text | No | Additional context |
| 12 | `created_at` | Timestamp | Yes | Backend-generated |
| 13 | `updated_at` | Timestamp | Yes | Backend-maintained |
| 14 | `voided_at` | Timestamp | No | Required when voided |
| 15 | `void_reason` | Text | No | Required when voided |

**Calculated values, not schema columns**

- `paid_amount`: sum of valid payments allocated to this obligation.
- `outstanding_amount`: `max(0, amount_due - paid_amount)` under the no-overpayment-on-obligation policy.
- `is_overdue`: true when a due date exists, the due date is before the current local date, outstanding amount is greater than zero, and the obligation is not void.

**Integrity rules**

- Optional enrollment and package references must belong to the same student.
- `PAID` and `PARTIALLY_PAID` statuses must agree with calculated valid payments; the backend is authoritative and must repair or reject inconsistent status values.
- A `VOID` obligation does not contribute to the amount owed.
- Voiding requires a reason, timestamp, and audit entry.
- Version 1 does not silently treat excess payment as credit. Excess payment must be rejected or handled through an explicitly supported credit workflow.

## 8. `Payments`

**Purpose:** Preserve each received payment as a distinct transaction.

| # | Column | Type | Required | Rules |
|---:|---|---|---|---|
| 1 | `payment_id` | String ID | Yes | Primary key |
| 2 | `student_id` | String ID | Yes | FK to Students |
| 3 | `fee_obligation_id` | String ID | Yes | FK to FeeObligations; mandatory for every payment in Version 1; references a non-void obligation belonging to the same student |
| 4 | `payment_date` | Date | Yes | Date received, not necessarily creation date |
| 5 | `amount` | Money | Yes | Greater than zero for normal payments |
| 6 | `currency` | Enum/Text | Yes | `INR` in Version 1 |
| 7 | `payment_method` | Enum | Yes | `UPI`, `BANK_TRANSFER`, `CASH`, `CARD`, `OTHER` |
| 8 | `transaction_reference` | Text | No | External reference where available |
| 9 | `idempotency_key` | String | Yes | Unique idempotency key sent by client to deduplicate payment creation; stored with payment record |
| 10 | `payment_status` | Enum | Yes | `RECORDED`, `VOID` |
| 11 | `notes` | Text | No | Additional context |
| 12 | `created_at` | Timestamp | Yes | Backend-generated |
| 13 | `updated_at` | Timestamp | Yes | Backend-maintained |
| 14 | `voided_at` | Timestamp | No | Required when voided |
| 15 | `void_reason` | Text | No | Required when voided |

**Integrity rules**

- `fee_obligation_id` is mandatory for every payment in Version 1. Unallocated payments, advance payments, and unallocated credits are explicitly out of scope.
- The referenced obligation must exist, belong to `student_id`, must not be void, and currency must match.
- The allocated payment must not exceed the remaining obligation balance.
- A void payment remains in the ledger and does not count toward paid totals.
- Corrections must be auditable; normal UI actions must not silently delete payments.
- `idempotency_key` is required on creation and stored directly with the payment record in the spreadsheet. Do not rely only on disabling the frontend button or on an audit entry being written afterward.
- A retry with the same `idempotency_key` and equivalent payload must return the original outcome. Reusing the key with a materially different payload must return a conflict error.
- Refunds and reversals are not represented by negative normal payments. They require an explicitly defined model before implementation.

## 9. `ClassSessions`

**Purpose:** Store scheduled and historical class sessions.

| # | Column | Type | Required | Rules |
|---:|---|---|---|---|
| 1 | `class_session_id` | String ID | Yes | Primary key |
| 2 | `student_id` | String ID | Yes | FK to Students |
| 3 | `enrollment_id` | String ID | No | FK to Enrollments; same student |
| 4 | `package_id` | String ID | No | FK to Packages; same student and compatible enrollment |
| 5 | `meeting_link_id` | String ID | No | FK to MeetingLinks; same student |
| 6 | `class_title` | Text | Yes | Human-readable label; supply a frontend default such as 'Class session' if left blank by the administrator |
| 7 | `scheduled_start` | Timestamp | Yes | Stored with unambiguous timezone semantics |
| 8 | `scheduled_end` | Timestamp | Yes | Must be later than scheduled start; when duration is entered in the UI, calculate and persist the end timestamp |
| 9 | `actual_start` | Timestamp | No | Actual start, if recorded |
| 10 | `actual_end` | Timestamp | No | Must be later than actual start when both supplied |
| 11 | `session_status` | Enum | Yes | `SCHEDULED`, `COMPLETED`, `CANCELLED`, `RESCHEDULED`, `NO_SHOW` |
| 12 | `attendance_status` | Enum | Yes | `NOT_MARKED`, `ATTENDED`, `ABSENT`, `EXCUSED` |
| 13 | `class_credit_effect` | Enum | Yes | `PENDING`, `CONSUME`, `NO_CONSUME`, `CREDIT_BACK`; controlled by business rules |
| 14 | `cancellation_reason` | Text | No | Required for cancellation where policy requires it |
| 15 | `credit_restoration_for_session_id` | String ID | Conditional | References `ClassSessions.class_session_id`; mandatory when `class_credit_effect` is `CREDIT_BACK`; blank otherwise; unique across all restorations |
| 16 | `notes` | Text | No | Session-specific notes |
| 17 | `created_at` | Timestamp | Yes | Backend-generated |
| 18 | `updated_at` | Timestamp | Yes | Backend-maintained |
| 19 | `completed_at` | Timestamp | No | Set when completion is recorded |

**Integrity rules**

- A session must reference an existing student.
- Any populated enrollment, package, and meeting-link references must be valid and consistent with that student.
- A scheduled session must not consume a class merely because it exists (`class_credit_effect = PENDING`).
- The Version 1 class-credit policy is explicit and finalized:
  - `COMPLETED and attended`: Consume one credit (`CONSUME`) when linked to an eligible package.
  - `NO_SHOW`: No credit consumed by default (`NO_CONSUME`).
  - `ABSENT`: No credit consumed by default (`NO_CONSUME`).
  - `EXCUSED`: No credit consumed (`NO_CONSUME`).
  - `CANCELLED`: No credit consumed by default (`NO_CONSUME`; late cancellations are treated as `CANCELLED` under this default policy).
  - `RESCHEDULED`: No credit consumed by the superseded session (`NO_CONSUME`).
  - A completed session without an eligible package must not change any package balance (`NO_CONSUME`).
- `CREDIT_BACK`: Restores one previously consumed class credit only as part of an audited correction.
  - Recorded as a dedicated `ClassSessions` record with `class_credit_effect = CREDIT_BACK` and `credit_restoration_for_session_id` populated with the `class_session_id` of the original `CONSUME` session.
  - The original session preserves `class_credit_effect = CONSUME`. A given `credit_restoration_for_session_id` can appear at most once across all restorations, guaranteeing that the same consumed credit is never restored twice.
  - **Field population for restoration records:** `class_title` is set to `"Credit Restoration: " + original_title` (or default `"Credit Restoration"`), `scheduled_start` is set to the restoration timestamp, `scheduled_end` is set equal to `scheduled_start` (zero duration), `actual_start`/`actual_end` are blank, `session_status` is `COMPLETED`, `attendance_status` is `NOT_MARKED`, `meeting_link_id` is blank, `completed_at` is the restoration timestamp, and `notes` stores the administrative reason.
  - **Operational isolation:** Operational queries for schedules, calendars, upcoming sessions, next scheduled class, and attendance queues MUST filter out `class_credit_effect = CREDIT_BACK`. Restoration records appear exclusively in the student package ledger / credit balance audit trail.
  - **Immutability:** `CREDIT_BACK` records are terminal; the backend rejects any reschedule, cancel, or attendance update requests targeting them.
- Deduplication strategy for class completion: existing-state check, script locking, and single-credit-consumption protection. Changing a session from scheduled to completed must not consume a second credit on retry.
- Rescheduling must preserve the original change in the audit trail and must not create duplicate class consumption.
- `class_credit_effect` is an enum, not free-form text. Its valid transitions are defined in the business-rules document.

## 10. `MeetingLinks`

**Purpose:** Store multiple meeting links per student, including separate Zoom and Google Meet links.

| # | Column | Type | Required | Rules |
|---:|---|---|---|---|
| 1 | `meeting_link_id` | String ID | Yes | Primary key |
| 2 | `student_id` | String ID | Yes | FK to Students |
| 3 | `provider` | Enum | Yes | `ZOOM`, `GOOGLE_MEET`, `OTHER` |
| 4 | `link_label` | Text | Yes | E.g. Regular class, Backup link |
| 5 | `meeting_url` | URL/Text | Yes | HTTPS required; validate host against provider where possible |
| 6 | `is_preferred` | Boolean | Yes | Default false |
| 7 | `link_status` | Enum | Yes | `ACTIVE`, `INACTIVE` |
| 8 | `valid_from` | Date | No | Optional validity start |
| 9 | `valid_until` | Date | No | Optional validity end; must not precede valid_from |
| 10 | `notes` | Text | No | Additional context |
| 11 | `created_at` | Timestamp | Yes | Backend-generated |
| 12 | `updated_at` | Timestamp | Yes | Backend-maintained |
| 13 | `deactivated_at` | Timestamp | No | Set when deactivated |

**Integrity rules**

- A student may have several active links.
- At most one active preferred link is allowed per student in Version 1.
- The backend must enforce the preferred-link rule during writes, including concurrent updates.
- A link associated with a session must belong to that session's student.
- Deactivation preserves the row and its history.
- The UI must label the provider and link label before opening a link.
- Unsafe URL schemes must be rejected. A provider mismatch must be flagged rather than silently relabelled.

## 11. `StudentNotes`

**Purpose:** Dated internal notes and follow-up tracking.

| # | Column | Type | Required | Rules |
|---:|---|---|---|---|
| 1 | `note_id` | String ID | Yes | Primary key |
| 2 | `student_id` | String ID | Yes | FK to Students |
| 3 | `note_type` | Enum | Yes | `GENERAL`, `FEE`, `CLASS`, `FOLLOW_UP`, `OTHER` |
| 4 | `note_text` | Text | Yes | Non-empty, length-limited |
| 5 | `follow_up_date` | Date | No | Date-only |
| 6 | `follow_up_status` | Enum | Yes | `NOT_REQUIRED`, `OPEN`, `COMPLETED`, `CANCELLED` |
| 7 | `created_at` | Timestamp | Yes | Backend-generated |
| 8 | `updated_at` | Timestamp | Yes | Backend-maintained |
| 9 | `created_by` | Text/ID | Yes | Verified administrator identity or actor ID |

**Integrity rules**

- Notes remain available after a student becomes inactive.
- A note is not a substitute for a fee obligation, payment, or class session.
- Changes to notes must be audited.
- Avoid storing unnecessary sensitive information in free text.

## 12. `AuditLog`

**Purpose:** Append-oriented record of important application changes.

| # | Column | Type | Required | Rules |
|---:|---|---|---|---|
| 1 | `audit_id` | String ID | Yes | Primary key |
| 2 | `occurred_at` | Timestamp | Yes | Backend-generated |
| 3 | `actor_id` | Text | Yes | Verified actor identifier |
| 4 | `actor_email` | Email/Text | No | Only from verified identity |
| 5 | `entity_type` | Enum/Text | Yes | Documented entity name |
| 6 | `entity_id` | Text | Conditional | Target record ID when event targets a specific entity; blank for general or system-level events |
| 7 | `action` | Text | Yes | Documented action name |
| 8 | `before_summary` | Text/JSON string | No | Minimal safe change summary |
| 9 | `after_summary` | Text/JSON string | No | Minimal safe change summary |
| 10 | `request_id` | Text | No | Correlates API operation and audit event |
| 11 | `outcome` | Enum | Yes | `SUCCESS`, `FAILURE` |
| 12 | `error_code` | Text | No | Safe error code; no secrets |

**Integrity rules**

- Audit entries are written by the backend and are not editable through normal application operations.
- Do not copy authentication tokens or unnecessary student/financial details into summaries.
- A successful audit outcome must not be written before the associated mutation is known to have succeeded.
- Where the spreadsheet cannot provide atomic transaction behavior, the backend must document and test the order of mutation and audit writes, plus reconciliation for partial failures.
- AuditLog is an operational audit trail, not a tamper-proof compliance system. Spreadsheet editors with direct access may still alter data; restrict access accordingly.

## 13. `ImportBatches`

**Purpose:** Track an import attempt from a source spreadsheet/tab.

| # | Column | Type | Required | Rules |
|---:|---|---|---|---|
| 1 | `import_batch_id` | String ID | Yes | Primary key |
| 2 | `source_name` | Text | Yes | Human-readable source name |
| 3 | `source_spreadsheet_id` | Text | No | Source reference; not an authorization credential |
| 4 | `source_tab_name` | Text | No | Source tab |
| 5 | `started_at` | Timestamp | Yes | Backend-generated |
| 6 | `completed_at` | Timestamp | No | Set at terminal status |
| 7 | `import_status` | Enum | Yes | `PENDING`, `RUNNING`, `COMPLETED`, `COMPLETED_WITH_ERRORS`, `FAILED` |
| 8 | `total_rows` | Integer | Yes | Non-negative |
| 9 | `imported_rows` | Integer | Yes | Non-negative |
| 10 | `skipped_rows` | Integer | Yes | Non-negative |
| 11 | `failed_rows` | Integer | Yes | Non-negative |
| 12 | `duplicate_rows` | Integer | Yes | Non-negative |
| 13 | `initiated_by` | Text | Yes | Verified administrator identity |
| 14 | `notes` | Text | No | Safe summary |

**Integrity rules**

- All counters start at zero and must be non-negative integers.
- Terminal status and counters must agree with row-level results.
- Do not mark an import complete before all results have been recorded.
- Imports must be previewable and reconciled before any destructive or overwrite operation.

## 14. `ImportRowResults`

**Purpose:** One result for each source row evaluated during an import.

| # | Column | Type | Required | Rules |
|---:|---|---|---|---|
| 1 | `import_row_result_id` | String ID | Yes | Primary key |
| 2 | `import_batch_id` | String ID | Yes | FK to ImportBatches |
| 3 | `source_row_reference` | Text | Yes | Source tab and row reference or equivalent stable locator |
| 4 | `target_entity_type` | Text | No | Target entity type when mapped |
| 5 | `target_record_id` | Text | No | ID created or matched |
| 6 | `row_status` | Enum | Yes | `IMPORTED`, `SKIPPED`, `DUPLICATE_REVIEW`, `FAILED` |
| 7 | `source_fingerprint` | Text | No | Optional deterministic fingerprint for repeat detection |
| 8 | `message` | Text | No | Safe, actionable outcome message |
| 9 | `processed_at` | Timestamp | Yes | Backend-generated |

**Integrity rules**

- Every result references an existing batch.
- Messages must not expose credentials or unnecessarily repeat personal information.
- A fingerprint supports detection; it is not the target record's identity.
- A row marked `DUPLICATE_REVIEW` must not be silently merged or overwritten.

## 15. `AppConfig`

**Purpose:** Store non-secret application settings in a documented form.

| # | Column | Type | Required | Rules |
|---:|---|---|---|---|
| 1 | `config_key` | Text | Yes | Primary key; unique |
| 2 | `config_value` | Text | Yes | Parsed and validated according to key |
| 3 | `description` | Text | No | Human-readable purpose |
| 4 | `updated_at` | Timestamp | Yes | Backend-maintained |

Initial supported keys:

- `schema_version`
- `display_currency`
- `display_timezone`
- `default_class_duration_minutes`

**Integrity rules**

- Only documented keys may be written through the application.
- Values must be validated against key-specific rules.
- Do not store tokens, passwords, OAuth client secrets, or other privileged credentials here.
- Spreadsheet IDs and deployment secrets belong in protected backend configuration, not in a frontend-visible setting.

## 16. Relationships and foreign keys

- `Enrollments.student_id` → `Students.student_id`
- `Packages.student_id` → `Students.student_id`
- `Packages.enrollment_id` → `Enrollments.enrollment_id`, when populated
- `FeeObligations.student_id` → `Students.student_id`
- `FeeObligations.enrollment_id` → `Enrollments.enrollment_id`, when populated
- `FeeObligations.package_id` → `Packages.package_id`, when populated
- `Payments.student_id` → `Students.student_id`
- `Payments.fee_obligation_id` → `FeeObligations.fee_obligation_id` (mandatory; obligation must exist, belong to the same student, not be void, and match currency)
- `ClassSessions.student_id` → `Students.student_id`
- `ClassSessions.enrollment_id` → `Enrollments.enrollment_id`, when populated
- `ClassSessions.package_id` → `Packages.package_id`, when populated
- `ClassSessions.meeting_link_id` → `MeetingLinks.meeting_link_id`, when populated
- `ClassSessions.credit_restoration_for_session_id` → `ClassSessions.class_session_id` (mandatory when `class_credit_effect = CREDIT_BACK`; references original session with `CONSUME` for same student and package; unique across all restorations)
- `MeetingLinks.student_id` → `Students.student_id`
- `StudentNotes.student_id` → `Students.student_id`
- `ImportRowResults.import_batch_id` → `ImportBatches.import_batch_id`
- `AuditLog.entity_type` and `entity_id` form a polymorphic reference and are validated according to the entity type.

A foreign-key check must verify both record existence and ownership consistency. For example, a session cannot point to Student A while referencing Student B's package or meeting link.

## 17. Derived values and source of truth

The following values are derived and must not be independently edited as authoritative data:

- Paid amount per fee obligation
- Outstanding amount per fee obligation
- Overdue status
- Total amount paid per student
- Total outstanding amount per student
- Classes consumed per package
- Remaining classes per package
- Next scheduled class
- Active meeting link selection
- Dashboard aggregate metrics

These values must be calculated by backend services from the canonical rows and valid statuses. If cached for performance, cache invalidation must be defined and the canonical records remain authoritative.

## 18. Data integrity and concurrent writes

Google Sheets does not provide relational foreign keys or general multi-row transactions. The backend must therefore:

1. Validate input and referenced records before mutation.
2. Acquire a script lock for operations that can conflict.
3. Re-read relevant state inside the lock before making a balance-sensitive decision.
4. Batch spreadsheet reads and writes where practical.
5. Keep lock duration short and release locks in a guaranteed cleanup path.
6. Avoid external network calls while holding a lock.
7. Record operation/request IDs for important mutations.
8. Detect and report partial-write failures.
9. Provide a reconciliation procedure for related-row inconsistencies.
10. Never claim an operation succeeded if persistence failed.

A script lock reduces concurrent execution conflicts but does not create a full database transaction. The implementation must not promise atomicity that the platform cannot provide.

## 19. Schema validation and migrations

At deployment or through an administrative health check, validate:

- Every required tab exists exactly once.
- Every required header exists exactly once.
- Headers match spelling and case.
- Required configuration exists.
- `schema_version` is supported.
- Existing IDs are unique and non-empty.
- Enum values are valid.
- Relationships do not point to missing records.

A migration must define the old version, new version, transformation, validation, recovery path, and tests. Never automatically delete data or rewrite production columns merely to make validation pass.

### Schema Version History and Migration Notes

- **Version 1.0.0**: Initial baseline draft schema.
- **Version 1.1.0**: Financial integrity and idempotency update:
  - Added mandatory `idempotency_key` column to `Payments` (Column 9).
  - Enforced mandatory `fee_obligation_id` on `Payments` (Required: Yes).
  - Enforced mandatory `class_title` (Required: Yes, with frontend default) and `scheduled_end` (Required: Yes, persisted from duration) on `ClassSessions`.
  - Added `credit_restoration_for_session_id` column to `ClassSessions` (Column 15) to explicitly link each `CREDIT_BACK` restoration to its original `CONSUME` session.
  - Added `CREDIT_BACK` to `class_credit_effect` enum and aligned class credit consumption rules.

## 20. Performance guidance

- Read complete ranges in batches rather than individual cells.
- Map headers to indexes once per validated schema.
- Build in-memory lookup maps for a single request when multiple related lookups are needed.
- Do not issue a separate full-sheet scan for every displayed student.
- Return only the fields and records required by a page.
- Paginate large lists and historical timelines.
- Avoid caching financial totals without a clear invalidation strategy.
- Test realistic record counts and history depth before release.

## 21. Privacy and access

- Keep the master spreadsheet private; never publish it to the web.
- Restrict direct spreadsheet access to explicitly authorized people and the required backend execution identity.
- Do not put the spreadsheet ID or any other configuration value in frontend source if it is not required there.
- Do not send tokens or sensitive student records to analytics services.
- Limit audit summaries and import error messages to operationally necessary information.
- Use synthetic data for development and automated tests.

## 22. Acceptance checklist

The schema is ready for implementation when:

- All 12 tabs and their headers are created and validated.
- Every entity has a stable primary key.
- Every relationship in Section 16 is checked server-side.
- Fee and class balances are derived rather than manually maintained.
- Inactive students retain all historical records.
- Multiple meeting links per student are supported.
- Imports have batch and row-level reconciliation records.
- Important mutations produce auditable outcomes.
- Schema validation fails safely on missing or malformed headers.
- No routine frontend operation requires direct spreadsheet access.

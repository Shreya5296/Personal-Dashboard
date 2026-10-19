# 05 — Business Rules and Workflows

## 1. Purpose and Authority

This document defines the operational rules for the Student Management Dashboard. It is authoritative for student lifecycle, enrollments, packages, fees, payments, class sessions, meeting links, notes, and related workflows.

The Google Sheets schemas are defined in `04-google-sheets-data-model.md`. API request and response contracts are defined in `06-apps-script-api-specification.md`. If an implementation detail conflicts with a rule here, stop and resolve the conflict in documentation before coding.

Version 1 is a private, single-administrator tool for managing online classes. It is not an accounting system, payment gateway, student portal, or multi-tenant product.

## 2. Global Rules

1. The backend is authoritative for validation, state transitions, balances, and record relationships.
2. The frontend may preview calculations but must not be trusted to persist authoritative totals.
3. Every entity uses a stable backend-generated ID. Names, phone numbers, spreadsheet row numbers, and sort order are not identifiers.
4. Records are related by IDs and validated on every mutation.
5. Routine operations must not hard-delete students, payments, sessions, obligations, packages, meeting links, or audit records.
6. Financial corrections and important state changes must be auditable.
7. A failed mutation must not be shown as successful.
8. Dates and times are interpreted in `Asia/Kolkata` unless a field explicitly represents a date without a time.
9. Currency is INR in Version 1. Amounts are numeric values, not formatted strings.
10. Duplicate submissions must be guarded against where an operation could create duplicate payments, classes, or imports.
11. Optional relationships may be blank only where the schema and workflow explicitly permit it.
12. The app must show the distinction between unknown, not applicable, zero, and empty values.

## 3. Student Lifecycle

### 3.1 Create a Student

1. The administrator opens the student creation form.
2. The UI validates required fields for usability.
3. The backend validates the request and normalizes supported fields.
4. The backend checks for likely duplicates using available identity/contact fields.
5. If a likely duplicate exists, the backend returns a warning or conflict requiring review; it must not silently merge records.
6. The backend generates a unique `student_id` and sets `student_status` to `ACTIVE` unless a supported explicit initial status is provided.
7. The backend records `created_at` and `updated_at` and writes an audit event.
8. The UI displays the persisted record only after the backend confirms success.

A matching phone number alone is not sufficient proof that two records represent the same student. The administrator must resolve ambiguous matches.

### 3.2 Edit a Student

- The backend verifies that the student exists.
- The backend validates changed fields and relationships.
- `student_id` and `created_at` are immutable.
- `updated_at` is refreshed after a successful change.
- Relevant changes are audited.
- Editing contact details must not rewrite historical payment, enrollment, or class records.

### 3.3 Archive a Student

Archiving is represented by `student_status = INACTIVE`, `archived_at`, and a last-active date when known.

Before archiving, the UI must explain that historical records will be retained. The backend must not cascade-delete any related records.

An administrator may archive a student even if historical fees or classes exist. Outstanding obligations remain visible in historical and financial views. Archiving does not forgive debt or mark fees paid.

The application should warn about upcoming scheduled sessions and outstanding balances. These warnings inform the administrator; they do not silently cancel sessions or alter obligations.

### 3.4 Reactivate a Student

1. The administrator opens an inactive student's profile.
2. The administrator selects Reactivate.
3. The backend changes the status to `ACTIVE`, clears `archived_at`, and updates `updated_at`.
4. Existing history remains linked to the same `student_id`.
5. The administrator creates a new enrollment or package if the returning arrangement differs from the previous one.

Reactivation must not create a new student record. The historical `last_active_date` must not be overwritten with an inferred date; update it only when a real activity date is known.

## 4. Enrollment Rules

An enrollment represents one period or commercial arrangement for one student. A student may have multiple enrollments over time, but the product must not assume that all historical enrollments are active simultaneously.

Allowed statuses are `ACTIVE`, `COMPLETED`, `PAUSED`, and `CANCELLED`.

- Every enrollment must reference an existing student.
- If an enrollment has ended, its end date must not precede its start date.
- A `CANCELLED` enrollment cannot receive new scheduled sessions without an explicit supported reopening or replacement workflow.
- A `COMPLETED` enrollment is historical; a returning student should normally receive a new enrollment.
- A `PAUSED` enrollment retains its financial and class history but should be clearly identified in operational views.
- Status changes must be audited.
- Closing an enrollment must not automatically mark its fee obligations paid, void them, or delete remaining package balances.

The initial release does not automatically prorate fees or refund unused classes. Such decisions require an explicit administrator action and a documented financial transaction or adjustment.

## 5. Package and Class-Balance Rules

A package represents a purchased allocation of classes. It is separate from a fee obligation and from the payment used to pay for it.

### 5.1 Package Creation

- `purchased_classes` must be a positive integer.
- The package must reference an existing student.
- If `enrollment_id` is present, it must belong to the same student.
- `package_price` is the agreed package price, not the amount already paid.
- Start and expiry dates, when both present, must be consistent.
- Package creation and edits are audited.

### 5.2 Remaining Classes

The authoritative balance is derived from the package allocation and qualifying class-session effects. It must not be maintained solely as a manually edited number.

For the initial model:

`remaining_classes = purchased_classes - consumed_class_credits + restored_class_credits`

Where:
- `consumed_class_credits` is the count of qualifying sessions that consume a class from this package.
- `restored_class_credits` is the count of explicitly supported, audited restorations.

The balance must never be silently clamped to zero to conceal an invalid negative balance. If an operation would make the balance negative, reject it or require a specifically defined administrative correction workflow.

A session may consume a package credit only once. Repeatedly editing or saving the same completed session must not consume multiple credits.

### 5.3 Which Sessions Consume a Credit

- `SCHEDULED`: no credit consumed.
- `CANCELLED`: no credit consumed by default.
- `RESCHEDULED`: no credit consumed by the superseded schedule; the replacement session is tracked explicitly.
- `COMPLETED`: consumes one credit when assigned to a package and marked as credit-consuming under the finalized session rules.
- `NO_SHOW`: does not consume a credit by default. The administrator must use the explicit policy configured for the business; Version 1 default is no consumption until a supported no-show charge/credit rule is approved.

A session without a package may still be scheduled and recorded, but it must not change any package balance. The UI must make the absence of a package allocation clear.

### 5.4 Package Status

- `ACTIVE`: available for eligible session allocation.
- `EXHAUSTED`: no remaining credits; cannot receive a credit-consuming session unless a valid new allocation is added.
- `EXPIRED`: expiry date has passed according to the business rule and timezone; historical data remains available.
- `CANCELLED`: cancelled by an explicit administrative action; financial consequences are not inferred automatically.
- `CLOSED`: administratively closed while retaining history.

A status is not a substitute for the calculated balance. If a package has zero remaining credits, the backend may derive `EXHAUSTED` or update it through a controlled operation. The implementation must document whether status is derived or persisted and keep that choice consistent.

## 6. Fee Obligations and Payment Rules

### 6.1 Fee Obligation Creation

A fee obligation represents an amount charged or due. It may relate to an enrollment, package, or another documented charge.

- `amount_due` must be zero or greater; zero-value obligations should be created only when operationally meaningful.
- A referenced student must exist.
- Any referenced enrollment or package must belong to the same student.
- A due date may be blank if no due date was agreed.
- Changing the agreed amount after payments have been allocated requires confirmation and an audit record.
- A fee obligation cannot be silently deleted.

### 6.2 Payment Recording

1. The administrator selects a student and the target fee obligation. Every payment must have a fee obligation; unallocated payments, advance payments, and unallocated credits are strictly out of scope in Version 1.
2. The UI displays the amount due, previously allocated payments, and current outstanding amount.
3. The administrator enters payment date, amount, method, and optional reference/note.
4. Every payment-creation request must provide an `idempotencyKey` in the request envelope.
5. The backend validates the student, obligation relationship, amount, currency, date, and payment method. The backend must reject a missing fee obligation, nonexistent or void obligation, student mismatch, currency mismatch, or payment exceeding the remaining outstanding balance.
6. The backend validates the mandatory `idempotencyKey` against persisted `Payments.idempotency_key` records. The backend must reject a missing key. A retry with the same key and equivalent payload returns the original outcome; a reused key with a different payload is rejected as a conflict.
7. The backend writes the payment with its `idempotency_key` and audit event using the agreed integrity strategy and script locking.
8. The backend returns the persisted payment and recalculated financial summary.
9. The UI refreshes the relevant views.

Normal recorded payments must have an amount greater than zero. A refund or reversal is not represented as an undocumented negative payment. Refund support is deferred until a dedicated schema and workflow are approved.

### 6.3 Allocation and Overpayment

Version 1 supports payments allocated to one fee obligation per payment record. Splitting one payment across multiple obligations is deferred unless implemented through an explicit allocation model.

A payment linked to an obligation must reference an obligation belonging to the same student.

The default rule is to reject a payment that would exceed the remaining obligation balance. If the business later needs advance payments or credits, they must be modeled explicitly rather than silently accepting overpayments.

An unallocated advance is not supported in Version 1. Therefore, every payment must reference a fee obligation. If this requirement conflicts with existing source data, the migration must flag the row for review rather than inventing an obligation.

### 6.4 Financial Calculations

For a non-void fee obligation:

`paid_amount = sum(amount of valid RECORDED payments allocated to the obligation)`

`outstanding_amount = amount_due - paid_amount`

Note: `payment_status` belongs to the `Payments` ledger and has the values `RECORDED` and `VOID`. The charge's status field is `obligation_status`.

Status rules for `obligation_status`:
- `obligation_status = PAID` when the outstanding amount is zero and the obligation is not void.
- `obligation_status = PARTIALLY_PAID` when the paid amount is greater than zero and the outstanding amount is greater than zero.
- `obligation_status = OPEN` when the paid amount is zero and the outstanding amount is greater than zero.
- `obligation_status = VOID` when the obligation has been voided under the documented rules.

Overdue is a derived display state rather than a replacement for the persisted `obligation_status`.

A void obligation does not contribute to outstanding balances. A void payment does not contribute to paid totals.

The backend must use a consistent monetary precision and rounding policy. It must not use locale-formatted strings as calculation inputs.

If calculated outstanding is negative, treat it as a data-integrity error; do not silently hide it with `max(0, ...)` under the default no-overpayment policy.

### 6.5 Due and Overdue Status

A fee is overdue when:
- the obligation is not void;
- its due date is set and is earlier than the current calendar date in `Asia/Kolkata`; and
- its outstanding amount is greater than zero.

A due date of today is not overdue until the calendar date has passed. A missing due date is not automatically overdue.

Overdue is a derived display state, not a replacement for the persisted obligation status. The UI may show `OVERDUE` as a badge while retaining the underlying `OPEN` or `PARTIALLY_PAID` status.

### 6.6 Correcting or Voiding a Payment

Payments must not be hard-deleted through normal application workflows.

To correct a mistaken payment:
1. Open the payment record.
2. Review the original details.
3. Provide a reason.
4. Confirm the void action.
5. The backend marks the payment `VOID`, records `voided_at` and `void_reason`, and writes an audit entry.
6. The backend recalculates the obligation balance.
7. A replacement payment may be recorded with correct details.

The original record and its audit history remain available. If voiding would violate a related invariant, the backend must reject the operation and explain the conflict.

### 6.7 Correcting or Voiding a Fee Obligation

An obligation can be voided only with an explicit reason and audit record. If valid payments are allocated to it, the system must not silently void the obligation. The administrator must first resolve those payments through supported correction operations. The initial implementation should reject voiding an obligation with allocated valid payments unless a complete, audited resolution workflow is implemented.

## 7. Class Scheduling and Session Workflow

### 7.1 Schedule a Session

The administrator selects a student and provides the scheduled start, end/duration, and optional enrollment, package, and meeting link.

The backend validates:
- the student exists;
- the end is after the start;
- the enrollment and package, if supplied, belong to that student;
- the package is eligible for new allocation;
- the meeting link, if supplied, belongs to that student and is active for the scheduled period where validity dates are used;
- the session status is valid.

A scheduled session does not consume a package credit.

### 7.2 Complete a Session

1. The administrator opens the scheduled session.
2. The administrator confirms the outcome and attendance.
3. The backend verifies that the session can transition to `COMPLETED`.
4. The backend ensures that the session has not already consumed a credit.
5. If the session is assigned to a package and qualifies for consumption, the package balance is recalculated.
6. The completion timestamp and update timestamp are saved.
7. An audit event is recorded.

A completed session should have a valid completion timestamp. Actual start/end times are optional unless the UI records them; if both are supplied, actual end must be after actual start.

Changing a completed session back to a non-completed state is a correction, not a routine edit. It requires confirmation, a reason, audit history, and a recalculation of the package balance.

### 7.3 Cancellation

A cancellation must set `session_status = CANCELLED`, record the reason where available, and preserve the session record.

By default, a cancelled session does not consume a package credit. Cancelling a completed session requires the correction workflow described above.

Cancellation must not automatically cancel the student's enrollment, void fees, or deactivate meeting links.

### 7.4 Rescheduling

Rescheduling must preserve an audit trail of the original scheduled time and the new time.

The implementation may represent a reschedule as an updated session with an audit record or as a superseded session plus a replacement session. It must choose one representation consistently and ensure that only one session can consume a credit for the same class occurrence.

If a replacement session is created, the original must be marked `RESCHEDULED` and linked to its replacement through a documented relationship or audit reference. It must not remain as a normal upcoming class.

### 7.5 No-Show, Absence, and Class-Credit Policy

`NO_SHOW` and attendance `ABSENT` are distinct concepts: session status describes the session outcome, while attendance describes attendance.

The Version 1 class-credit policy is explicit and finalized:

| Session outcome | Class-credit effect |
|---|---|
| `COMPLETED` and attended | Consume one credit (`CONSUME`) when linked to an eligible package |
| `NO_SHOW` | No credit consumed by default (`NO_CONSUME`) |
| `ABSENT` | No credit consumed by default (`NO_CONSUME`) |
| `EXCUSED` | No credit consumed (`NO_CONSUME`) |
| `CANCELLED` | No credit consumed by default (`NO_CONSUME`); late cancellations are treated as `CANCELLED` under this default policy |
| `RESCHEDULED` | No credit consumed by the superseded session (`NO_CONSUME`) |

A completed session without an eligible package must not change any package balance (`class_credit_effect = NO_CONSUME`). No-show or absence behavior must never be inferred from a free-form note.

## 8. Meeting-Link Rules

A student can have multiple meeting links, including Zoom and Google Meet links.

- Each link has its own `meeting_link_id`.
- A link belongs to one student.
- Provider must be `ZOOM`, `GOOGLE_MEET`, or `OTHER`.
- The backend validates URL scheme and provider host where possible.
- `javascript:`, `data:`, and other unsafe schemes are rejected.
- HTTPS is required for supported online meeting links.
- Inactive or expired links are not offered as default choices for future sessions.
- At most one active preferred link per student is permitted in Version 1.
- Setting one link as preferred must unset the previous preferred active link within the same protected operation.
- A session's explicitly selected meeting link takes precedence over the student's preferred link.
- Updating the preferred link must not silently rewrite links on historical sessions.
- Deactivation preserves the link record and audit history.

The UI must display provider and label before opening a link. Opening the meeting URL is a browser navigation action; it must not be treated as proof that the meeting exists or is available.

## 9. Student Notes and Follow-ups

Notes provide operational context and do not replace structured records.

- Every note belongs to a student.
- Notes include a creation timestamp and author identity.
- Follow-up dates are optional.
- Completing a follow-up updates its follow-up status; it does not delete the note.
- Fee information that changes a balance must be recorded as a fee or payment operation, not only as a note.
- Class completion must be recorded in a class session, not only as a note.
- Note edits are auditable.
- The application should avoid storing sensitive personal details that are not needed to manage classes.

## 10. Dashboard and List Calculations

Dashboard metrics must be derived from canonical records and must define their date window.

- Active students: students with `student_status = ACTIVE`.
- Upcoming classes: scheduled sessions whose start time is in the future, in the selected date window, excluding cancelled and superseded sessions.
- Overdue fees: non-void obligations with a due date before today and positive outstanding amount.
- Recent payments: valid recorded payments ordered by payment date and creation time, subject to the selected display window.
- Remaining classes: sum of calculated remaining balances for eligible packages; the UI must avoid implying that expired or cancelled packages are usable.

If any metric cannot be calculated because records are invalid or data is unavailable, the UI must display an error or unavailable state instead of a misleading zero.

## 11. Import and Reconciliation Rules

Imports must be previewed before committing records.

1. Identify the source spreadsheet and tab.
2. Map source headers to canonical fields.
3. Validate required values and formats.
4. Detect likely duplicate students and duplicate source rows.
5. Show a preview with warnings and errors.
6. Require administrator confirmation.
7. Record an import batch.
8. Process rows with explicit outcomes.
9. Record target IDs and row-level results.
10. Present counts for imported, skipped, duplicate-review, and failed rows.

An import must not silently overwrite a canonical record. Re-running an import should not duplicate records already imported from the same source row. Use source references and/or stable fingerprints for idempotency, with human review for ambiguous student matches.

Imported historical payments or sessions must be assigned only when their relationships can be established. Rows with unclear relationships must be flagged for review, not guessed.

## 12. Audit and Error Rules

Audit events are required for meaningful changes, including student status changes, enrollment changes, package changes, fee and payment changes, session outcomes, meeting-link changes, imports, and relevant exports.

Audit data must include actor, timestamp, entity, action, outcome, and a safe change summary. Do not include authentication tokens or unnecessary personal data.

If a mutation fails before persistence, the API must return a failure. If a write partially succeeds and cannot be rolled back, the backend must report an integrity/reconciliation error and provide enough non-sensitive context for recovery. It must not claim the operation fully succeeded.

## 13. Concurrency and Duplicate Submission Rules

For payments, session completion, package-affecting changes, and imports:
- Validate the current persisted state immediately before mutation.
- Use an idempotency/request ID where applicable.
- Use Apps Script locking for critical sections when needed.
- Re-read relevant records within the critical section.
- Ensure a session cannot consume the same class credit twice.
- Ensure a payment cannot be recorded twice from a repeated submission with the same idempotency key.
- Release locks reliably.
- Return a clear conflict if state changed and the operation can no longer be safely applied.

Locking alone does not provide a full database transaction. The implementation must document partial-write risks and recovery behavior.

## 14. Deletion Policy

Version 1 has no general hard-delete operation for business records.

- Students are inactivated.
- Meeting links are deactivated.
- Payments are voided with a reason.
- Fee obligations are voided only under the defined constraints.
- Sessions are cancelled or corrected with audit history.
- Notes are retained and edits are audited.
- Import results and audit events are retained according to the retention policy.

Any future retention-based purge must be a separate documented administrative process, not a normal record-edit action.

## 15. Required Workflow Acceptance Tests

The implementation must demonstrate that:

1. A student can be created and later found by search.
2. A likely duplicate is flagged instead of silently merged.
3. Archiving retains all related records.
4. Reactivating a student preserves the same student ID and history.
5. A package balance changes only when a qualifying session is completed.
6. Re-saving a completed session does not consume another credit.
7. Cancelling a scheduled session does not consume a credit.
8. A no-show follows the explicit default policy.
9. A payment reduces the correct obligation balance.
10. A payment cannot be allocated to another student's obligation.
11. Duplicate payment submissions are safely rejected or deduplicated.
12. Voiding a payment recalculates balances and preserves history.
13. Overpayments are rejected under the default policy.
14. An obligation with valid allocated payments cannot be silently voided.
15. Overdue status uses the Asia/Kolkata calendar date and outstanding balance.
16. A student can have both Zoom and Google Meet links.
17. Only one preferred active meeting link exists per student.
18. Deactivated links remain in history but are not offered as defaults.
19. Rescheduling does not create duplicate upcoming sessions or credit consumption.
20. Import retries do not duplicate previously imported source rows.
21. Invalid foreign-key relationships are rejected.
22. Failed or partial writes are not reported as successful.
23. Important changes produce audit records.
24. Dashboard metrics distinguish unavailable data from genuine zero values.

## 16. Deferred Decisions

The following are explicitly outside the default Version 1 behavior unless
approved in a later architecture revision:

- Advance payments and unallocated credits.
- One payment split across multiple fee obligations.
- Refund processing and reversal accounting.
- Automatic prorating of fees.
- Automatic refunds for unused classes.
- Configurable no-show credit consumption.
- Automated recurring billing.
- Automated Zoom or Google Meet meeting creation.
- Parent/student portal access.
- Multiple administrators and role-based permissions.

If any deferred feature becomes necessary, update the schema, API contract,
security rules, and acceptance tests before implementation.

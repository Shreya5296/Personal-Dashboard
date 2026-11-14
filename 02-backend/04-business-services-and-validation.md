# 04 — Business Services and Validation

## 1. Purpose

This document defines the backend business-service boundaries, operation rules, validation requirements, and mutation safeguards for the Student Management Dashboard.

The backend is Google Apps Script. Google Sheets is the canonical datastore. The frontend is a separate React + TypeScript application and is never trusted to enforce business rules.

This document complements:
- `00-documentation/01-product-requirements.md`
- `00-documentation/02-system-architecture.md`
- `00-documentation/03-security-and-authentication.md`
- `00-documentation/04-google-sheets-data-model.md`
- `00-documentation/05-business-rules-and-workflows.md`
- `02-backend/01-apps-script-project-structure.md`
- `02-backend/02-api-contracts-and-error-handling.md`
- `02-backend/03-authentication-and-authorization.md`
- `02-backend/05-google-sheets-access-and-integrity.md`
- `03-data/03-financial-and-class-balance-calculations.md`

If a referenced document is not yet present in the working repository, this document remains a specification target; it must not be treated as permission to invent conflicting behavior. Resolve conflicts explicitly and update the authoritative document set.

## 2. Core Rules

1. All business decisions are made on the backend.
2. Validate authentication and authorization before reading protected records or mutating data.
3. Validate request shape and values before performing writes.
4. Validate entity relationships against persisted records, not client-supplied labels.
5. Use stable record IDs; never use row numbers or names as identifiers.
6. Use repositories for persistence. Services must not duplicate sheet-column mapping.
7. Return structured results using the API envelope defined in the API specification.
8. A failed operation must never be reported as successful.
9. Preserve historical and financial records. Corrections must be auditable.
10. Keep services small and single-purpose. Avoid generic catch-all service modules.

## 3. Service Inventory

The backend must provide the following service boundaries. They may be split into smaller files, but their responsibilities must remain distinct.

- `StudentService`: student identity, profile updates, lifecycle transitions, directory queries.
- `EnrollmentService`: enrollment creation, updates, pause/close/reactivation rules.
- `PackageService`: package creation, status changes, and class-balance queries.
- `FeeObligationService`: fee obligation creation, update, voiding, and balance queries.
- `PaymentService`: payment recording, allocation, correction/voiding, and payment history.
- `ClassSessionService`: scheduling, rescheduling, cancellation, completion, and session history.
- `AttendanceService`: attendance marking and policy-driven class-credit effects.
- `MeetingLinkService`: meeting-link validation, preference management, deactivation, and selection.
- `StudentNoteService`: dated internal notes and follow-up state.
- `DashboardQueryService`: aggregate summaries and bounded dashboard queries.
- `ImportService`: import orchestration and batch state management.
- `ImportValidationService`: source mapping, row validation, duplicate detection, and preview.
- `ConfigurationService`: validated non-secret application settings.

A service may call another service when the workflow requires its rules. Avoid circular service dependencies. Shared calculations belong in a clearly named domain utility, not copied across services.

## 4. Standard Operation Lifecycle

Every protected operation follows this sequence:

1. Parse the request using the API contract.
2. Authenticate the caller and authorize the operation.
3. Validate the operation-specific payload and reject unknown fields where strict schemas apply.
4. Load the required records through repositories.
5. Validate record existence, ownership, relationships, and current state.
6. Apply business rules and calculate derived values on the server.
7. Acquire a script lock for mutations that require concurrency protection.
8. Re-read any state that may have changed while waiting for the lock.
9. Apply the smallest safe set of writes.
10. Persist durable idempotency records where required.
11. Return the persisted result or a structured error.
12. Release locks in a `finally`-equivalent cleanup path.

Do not hold a script lock while waiting for user input or performing unrelated remote network calls. Do not assume a multi-tab Google Sheets update is a database transaction. If a multi-record workflow fails partway through, follow its explicit compensation or reconciliation procedure.

## 5. Validation Layers

### 5.1 Request validation

Validate operation name, payload object, required properties, value types, string lengths, allowed enums, and identifier formats. Reject malformed JSON and unexpected data structures.

### 5.2 Field validation

- Trim user-entered strings where whitespace is not meaningful.
- Reject empty required strings.
- Apply documented maximum lengths.
- Validate email syntax when an email is supplied; do not require an email if the schema marks it optional.
- Store phone numbers as strings so leading zeros and international prefixes are preserved.
- Validate dates as real calendar dates, not merely strings matching a pattern.
- Validate timestamps and timezone conversion consistently.
- Reject non-finite numbers, numeric strings where numeric values are required, and invalid monetary precision.
- Validate booleans explicitly; do not treat arbitrary truthy strings as `true`.
- Validate URLs by parsing them and allowing only approved schemes, normally HTTPS.

### 5.3 Relationship validation

Before writing a related record:
- Confirm the referenced student exists.
- Confirm enrollment, package, fee obligation, session, and meeting-link references exist when supplied.
- Confirm all related records belong to the same student where required.
- Confirm a package belongs to the specified enrollment when both are present.
- Confirm a fee obligation is not void when a payment is allocated to it.
- Confirm a package is eligible to receive a class session under the configured policy.
- Reject references to nonexistent or incompatible records.

### 5.4 State-transition validation

Validate the current status and requested transition. Do not accept arbitrary status strings or allow clients to bypass workflow operations by directly setting a terminal status.

### 5.5 Persistence validation

Repositories must validate the expected sheet and headers. A missing tab, duplicate header, unsupported schema version, or missing required column is a controlled operational error, not an empty dataset.

## 6. StudentService

### Create student

Required fields follow the `Students` schema. Generate `student_id`, `created_at`, and `updated_at` on the backend. Ignore or reject client attempts to set system-generated fields.

Before creation, check for likely duplicates using configured matching signals such as normalized guardian phone and student name. Duplicate detection is a warning/review mechanism, not proof that two people are the same. Do not merge automatically based only on a phone number or name.

### Update student

Allow only editable profile fields. Preserve `student_id`, `created_at`, and lifecycle history. Update `updated_at` on successful mutation. Changes to sensitive contact details should be auditable without unnecessarily duplicating the full personal record in logs.

### Archive/inactivate student

Set `student_status` to `INACTIVE`, set `archived_at`, and update `updated_at`. Do not delete or cascade-delete enrollments, payments, packages, classes, links, or notes. The service must not silently cancel future sessions; handle those through an explicit, confirmed workflow.

### Reactivate student

Set `student_status` to `ACTIVE`, clear or update the current archive marker according to the canonical lifecycle policy, and update `updated_at`. Preserve previous lifecycle events in audit history. Reactivation must reuse the existing `student_id`.

## 7. EnrollmentService

An enrollment must reference an existing student. If an enrollment is created as active, validate that its dates and required commercial fields are coherent.

Allowed statuses are `ACTIVE`, `COMPLETED`, `PAUSED`, and `CANCELLED`. Transitions must be explicit. Closing or cancelling an enrollment must not delete its records or automatically rewrite payments.

If an enrollment's student association is immutable after creation, enforce that rule. If a correction is needed, use a controlled administrative correction with audit history rather than silently moving financial or class history between students.

Prevent ambiguous overlapping active enrollments only if the product policy explicitly prohibits them. Do not impose a blanket prohibition if a student may legitimately have multiple concurrent courses or arrangements.

## 8. PackageService

Validate that `purchased_classes` is a positive integer. Validate currency, price, date range, student association, and optional enrollment association.

Package states are `ACTIVE`, `EXHAUSTED`, `EXPIRED`, `CANCELLED`, and `CLOSED`. The service must not let the frontend set an authoritative remaining-class count.

Calculate the current balance from the canonical package allocation and qualifying class-session records plus explicitly supported adjustments. The exact rules for `NO_SHOW`, cancellations, rescheduling, and credits are governed by the business-rules document.

A package with no remaining classes may be marked `EXHAUSTED` based on a derived balance. Avoid stale status values by recalculating when relevant sessions or adjustments change. If expiry is date-based, use the configured application timezone and documented inclusive/exclusive date rule.

Do not allow package edits that retroactively change balances without validation and audit history. If purchased quantity needs correction, use a controlled adjustment workflow.

## 9. FeeObligationService

Validate that the obligation belongs to an existing student and that optional enrollment/package references are consistent. `amount_due` must be a finite, non-negative INR amount at the approved precision. Due dates and issue dates must be valid calendar dates.

The backend calculates paid and outstanding balances from valid allocated payments. The UI must not submit a paid total or outstanding balance as authoritative values.

An obligation may be `OPEN`, `PARTIALLY_PAID`, `PAID`, or `VOID`. Status should be derived or reconciled against valid payments and the obligation amount. Do not permit an arbitrary status change to make a balance appear settled.

Voiding an obligation requires a reason, permission, relationship checks, and an audit event. The service must prevent voiding an obligation that has payments unless the documented workflow first resolves or explicitly accounts for those allocations. Never discard payment history to make voiding convenient.

Overpayment policy must be explicit. Until advance credits are fully specified, reject allocations that exceed the outstanding obligation balance, except for a documented rounding tolerance. Do not silently create a negative balance.

## 10. PaymentService

### Record payment

Require `fee_obligation_id` before processing any payment. Every Version 1 payment must reference a valid fee obligation; advance payments and unallocated credits are strictly out of scope.

Validation rules:
- Reject missing `fee_obligation_id`.
- Reject nonexistent or void fee obligations.
- Reject student mismatches (the obligation's `student_id` must match the payment's `student_id`).
- Reject currency mismatches (the payment's `currency` must match the obligation's `currency`).
- Reject payment amounts that exceed the allowed outstanding balance of the obligation.
- Validate payment date, positive numeric amount, and valid payment method.

**Idempotency and deduplication persistence:**
- The request must provide an `idempotencyKey`.
- The key is stored directly in the `Payments.idempotency_key` column alongside the transaction in the spreadsheet. Do not rely only on disabling the frontend button or on an audit entry being written afterward.
- A retry with the same key and equivalent payload must return the original outcome, returning the existing payment record and updated financial state.
- Reusing the key with a materially different payload (e.g. different amount, student, or obligation) must be rejected with a conflict error (`CONFLICT`).

Write the payment record and audit outcome using the safest supported write sequence. If the write succeeds but audit persistence fails, follow the explicit audit-failure policy; do not falsely report that the payment was not recorded when it actually was.

### Correct or void payment

Do not silently delete or overwrite a recorded payment. Require a reason and preserve the original record. Use a void/reversal workflow with an audit event and recalculate affected balances. Do not introduce refunds or negative payments unless the canonical data model and API contract explicitly support them.

### Payment summaries

Payment summaries must ignore void payments. They must use consistent currency and monetary precision. Totals should be calculated from persisted records, not cached UI state. Do not mix payments for different students or obligations because of a missing or malformed relationship.

## 11. ClassSessionService

### Schedule session

Require an existing student, valid scheduled start and end, and a valid status. End must be later than start. If duration was entered in the UI, calculate and persist the end timestamp. If a package or enrollment is supplied, validate its association and eligibility. A meeting link, when supplied, must belong to the same student and be active/valid under the link policy.

Do not automatically deduct a class at scheduling time (`class_credit_effect = PENDING`).

### Reschedule session

Validate the current session state and new time range. Preserve the fact that a reschedule occurred in audit history. The workflow must not create two chargeable sessions for one rescheduled class. If the implementation represents rescheduling as a new record, it must link or otherwise explicitly relate the replacement to the original and exclude the superseded record from class consumption (`class_credit_effect = NO_CONSUME`).

### Cancel session

Set the appropriate cancelled state and record a reason when required. Under the Version 1 default policy, a cancelled session does not consume a package class (`class_credit_effect = NO_CONSUME`). Late cancellations are treated as cancelled under this default policy.

### Complete session

Validate that the session can transition to `COMPLETED`, set `completed_at`, record actual times when available, and update attendance through the documented workflow.

**Deduplication and integrity strategy for class completion:**
- Enforce existing-state checks and acquire a script lock (`LockService.getScriptLock()`) during the completion transition.
- Single-credit-consumption protection: Verify that `class_credit_effect` has not already been applied. Retrying a completed session must never consume an additional class credit.
- When linked to an eligible package and marked attended, set `class_credit_effect = CONSUME`.
- A completed session without an eligible package must not change any package balance (`class_credit_effect = NO_CONSUME`).
- `CREDIT_BACK` restores one previously consumed class credit only as part of an audited correction:
  - A credit restoration creates a distinct, audited `ClassSessions` record with `class_credit_effect = CREDIT_BACK` and populates `credit_restoration_for_session_id` with the referenced session's `class_session_id`.
  - The target session must exist, belong to the same student and package, and have `class_credit_effect = CONSUME`.
  - At-most-once restoration: The service strictly rejects any restoration attempt if a record with that `credit_restoration_for_session_id` already exists.
  - Package balance recalculation increments `remaining_classes` by exactly 1 (accounting for `credited_back_classes`).
  - **Field population on creation:** `class_title = "Credit Restoration: " + originalTitle` (default `"Credit Restoration"`), `scheduled_start` and `scheduled_end` set to restoration timestamp (zero duration), `actual_start`/`actual_end` null, `session_status = COMPLETED`, `attendance_status = NOT_MARKED`, `meeting_link_id = null`, `completed_at` set to restoration timestamp, and `notes` stores the correction reason.
  - **Operational query filtering:** Class scheduling, calendar, upcoming session, and attendance queue queries MUST filter out records where `class_credit_effect = CREDIT_BACK`. They appear solely in student package ledger and balance audit views.
  - **Terminal immutability:** `CREDIT_BACK` records are terminal; any attempt to reschedule, cancel, or modify attendance on them is rejected with `INVALID_STATE`.

### No-show and attendance

`NO_SHOW` and attendance outcomes must follow the explicit Version 1 policy:
- `COMPLETED` and attended: Consumes 1 credit (`CONSUME`) when linked to an eligible package.
- `NO_SHOW`: No credit consumed by default (`NO_CONSUME`).
- `ABSENT`: Ordinary absent attendance does not consume a credit by default (`NO_CONSUME`).
- `EXCUSED`: No credit consumed (`NO_CONSUME`).
- `CANCELLED`: No credit consumed by default (`NO_CONSUME`).
- `RESCHEDULED`: No credit consumed by the superseded session (`NO_CONSUME`).

The backend must not infer attendance or credit consumption from whether a meeting URL was clicked or free-form notes. Any class-credit effect must be explicit, validated, and auditable.

## 12. AttendanceService

Attendance is not equivalent to payment and is not itself a financial transaction. Validate that the session exists and that the requested attendance state is allowed for the session's current status.

Attendance changes that alter class consumption must trigger a controlled balance recalculation and audit event. Repeatedly saving the same attendance state must not consume multiple classes. Corrections to prior attendance must preserve the prior state in audit history.

## 13. MeetingLinkService

Validate that the student exists, provider is one of `ZOOM`, `GOOGLE_MEET`, or `OTHER`, and the URL is parseable and uses an allowed scheme. Provider/host mismatches must be rejected or explicitly confirmed under the product policy; do not silently relabel an arbitrary URL as a trusted provider.

When marking a link preferred, verify that it is active and belongs to the specified student. Ensure no more than one preferred active link per student for the applicable scope. If scope-specific preferences are introduced later, they require an explicit schema and migration.

Deactivation preserves the record. Deactivating a link currently assigned to a future session must not delete the session's historical association. The UI should warn the administrator and allow a deliberate replacement link if needed.

## 14. StudentNoteService

Validate student existence, note type, content length, and optional follow-up date/status. Store timestamps and actor identity on the backend. Notes remain available after student inactivation.

Notes must not be used as substitutes for structured payment, class, attendance, or package records. Note edits must be auditable. Do not expose notes through unauthenticated or public endpoints.

## 15. DashboardQueryService

Dashboard figures are read-only projections of canonical records. The service may return counts and summaries such as active students, upcoming sessions, outstanding/overdue obligations, recent payments, and package balances.

Rules:
- Define the time window for upcoming sessions explicitly.
- Exclude void obligations and void payments from financial calculations.
- Do not count inactive students as active.
- Do not count cancelled or superseded sessions as completed.
- Apply consistent timezone boundaries.
- Return an explicit `as_of` timestamp where useful.
- Bound list sizes and support pagination for larger histories.
- Never make a dashboard summary the source of truth for a mutation.

## 16. ImportValidationService and ImportService

Preview must be read-only. Validate source-to-target mappings before writing. Report row-level errors, possible duplicates, skipped rows, and required-field failures.

Import operations must be repeat-safe. Use a source row reference/fingerprint and a batch record to avoid accidental duplicate creation. A repeated import must not create duplicate payments or class sessions without explicit approval.

Do not automatically merge possible duplicate students. Require review where identity is ambiguous. Imported financial and historical records must preserve source values and be reconciled before the batch is marked complete.

If an import partially fails, record each row outcome and mark the batch `COMPLETED_WITH_ERRORS` or `FAILED` as appropriate. Never display a fully successful result when any rows failed or were skipped; report counts accurately.

## 17. ConfigurationService

Only documented non-secret configuration keys may be read or changed through application operations. Validate supported values and record configuration changes in audit history. Authentication secrets, tokens, privileged credentials, and deployment secrets must not be stored in `AppConfig`.

Changing currency or timezone after records exist requires explicit migration/compatibility review. Do not silently reinterpret historical dates or amounts because a display setting changed.

## 18. Cross-Cutting Error Rules

Use stable error codes from the API specification. At minimum, distinguish:
- Invalid request
- Authentication required
- Access denied
- Record not found
- Duplicate or conflict
- Invalid relationship
- Invalid state transition
- Validation failure
- Schema/configuration failure
- Rate/quota/temporary backend failure
- Persistence failure
- Unexpected internal error

Client-facing errors must be actionable but must not expose stack traces, secrets, tokens, or unnecessary personal information. Operational diagnostics may contain a correlation ID and safe error details.

## 19. Audit Policy

Audit successful mutations and important rejected or failed operations where operationally useful. The audit event must identify the actor, action, entity, timestamp, outcome, and request/correlation ID when available.

For sensitive before/after values, store a minimal safe summary. Never store authentication tokens. Audit entries must be append-oriented and inaccessible for ordinary editing through the dashboard.

Each mutation must define whether audit persistence is mandatory for success. If audit persistence is mandatory but fails, the implementation must use a safe compensation or reconciliation procedure. If a primary write has already persisted and cannot be rolled back, return a result that accurately communicates the uncertain audit state and raise an operational alert; never claim that no mutation occurred.

## 20. Concurrency and Idempotency

Use Apps Script locking for mutations that can conflict, especially payments, package/session balance changes, preference changes, and imports. Lock scope must be as small as practical.

Where retries could create duplicate records, require an idempotency/request key or another documented deduplication mechanism. Store enough information to determine whether a repeated key represents the same request. Reject key reuse with different content.

Locks do not provide a full database transaction across all sheets. Multi-record operations must define write order, failure detection, and reconciliation/compensation behavior.

## 21. Performance Rules

- Read ranges in batches rather than cell by cell.
- Build in-memory lookup maps within a request when useful.
- Do not rescan every sheet repeatedly for each related record.
- Keep API responses limited to the requested page or summary.
- Avoid loading all history when a page needs only current data.
- Do not cache financial balances without a defined invalidation strategy.
- Handle Apps Script quotas and execution limits as operational failures.

## 22. Required Service-Level Tests

At minimum, automated tests must cover:

- Required and optional field validation for every create/update operation.
- Unknown enum values and invalid state transitions.
- Nonexistent IDs and cross-student relationship mismatches.
- Student archive/reactivation with historical data preserved.
- Partial payment and full payment calculations.
- Voided payment exclusion from balances.
- Overpayment rejection under the selected policy.
- Package balance after completion, cancellation, rescheduling, and attendance correction.
- Duplicate payment retries and idempotency-key conflicts.
- Meeting-link URL and preferred-link validation.
- Import preview, duplicate detection, partial failure, and safe retry.
- Audit event content and failure handling.
- Missing sheet/header/schema errors.
- Concurrent mutations that target the same financial or class records.

## 23. Implementation Constraints

- Follow the exact source directory layout in `02-backend/01-apps-script-project-structure.md`.
- Keep every source file in `src/` and `public/` under 150 lines, with one clear responsibility per file.
- Do not create catch-all files such as `actions.js`, `app.js`, or monolithic CSS.
- Split services, validators, repository operations, and calculations into small modules when required by the line limit.
- Keep the public API contract centralized and consistent with Document 06.
- Do not duplicate canonical schemas or business rules in frontend components.
- Do not add dependencies or infrastructure that contradict the agreed lightweight architecture without explicit approval.

## 24. Completion Criteria

This specification is implemented when every service boundary has a defined owner, all write paths validate inputs and relationships, all state transitions follow documented rules, financial and class balances are derived from canonical records, important mutations are auditable, duplicate retries are controlled, and the service-level tests pass.

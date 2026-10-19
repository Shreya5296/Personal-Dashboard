# 05 — Google Sheets Access and Integrity

## 1. Purpose and Scope

This document defines the backend rules for accessing the master Google Spreadsheet safely and consistently. It covers repository boundaries, schema checks, reads, writes, identifiers, relationships, locking, audit integration, failure handling, and recovery from partial operations.

The authoritative tab and column definitions are in `03-data/01-master-spreadsheet-schema.md` and `03-data/02-entity-relationships-and-data-dictionary.md`. If those files are not present in the implementation checkout, use the approved data-model document as the source of truth; do not invent a conflicting schema.

This document does not authorize direct spreadsheet access from the browser. All access must occur inside the Apps Script backend under its configured execution identity.

## 2. Non-Negotiable Rules

1. The master spreadsheet is private and is never published to the web.
2. The frontend must not call Google Sheets APIs directly.
3. Spreadsheet reads and writes are centralized in the backend data-access layer.
4. Column mapping is based on validated header names, never assumed column letters or row positions.
5. Row numbers are implementation details, not record identifiers.
6. Every entity uses its documented stable ID field.
7. Required schema drift fails closed for affected operations; it must not be silently ignored.
8. Financial and class balances are derived from authoritative records and rules, not independently editable totals.
9. Mutations validate the caller, payload, target records, relationships, and state transitions before writing.
10. Important mutations must be auditable and recoverable to the extent supported by Sheets.
11. No success response may be returned until required writes have completed and been checked.
12. Secrets and authentication tokens must never be stored in spreadsheet tabs or logged.

## 3. Spreadsheet Configuration

The production spreadsheet ID is supplied through protected Apps Script configuration, not a frontend constant or a publicly accessible `AppConfig` value. The spreadsheet ID is not itself a secret, but access must depend on backend authorization and Google permissions.

Configuration must identify:
- The master spreadsheet ID.
- The expected schema version.
- The application timezone (`Asia/Kolkata` for the initial deployment).
- Any approved administrator identity configuration required by the authentication design.
- Environment designation, such as development or production.

Do not use a production spreadsheet in development or preview environments by default. Configuration must fail clearly when required values are missing or inconsistent.

## 4. Repository Responsibilities

The data-access layer must expose small, domain-oriented repository functions. It must not expose arbitrary spreadsheet reads or writes to API handlers.

Responsibilities:
- Resolve the spreadsheet and approved tab names.
- Validate headers and schema version.
- Convert rows to typed records and records to row values.
- Find records by stable ID.
- Read ranges in batches where practical.
- Append or update approved records.
- Return explicit not-found, conflict, validation, and storage errors.
- Keep spreadsheet-specific details out of business services.

Business services own business rules. API handlers own request parsing and response formatting. Repositories own persistence mapping. No layer should duplicate another layer's responsibility.

## 5. Schema and Header Validation

At deployment health-check time, and before protected operations when cached schema validity cannot be trusted, validate that:
- Every required tab exists.
- Required headers are present and unique.
- Header spelling matches the approved schema.
- The schema version is supported.
- Required configuration is available.
- No required field has become ambiguous due to duplicate headers.

Optional columns may be tolerated only when explicitly marked optional by the schema. Missing required columns, duplicate headers, unknown schema versions, or missing required tabs must produce a structured schema error and prevent affected mutations.

Do not silently create a replacement tab, rename a production tab, reorder columns, or delete columns at runtime. Schema migrations are explicit, versioned operations with backup and verification.

Header maps may be cached for performance, but the cache must be invalidated when a schema migration is applied. A cache must never conceal a known schema failure.

## 6. Header-Based Row Mapping

At the start of a repository operation, use the validated header map to resolve field positions. Do not assume that `student_id` is in column A or that a particular record remains on a particular row.

For a read:
1. Read the required range in one batch where practical.
2. Map each row through the validated header map.
3. Convert values into the documented domain types.
4. Validate required identifiers and critical values.
5. Return typed records, not raw row arrays, to business services.

For a write:
1. Validate the domain record.
2. Create a row array aligned to the validated header map.
3. Set only fields owned by the operation.
4. Preserve fields not being changed.
5. Write the row or batch.
6. Verify the resulting record when the operation's integrity requirements demand it.

Unknown columns must not be populated accidentally. If a schema permits extension columns, the extension policy must explicitly define how they are preserved.

## 7. Record Identity and Lookups

Each record is located by its stable ID, such as `student_id`, `payment_id`, or `class_session_id`, according to the approved schema.

Rules:
- IDs are generated by the backend using a collision-resistant scheme appropriate for the application.
- IDs are immutable after creation.
- IDs must be unique within their entity type.
- Names, phone numbers, row numbers, and spreadsheet sorting order are not IDs.
- A lookup that finds multiple records with the same supposedly unique ID is an integrity error, not a reason to pick the first row.
- Updating a record must re-check that its ID is unique and still exists.

For repeated lookups within one request, build an in-memory map from a single batch read rather than rescanning the full tab for every related record. Such maps are request-scoped unless cache invalidation is explicitly defined.

## 8. Relationship Integrity

Before writing a record with references, verify each referenced record exists and is compatible with the requested operation.

Examples:
- An enrollment must reference an existing student.
- A package's student and enrollment must agree.
- A fee obligation's optional package or enrollment must belong to the same student.
- A payment must reference an existing student and, when allocated, a fee obligation belonging to that student.
- A class session's student, enrollment, package, and meeting link must be mutually consistent where supplied.
- A meeting link and student note must reference an existing student.
- An import row result must reference an existing import batch.

A reference mismatch must reject the operation before mutation. Do not repair relationships automatically by matching names or contact details.

When importing legacy data with missing relationships, retain the source row in the import report and require an explicit mapping or review decision. Do not create fabricated foreign keys.

## 9. Read Operations

Read functions must specify the fields and entities needed by the caller. Avoid returning every tab and every historical record for each page request.

Required behavior:
- Authenticate and authorize before returning protected data.
- Use batch range reads where practical.
- Return typed records and consistent not-found behavior.
- Treat an empty dataset as a valid empty result, not as a schema failure.
- Distinguish an empty optional cell from a missing required column.
- Avoid exposing internal configuration, tokens, raw stack traces, or unnecessary personal data.
- Apply pagination or bounded date ranges to growing histories.
- Return derived balances with enough context to display them, while keeping their calculation authoritative on the backend.

A read-only request must not create or modify business records as a side effect.

## 10. Write Operations

All writes must pass through a business service and the approved repository function. API handlers must not write directly to arbitrary tabs.

A mutation must:
1. Authenticate and authorize the caller.
2. Validate the operation and request payload.
3. Validate the target record and referenced records.
4. Check applicable business invariants and state transitions.
5. Acquire a script lock when required by the concurrency policy.
6. Re-read the state needed to avoid stale decisions while inside the lock.
7. Apply the smallest required mutation.
8. Verify the result when required.
9. Write the audit record according to the operation's audit policy.
10. Release the lock in a `finally`-equivalent cleanup path.
11. Return a success response only after required work has completed.

Do not hold a script lock while doing unrelated work or waiting on external services. Keep lock duration short and bounded.

## 11. Concurrency and Locking

Google Sheets does not provide relational transactions. Apps Script locks reduce collisions among cooperating script executions, but they do not protect against manual edits by spreadsheet collaborators or external scripts that do not use the same lock.

Use a script-level lock for mutations that can conflict, including:
- Generating IDs if the selected ID strategy requires shared coordination.
- Updating a payment or fee obligation.
- Completing a class session and applying its package effect.
- Changing a preferred meeting link.
- Import operations that must detect duplicates and write results consistently.
- Updating shared records or audit-related sequences where necessary.

Inside the lock, re-read the relevant records before applying a state-dependent change. If the current state no longer satisfies the request, return a conflict rather than overwriting the newer state.

If a lock cannot be acquired within the documented timeout, return a retryable conflict or busy error. Never continue the protected mutation without the required lock.

Manual edits to the master spreadsheet should be restricted to authorized maintainers and avoided during application operations. If manual edits are necessary, run the integrity health check afterward.

## 12. Idempotency and Duplicate Submission Protection

Operations that create financial transactions or consume class allocations must be protected against accidental duplicate submissions.

The architecture enforces a concrete two-identifier model:
1. `requestId`: A unique client-generated request correlation identifier used for tracing, logs, and audit entries.
2. `idempotencyKey`: An operation-level deduplication key sent by the client for retryable state-changing mutations.

### Payment Creation Deduplication
- Payments store `idempotency_key` directly in the `Payments` table row in Google Sheets, persisted alongside the transaction. Do not rely only on disabling the frontend button or on an audit entry being written afterward.
- When `payments.record` executes, the backend verifies whether `idempotency_key` has already been recorded in `Payments`:
  - If a matching key exists and the payload is equivalent (same student, obligation, amount, and currency), return the original payment outcome with HTTP/envelope success and the persisted payment record.
  - If a matching key exists with a materially different payload (e.g. different amount, student, or obligation), reject the request with a conflict error (`409 CONFLICT` / `IDEMPOTENCY_CONFLICT`).
  - If the key is new, persist the payment with its `idempotency_key` inside the script lock.

### Class Completion Deduplication
- For class completion, deduplication does not rely on a separate ledger. Instead, deduplication is enforced by:
  1. An existing-state check verifying that the session is in an allowed transition state (`SCHEDULED`) and that `class_credit_effect` is `PENDING`.
  2. Apps Script locking (`LockService.getScriptLock()`) during transition.
  3. Single-credit-consumption protection: once a session is marked `COMPLETED` and `class_credit_effect` becomes `CONSUME`, any subsequent or retried completion request detects the existing completed state and returns the current session status without consuming a second class credit.

## 13. Financial Integrity

The data-access layer must preserve payment and obligation records as transactions, not editable summary totals.

Rules:
- Validate amount type, range, currency, and allowed precision before writing.
- Do not store formatted currency strings in numeric amount cells.
- Do not silently round an amount during persistence.
- Do not let a payment reference another student's obligation.
- Do not count voided payments toward paid balances.
- Do not allow ordinary edits to erase the original value of a financial transaction.
- Corrections and voids must follow the approved financial rules and produce audit records.
- Calculate balances from valid persisted obligations and transactions.
- Do not maintain an independently editable `paid_amount` or `outstanding_amount` as the source of truth.

A failed payment write must not be followed by a success response or an audit entry that claims the payment succeeded. If the payment write succeeds but the audit write fails, follow the explicit audit-failure policy and surface the outcome safely; do not silently claim full success when required auditability has not been achieved.

## 14. Class and Package Integrity

Class consumption must follow the business rules in `02-backend/04-business-services-and-validation.md` and the approved data-model documents.

The repository layer must not independently decide whether a no-show, cancellation, or completed class consumes a package credit. It must persist the state authorized by the business service.

Before completing a session:
- Verify the session exists and is in a permitted state.
- Verify the student and package relationships.
- Verify the operation has not already been applied.
- Prevent duplicate class-credit consumption.
- Persist the final state and audit event according to the integrity policy.

If a multi-step operation partially succeeds, the system must detect the incomplete state and provide a reconciliation path. It must not invent a balance adjustment to conceal the inconsistency.

## 15. Multi-Record Operations and Partial Failure

Where an operation updates multiple rows or tabs, define the expected intermediate states and failure behavior before implementation.

Google Sheets writes are not a general-purpose atomic transaction. Therefore:
- Minimize the number of separate writes.
- Batch writes to the same tab when practical.
- Validate all known preconditions before the first write.
- Use a script lock for coordinated state changes.
- Record an operation/request ID to correlate related writes.
- Verify all required writes before reporting completion.
- Make incomplete operations detectable through audit or reconciliation data.
- Provide a safe retry or repair path.

Do not claim rollback unless the implementation actually restores all affected records and verifies the restoration. If rollback is not reliable, report a recoverable partial failure and provide a reconciliation procedure.

## 16. Audit Integration

Important mutations must generate audit records according to `03-data/01-master-spreadsheet-schema.md` and the security specification.

Audit events must describe the actual outcome. The audit record should include a stable entity ID, actor identity established by authentication, action, timestamp, request ID, outcome, and a minimal change summary.

Do not log tokens, credentials, full request bodies, or unnecessary student and payment details. If audit persistence is mandatory for a given mutation and fails, follow the documented failure policy; do not silently omit the event.

Normal application operations must not edit or delete audit history. Any exceptional maintenance repair must be restricted, documented, and itself auditable where feasible.

## 17. Date, Time, and Currency Handling

Use the documented application timezone, initially `Asia/Kolkata`, for user-facing scheduling and date-time display.

Distinguish date-only fields from timestamps. Do not parse a date-only value as UTC midnight and then accidentally display the previous calendar date in India.

Store and compare monetary amounts as numeric values in the configured currency. The initial currency is INR. If multi-currency support is ever introduced, it requires an explicit schema and calculation change; do not infer currency from a formatted string.

## 18. Performance and Quotas

Apps Script runtime, service quotas, spreadsheet size, and concurrent executions impose practical limits. The implementation must avoid unnecessary service calls.

Required practices:
- Batch reads and writes.
- Avoid cell-by-cell loops that call Spreadsheet services on every iteration.
- Read only required ranges where practical.
- Build request-scoped lookup maps for relationships.
- Paginate large lists and histories.
- Avoid loading all historical sessions and payments for every dashboard request.
- Keep lock duration short.
- Return explicit timeout, quota, or temporary service errors.
- Never return partial data as a complete successful result without identifying that limitation.

Performance targets and realistic test volumes are defined in the testing specification.

## 19. Health Checks and Reconciliation

Provide a restricted administrative health check that validates:
- Spreadsheet configuration is present.
- Required tabs and headers exist.
- Schema version is supported.
- Required IDs are present and unique.
- Foreign-key references resolve.
- Financial records have valid references and values.
- Completed sessions do not cause duplicate package consumption.
- Import batches and row results are internally consistent.

Health checks must be read-only by default. Repairs require a separate explicit operation, preview of proposed changes, authorization, and audit trail.

The health check must report issues by category and record ID where safe, without dumping unnecessary personal data into logs.

## 20. Error Categories

Repositories and services must normalize errors into documented categories, including:
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `SCHEMA_ERROR`
- `RELATIONSHIP_ERROR`
- `LOCK_TIMEOUT`
- `STORAGE_ERROR`
- `QUOTA_OR_TIMEOUT`
- `AUDIT_FAILURE`
- `INTEGRITY_ERROR`

The public API response must not expose raw Apps Script stack traces or sensitive spreadsheet details. Safe diagnostic details may be written to restricted logs using a request ID.

## 21. Backup and Recovery Requirements

Before schema migrations or bulk imports, create a verified backup or an equivalent recoverable snapshot according to the operations specification.

Recovery procedures must cover:
- Accidental edits or deletion.
- Incorrect imports.
- Duplicate transactions.
- Schema mismatch.
- Partial multi-record operations.
- Corrupted or inconsistent relationships.

Restoring a backup must preserve required historical records and be followed by schema and integrity checks. Backup frequency, retention, access restrictions, and restore-test cadence are defined in `04-quality-and-operations/04-backup-and-recovery.md`.

## 22. Required Tests

The implementation must test at least:
- Missing spreadsheet configuration.
- Missing tab and missing required header.
- Duplicate header names.
- Empty tab behavior.
- Header reordering without data corruption.
- Duplicate IDs.
- Missing foreign keys and cross-student references.
- Concurrent conflicting writes.
- Lock timeout behavior.
- Duplicate payment submission.
- Duplicate class completion.
- Failure between related writes.
- Audit persistence failure.
- Invalid dates and amounts.
- Schema migration and recovery.
- Large-list batching and quota-related errors.
- Health-check reporting without unauthorized data exposure.

## 23. Definition of Done

This document is implemented when:
- All sheet access is centralized in repositories.
- Every repository uses validated header maps.
- Stable IDs and foreign-key checks are enforced server-side.
- Important mutations use the documented locking and conflict policy.
- Financial and class state changes are duplicate-safe.
- Partial failures are detectable and recoverable.
- Schema and integrity health checks are available to the authorized administrator.
- Logs and API errors do not leak credentials or unnecessary personal data.
- Tests cover the failure cases above.
- No frontend code accesses the master spreadsheet directly.

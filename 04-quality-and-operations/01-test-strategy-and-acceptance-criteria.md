# 01 — Test Strategy and Acceptance Criteria

## 1. Purpose

Define the minimum test strategy and release criteria for the Student Management Dashboard. Tests must establish that the product works end to end, preserves financial and class-history integrity, protects private records, and can be operated and recovered without relying on undocumented manual steps.

This document is the authoritative test and release-acceptance specification. Product behavior is defined in the product, data-model, business-rules, API, security, frontend, migration, and deployment documents. If a test conflicts with an authoritative requirement, resolve the conflict in the documentation before changing implementation behavior.

## 2. Test Principles

- Test observable behavior and important business invariants, not implementation details alone.
- Treat backend validation and authorization as mandatory even when the frontend already validates input.
- Use synthetic test data by default. Do not use real student or parent information in development or automated tests.
- Never run destructive tests against the production spreadsheet.
- Make financial calculations deterministic and independently verifiable.
- Test failure paths as well as successful paths.
- Keep tests repeatable and document any manual test that cannot reasonably be automated.
- A green test suite does not replace review of security configuration or a successful restore test.

## 3. Test Environments and Data

### 3.1 Environments

**Local/development**
- Frontend runs from the development environment.
- Backend uses a development Apps Script deployment or isolated test project.
- Spreadsheet operations target a dedicated test spreadsheet.
- Test identities and configuration are separate from production.

**Preview/staging**
- Used to verify the deployed frontend and the selected Apps Script integration together.
- Uses synthetic records and a non-production spreadsheet.
- Uses the same security-relevant integration pattern as production.

**Production**
- Contains real records and must not be used for routine automated test execution.
- Only approved smoke tests with non-destructive reads or explicitly controlled test records are permitted.
- Destructive, migration, load, and failure-injection tests are prohibited against live data.

### 3.2 Minimum Synthetic Dataset

The test dataset must include:
- An active student with one enrollment, one package, an unpaid fee obligation, and a scheduled class.
- A student with a partially paid fee obligation.
- A student with multiple fee obligations and payments.
- A student with multiple meeting links, including Zoom and Google Meet.
- A student with completed, cancelled, rescheduled, and no-show sessions.
- An inactive student with historical payments and classes.
- A returning student with more than one enrollment.
- Records with optional fields blank.
- Import rows with valid data, missing required fields, malformed dates, duplicate candidates, and invalid relationships.
- Invalid or expired authentication credentials for security tests.

All test records must be clearly synthetic and must not resemble real credentials or live meeting links.

## 4. Test Layers

### 4.1 Static and Build Checks

Verify that:
- TypeScript compilation succeeds.
- The production frontend build succeeds.
- Linting and formatting checks pass when configured.
- Automated checks enforce the repository's source-file rules for `src/` and `public/`.
- No source file in those domains reaches 150 lines.
- No forbidden catch-all files or monolithic CSS files are introduced.
- No secrets, tokens, private spreadsheet identifiers intended to be protected, or real personal data are committed.
- All required documentation and environment-variable examples are present.

The file-length check must count actual lines and fail at 150 lines or more. Files must not be compressed into unreadable one-line code merely to pass the check.

### 4.2 Frontend Unit and Component Tests

Test focused frontend behavior such as:
- Required-field and format feedback.
- Loading, empty, success, and error states.
- Currency and date formatting.
- Search and filter behavior.
- Confirmation dialogs for consequential actions.
- Session expiry and sign-out behavior.
- Safe handling of API errors and malformed responses.
- Meeting-link labels and safe URL handling.

Frontend tests must not claim that client-side validation secures the backend.

### 4.3 Backend Unit Tests

Test business rules independently of the UI, including:
- Request schema validation.
- Authorization decisions.
- Student lifecycle transitions.
- Fee and payment calculations.
- Package balance calculations.
- Session status and class-credit effects.
- Relationship validation between students, enrollments, packages, obligations, payments, sessions, and links.
- Duplicate submission handling.
- Import mapping and row classification.
- Audit-event creation for important mutations.

Where Apps Script runtime constraints prevent conventional unit-test execution, keep business logic isolated enough to test with controlled adapters or a documented test harness.

### 4.4 Integration Tests

Verify the complete path across frontend, Apps Script, and the test spreadsheet:
- Authentication token is transported and verified correctly.
- Authorized requests receive expected responses.
- Unauthorized requests cannot read or mutate records.
- API response envelopes are consistent.
- Spreadsheet schema validation detects missing tabs and headers.
- Writes persist and are reflected in subsequent reads.
- Related-record checks reject inconsistent references.
- Audit entries correspond to successful or failed operations as specified.
- CORS, redirect behavior, and browser response handling work in the actual hosting arrangement.

The cross-origin integration must be tested in a real supported browser. A unit test alone is insufficient evidence that the deployment works.

### 4.5 End-to-End Tests

Use the deployed preview environment to test representative administrator workflows from login through persisted result. At minimum, cover student creation, fee recording, class scheduling, meeting-link opening, archiving/reactivation, and import reconciliation.

### 4.6 Manual Review

Manual review is required for:
- Visual usability at desktop and narrow viewport widths.
- Whether financial labels clearly distinguish charged, paid, and outstanding amounts.
- Whether archived records are clearly separated from active operations.
- Whether the correct meeting provider and link are obvious before joining.
- Spreadsheet sharing permissions and production configuration.
- Backup restoration and post-restore consistency.

## 5. Core Functional Acceptance Criteria

### AT-01 — Authentication

Given an unauthenticated visitor, protected API operations must return a controlled authentication failure and disclose no student data. Given the configured administrator with a valid credential, access is allowed. An arbitrary signed-in Google user is not automatically authorized.

### AT-02 — Student Creation and Identity

The administrator can create a student with required fields. The backend generates a stable unique student ID. Repeated names or phone numbers must not silently merge records. Sorting or moving spreadsheet rows must not change identity.

### AT-03 — Student Search

The administrator can search using supported student identifiers and names. Results respect active/inactive filters. Search must not expose records outside the administrator's authorization scope.

### AT-04 — Student Profile

A student profile displays current contact information and links to relevant enrollment, package, fee, payment, class, meeting-link, and note records. Missing optional values display clearly and do not crash the page.

### AT-05 — Fee Obligation

The administrator can create a fee obligation associated with the correct student and, where applicable, enrollment or package. Invalid amounts, invalid dates, or cross-student relationships are rejected by the backend.

### AT-06 — Payment Recording, Allocation, and Persisted Idempotency

Every payment must reference a valid `fee_obligation_id`. The backend rejects requests with missing obligation IDs, nonexistent or void obligations, student mismatches, currency mismatches, and payment amounts exceeding the obligation's remaining balance. Advance payments and unallocated credits are rejected.

Recording a valid payment updates calculated `paid_amount`, `outstanding_amount`, and sets `obligation_status` (`PAID` or `PARTIALLY_PAID`). The transaction is written to `Payments` with its required `idempotency_key`.

Persisted idempotency tests:
1. **Repeated payment request:** Submitting a payment request with the same `idempotencyKey` and equivalent payload returns the original payment outcome with success without writing a duplicate row or altering balances twice.
2. **Reused key with different payload:** Submitting a request reusing an existing `idempotencyKey` with a different amount or student must be rejected with a conflict error (`409 CONFLICT` / `IDEMPOTENCY_CONFLICT`).
3. **Retry after lost response:** If a payment write succeeds in Google Sheets but the initial response was lost in transit, a client retry using the same `idempotencyKey` must return the original payment record and current obligation state safely.

### AT-07 — Partial and Full Payment

A partial payment leaves the correct positive outstanding amount (`obligation_status = PARTIALLY_PAID`). A payment that settles the remaining obligation produces a zero outstanding amount (`obligation_status = PAID`). The displayed status agrees with the persisted transaction ledger. Overdue remains a derived display state.

### AT-08 — Payment Correction

Voiding or correcting a payment preserves the original record and creates the required audit trail. The resulting balance is recalculated from valid transactions (`obligation_status` returns to `OPEN` or `PARTIALLY_PAID`). No normal UI action silently deletes the historical transaction.

### AT-09 — Package Balance and CREDIT_BACK

The displayed class balance is calculated as `remaining_classes = purchased_classes - (consumed_classes - credited_back_classes) + approved_credit_adjustments`.
- `consumed_classes` counts unique eligible sessions with `class_credit_effect = CONSUME`.
- `credited_back_classes` counts unique audited restoration session records with `class_credit_effect = CREDIT_BACK` and a valid `credit_restoration_for_session_id` referencing a historical `CONSUME` session on the same student and package.
- `CREDIT_BACK` creates a distinct, audited session record preserving the original `CONSUME` session unchanged.
- Tests verify:
  1. A restoration must reference an existing historical session record whose `class_credit_effect` is `CONSUME`.
  2. Restorations referencing nonexistent session IDs, non-`CONSUME` sessions, or sessions belonging to another student/package are strictly rejected.
  3. The same `CONSUME` credit cannot be restored twice: submitting a second `CREDIT_BACK` record where `credit_restoration_for_session_id` matches an existing restoration record must be rejected with an integrity error.
  4. Each valid restoration record changes the package balance by exactly $+1$ restored credit (decrementing net consumed credits by 1).
  5. Field population verification: The restoration record correctly populates `session_status = COMPLETED`, `attendance_status = NOT_MARKED`, `scheduled_end = scheduled_start` (zero duration), `actual_start`/`actual_end = null`, `meeting_link_id = null`, and `notes` with the documented correction reason.
  6. Operational schedule isolation: Operational calendar queries, upcoming sessions, "next scheduled class", and attendance queues strictly exclude `CREDIT_BACK` records. They are rendered exclusively in the package history and credit audit ledger.
  7. Terminal immutability: Re-submitting attendance, rescheduling, or attempting to cancel a `CREDIT_BACK` record is rejected with `INVALID_STATE`.
- The balance is derived from persisted records and cannot be changed solely by editing a display field.

### AT-10 — Class Scheduling, Completion, and Deduplication

A scheduled class does not consume a class (`class_credit_effect = PENDING`).

Completing a session applies the finalized Version 1 policy:
- When a session is `COMPLETED`, attended, and linked to an eligible package, it stores `class_credit_effect = CONSUME` and deducts exactly one class credit from the package.
- A completed session without an eligible package stores `class_credit_effect = NO_CONSUME` and must not change any package balance.
- Class completion deduplication: Script locking, existing-state validation, and single-credit-consumption protection ensure that repeated or retried completion calls for the same session do not consume a second credit.

### AT-11 — Cancellation and Rescheduling Outcomes

- A `CANCELLED` session (including late cancellations under the default policy) stores `class_credit_effect = NO_CONSUME` and consumes 0 credits by default.
- A `RESCHEDULED` placeholder/superseded session stores `class_credit_effect = NO_CONSUME` and consumes 0 credits.
- Rescheduling preserves historical audit trails and does not double-count class consumption.

### AT-12 — No-Show and Attendance Policy Verification

Acceptance tests must verify the exact persisted `class_credit_effect` enum and package balance impact for every attendance outcome:
- `COMPLETED` and attended with eligible package: `class_credit_effect = CONSUME` (consumes 1 credit).
- `NO_SHOW`: `class_credit_effect = NO_CONSUME` (0 credits consumed by default).
- `ABSENT`: `class_credit_effect = NO_CONSUME` (0 credits consumed by default).
- `EXCUSED`: `class_credit_effect = NO_CONSUME` (0 credits consumed).
- `CANCELLED`: `class_credit_effect = NO_CONSUME` (0 credits consumed by default).
- `RESCHEDULED`: `class_credit_effect = NO_CONSUME` for superseded session.

The system must not infer a charge or credit deduction from free-form notes or meeting link clicks.

### AT-13 — Meeting Links

A student can have multiple active meeting links. The UI identifies the provider and label. Unsafe URL schemes are rejected. Deactivating an old link preserves its record and prevents it from being selected as a valid default.

### AT-14 — Archive and Reactivation

Archiving a student removes them from default active operational views without deleting historical records. Reactivation restores active operational visibility and reuses the same student ID.

### AT-15 — Notes

The administrator can add a dated note to a student. Notes remain accessible after archiving and do not substitute for structured fee or class transactions.

### AT-16 — Dashboard Metrics

Dashboard totals are derived from persisted records and documented filters. Metrics must not double-count students, obligations, payments, or sessions. Empty datasets display zero or an explicit unavailable state as appropriate.

### AT-17 — Data Import Preview

Before importing, the administrator can review source mapping and validation outcomes. Missing required fields, invalid values, and duplicate candidates are identified before finalization.

### AT-18 — Import Reconciliation

Every processed source row receives a clear outcome. Batch totals reconcile with row outcomes. Re-running an import must not silently create duplicate students, payments, or sessions.

### AT-19 — Export

An authorized administrator can export the selected supported data. Exported dates and monetary amounts retain their meaning and precision. Authentication secrets and tokens are never included.

### AT-20 — Audit Trail

Important mutations create audit records with actor, timestamp, entity, action, outcome, and relevant safe change summary. An audit entry must not falsely report a mutation as successful when persistence failed.

## 6. Security Acceptance Criteria

The following tests must pass before real data is imported:

- Anonymous reads and writes are rejected.
- Invalid, expired, or wrongly targeted identity tokens are rejected.
- A non-allowlisted identity is rejected.
- Client-supplied claims such as `isAdmin` do not grant permission.
- Unknown API operations are rejected.
- Invalid payloads do not mutate the spreadsheet.
- Private spreadsheet permissions are verified.
- No privileged credential is present in frontend bundles or repository history.
- Authentication tokens are not placed in URLs or logs.
- Meeting URLs are rendered safely and unsafe schemes are blocked.
- Production data is not used by development or preview environments.
- API errors do not reveal stack traces, tokens, or unnecessary personal information.
- The application does not rely on JSONP or disabled browser security to expose private data.

A failed security acceptance test blocks release even if functional tests pass.

## 7. Data Integrity and Failure Tests

Verify that:
- Missing required spreadsheet tabs or headers cause a clear controlled failure.
- Duplicate headers are detected.
- Unknown enum values are rejected.
- Broken foreign-key references are rejected.
- A failed write is not shown as successful in the UI.
- Retrying an idempotent operation does not duplicate its effect.
- Lock acquisition failures are handled without leaving misleading success state.
- Partial multi-record operations are detectable and recoverable.
- Sorting spreadsheet rows does not corrupt relationships.
- A restored backup preserves IDs, relationships, payment history, class history, and audit records.

## 8. Financial Test Vectors

Use independent expected-value fixtures rather than deriving expected results using the same production calculation function.

Minimum cases:

1. Obligation INR 1,000; no payments; outstanding INR 1,000.
2. Obligation INR 1,000; valid payment INR 400; outstanding INR 600.
3. Obligation INR 1,000; valid payments INR 400 and INR 600; outstanding INR 0.
4. Obligation INR 1,000; payment INR 400 later voided; outstanding returns to INR 1,000.
5. A void obligation contributes zero to the outstanding total.
6. A payment allocated to a different student's obligation is rejected.
7. A duplicate payment submission is applied at most once.
8. Overpayment is rejected or handled according to the explicit credit policy; it must never be silently discarded.

All amounts use the configured INR precision and documented rounding rules.

## 9. Class-Balance Test Vectors

Minimum cases:

1. Package with 10 purchased classes and no completed sessions has 10 remaining.
2. One valid class-consuming completed session leaves 9 remaining.
3. A scheduled session leaves the balance unchanged.
4. A cancelled session leaves the balance unchanged unless an explicit policy says otherwise.
5. A rescheduled session is not counted twice.
6. A completed session is charged at most once.
7. A no-show follows the explicitly approved policy.
8. A valid documented credit adjustment affects the balance exactly once.
9. A session referencing a package belonging to another student is rejected.
10. A valid audited restoration record with `class_credit_effect = CREDIT_BACK` and valid `credit_restoration_for_session_id` referencing a historical `CONSUME` session increases package remaining classes by exactly 1 (e.g., from 9 back to 10).
11. Duplicate restoration rejection: Submitting a second `CREDIT_BACK` record referencing the same `credit_restoration_for_session_id` is rejected, preventing double restoration.
12. Invalid restoration target rejection: Submitting a `CREDIT_BACK` record referencing a non-existent session ID, a session with `class_credit_effect != CONSUME`, or a session for a different package/student is rejected with zero change to package balance.

If a business rule has not been finalized, the corresponding case is a release blocker for that behavior, not permission for the implementation agent to guess.

## 10. Import and Migration Tests

Test imports with:
- Equivalent headers in different column orders.
- Approved header aliases.
- Missing required columns.
- Blank optional fields.
- Duplicate student candidates.
- Duplicate transaction candidates.
- Invalid dates and amounts.
- Invalid foreign-key relationships.
- Empty source tabs.
- Interrupted imports.
- Repeated imports of the same source.
- A mixture of valid and invalid rows.

Acceptance conditions:
- The preview accurately describes what will happen.
- Invalid rows do not become valid records by silent coercion.
- Source-row outcomes are recorded.
- Batch counts reconcile with row outcomes.
- Re-import does not silently duplicate previously imported records.
- The operator can identify and resolve ambiguous matches.
- Original source data remains unchanged by default.

## 11. Performance and Usability Checks

The implementation must be tested using a synthetic dataset sized to the expected initial workload, including realistic historical payment and class-session counts.

Record response time for common operations:
- Initial dashboard load.
- Student search.
- Student profile load.
- Payment recording.
- Class completion.
- Import preview and processing.

Before release, the project must define and pass explicit performance thresholds appropriate to that dataset and the Apps Script execution limits. Do not claim scalability based solely on a small empty spreadsheet.

Manual usability checks must confirm that the administrator can complete the core workflows without routine direct spreadsheet editing.

## 12. Deployment Smoke Tests

After deploying a release to the preview environment:
- Confirm the expected frontend version loads.
- Confirm the backend reports the expected application and schema version.
- Sign in as the authorized test administrator.
- Verify a protected read and a controlled test write.
- Verify an unauthorized request is rejected.
- Verify the UI handles a backend error.
- Verify meeting-link navigation with a safe test URL.
- Confirm the preview uses only the test spreadsheet.

Production smoke tests must be non-destructive and must never create fake financial or student records without an approved cleanup and audit plan.

## 13. Backup and Recovery Acceptance

Before release:
- Create a backup of the test spreadsheet.
- Restore it into a separate spreadsheet.
- Verify the required tabs and headers.
- Compare record counts and stable IDs.
- Verify representative student-to-enrollment, package, payment, and class relationships.
- Verify audit and import history are retained.
- Document the restoration steps and any manual configuration required.

A backup process is not accepted until a restoration test has succeeded.

## 14. Release Gate

A release may proceed only when:

- The production build and static checks pass.
- All critical and high-priority defects are resolved.
- Core functional acceptance tests pass.
- Authentication and authorization tests pass.
- Financial and class-balance test vectors pass.
- Import reconciliation tests pass.
- The actual browser-to-Apps-Script integration works securely.
- Production and non-production configuration are separated.
- Spreadsheet permissions have been reviewed.
- Backup and recovery have been tested.
- Known limitations and deferred items are documented.

No release may proceed with a known defect that could expose private records, corrupt financial history, double-count class consumption, or silently duplicate imported records.

## 15. Defect Severity

**Critical**
- Unauthorized access to student or financial data.
- Data loss or corruption affecting multiple records.
- Incorrect financial balances with no reliable detection.
- Authentication bypass.

Release status: Blocked.

**High**
- Incorrect payment allocation or class balance.
- Duplicate financial transactions.
- Broken archive/reactivation history.
- Import behavior that silently duplicates or overwrites records.
- Production writes routed to the wrong spreadsheet.

Release status: Blocked until fixed or formally resolved with an approved safe workaround that does not compromise integrity.

**Medium**
- A core workflow is impaired but data remains safe and recoverable.
- A significant dashboard metric or filter is incorrect.

Release status: Must be resolved before release unless explicitly accepted and documented by the product owner.

**Low**
- Cosmetic or minor usability issue without material data, security, or workflow impact.

Release status: May be deferred with documented owner and follow-up.

## 16. Test Evidence

For each release, retain:
- Build and static-check results.
- Automated test results.
- Security test results.
- Financial and class-balance fixture results.
- Import reconciliation test results.
- Preview deployment smoke-test results.
- Backup restoration evidence.
- Known-defect list and release decision.

Evidence must not include real student details, authentication tokens, or unnecessary sensitive data.

## 17. Definition of Test Completion

Testing is complete when all applicable test layers have been executed,
release-gate criteria are satisfied, failures have been triaged, and the
results are recorded against the tested version of the application.

The implementation agent must not mark testing complete merely because
the frontend builds or the dashboard appears to work with mock data.

# 10 — Testing and Acceptance Criteria

## 1. Purpose

This document defines the minimum test strategy and release acceptance criteria for the Student Management Dashboard. It is the authoritative source for determining whether an implementation satisfies the documented product, data, security, and operational requirements.

Testing must validate behavior across the React frontend, Google Apps Script API, and Google Sheets datastore. A feature is not complete merely because its screen renders or a happy-path demo works.

## 2. Testing Principles

1. Test observable behavior and documented contracts, not implementation details without user value.
2. Test business rules at the backend boundary; frontend validation is not a substitute.
3. Use synthetic test data by default. Do not copy real student or parent data into development or automated test environments.
4. Every defect must be reproducible and have an expected-versus-actual result.
5. Tests must cover success, invalid input, unauthorized access, missing records, and relevant failure cases.
6. Financial and class-balance calculations must be deterministic and independently verifiable.
7. A test must not pass merely because the UI displays a success message; persisted state must be checked.
8. Production release is blocked by unresolved critical or high-severity security defects.

## 3. Test Levels

### 3.1 Unit Tests

Test isolated functions and modules, especially:
- Input validation and normalization.
- Fee balance calculations.
- Package class-balance calculations.
- Overdue status calculations.
- Student lifecycle transitions.
- Meeting URL validation.
- API response parsing and error normalization.
- Date and timezone conversion.
- Import column mapping and row validation.

Unit tests should not require production Google credentials or production spreadsheet access.

### 3.2 Backend Integration Tests

Run against a dedicated test Apps Script deployment and a separate test spreadsheet.

Verify:
- Authentication and authorization.
- Request validation.
- Repository reads and writes.
- Foreign-key consistency.
- Audit-log creation.
- Idempotency for retryable mutations.
- Correct handling of empty tabs and malformed rows.
- Locking and conflict behavior for protected mutations.

### 3.3 Frontend Integration Tests

Verify:
- Pages load with valid API responses.
- Loading, empty, success, and error states are clear.
- Forms submit valid data and display validation errors.
- Failed mutations do not falsely appear successful.
- Successful mutations refresh affected data.
- Search and filters do not modify stored records.
- Authentication expiry returns the user to an appropriate signed-out state.

### 3.4 End-to-End Tests

Test complete administrator workflows through the deployed test frontend and test backend. Include the cross-origin browser integration used by the real deployment.

### 3.5 Manual Release Checks

Manually verify the production configuration, spreadsheet permissions, Google sign-in, meeting-link behavior, import preview, backup, and recovery process before the first real-data import.

## 4. Test Environments

### Local Development
- Synthetic fixtures only.
- No production spreadsheet ID or privileged production credentials.
- Mock API responses may be used for isolated frontend work but must not be mistaken for integration tests.

### Integration / Staging
- Separate Apps Script deployment.
- Separate test spreadsheet.
- Test-only configuration and administrator identity.
- Safe synthetic student, fee, payment, package, session, and meeting-link records.

### Production
- Real records only after the security release gate passes.
- No destructive test runs against production data.
- Smoke tests must use a documented, non-destructive procedure.

The test environment must never fall back silently to the production spreadsheet.

## 5. Test Data and Fixtures

Create a reusable synthetic fixture set containing:
- An active student with one enrollment and one active package.
- An inactive student with complete historical records.
- A returning student with multiple enrollments.
- A student with no payment history.
- A student with a fully paid obligation.
- A student with a partially paid obligation.
- A student with an overdue obligation.
- A student with more than one meeting link, including Zoom and Google Meet.
- Scheduled, completed, cancelled, rescheduled, absent, and no-show sessions.
- Import rows with valid data, missing fields, duplicate candidates, invalid dates, and invalid amounts.

Fixtures must use obviously synthetic names, phone numbers, emails, and references.

## 6. Functional Acceptance Tests

### AT-01: Authentication

Given an unauthenticated browser session, when a protected page or API operation is requested, the application must not expose student or financial data.

Given the configured administrator signs in successfully, when the backend verifies the identity and token, authorized dashboard data may be returned.

Given a signed-in but unauthorized account, an expired token, an invalid token, or a token with the wrong audience, the backend must reject protected requests.

Pass criteria: access is decided server-side, and rejected requests return a consistent error without protected payload data.

### AT-02: Create and Find a Student

Given valid required student details, when the administrator creates a student, the backend generates a unique stable student ID and persists the record.

When the administrator searches by supported name or student ID, the correct record is discoverable.

When required fields are missing or invalid, the request is rejected and no partial student record is created.

Pass criteria: one persisted record exists, its ID remains stable after sorting, and search results match the saved record.

### AT-03: Student Profile and History

Given a student with related enrollments, packages, fee obligations, payments, sessions, meeting links, and notes, when the administrator opens the profile, related records are associated with the correct student.

Given two students with similar names, their related records must remain separated by IDs.

Pass criteria: no relationship is inferred solely from display names or row positions.

### AT-04: Fee Obligations and Payments

Given an obligation of INR 5,000 with no valid payments, the outstanding amount is INR 5,000.

Given a valid payment of INR 2,000 allocated to that obligation, the paid amount becomes INR 2,000 and the outstanding amount becomes INR 3,000.

Given a further valid payment of INR 3,000, the outstanding amount becomes zero and the obligation is shown as paid.

Given a payment that references another student's obligation, the backend rejects it.

Given a duplicate submission with the same idempotency key, the operation must not create a second payment.

Given a payment is voided through the authorized correction flow, the original transaction remains auditable and is excluded from effective paid totals.

Pass criteria: displayed balances match calculations from persisted, valid transactions.

### AT-05: Due and Overdue Status

Given an obligation with a due date in the future and a positive balance, it is not overdue.

Given an obligation whose due date has passed and whose outstanding balance is positive, it is overdue according to the configured business timezone.

Given an obligation with zero outstanding balance, it is not presented as unpaid or overdue.

Pass criteria: date-boundary behavior is tested in Asia/Kolkata time and does not depend on the browser's local timezone.

### AT-06: Packages and Class Balances

Given a package containing 10 purchased classes and no completed chargeable sessions, the remaining balance is 10.

Given 3 completed sessions charged to that package, the remaining balance is 7.

Scheduled, cancelled, and rescheduled sessions must not consume a class unless an explicit documented policy says otherwise.

No-show behavior must follow the finalized rule in Document 05 and be covered by a separate test.

A session linked to a package belonging to a different student must be rejected.

Pass criteria: the balance is derived from persisted package and session records, not from a manually edited remaining-count field.

### AT-07: Scheduling and Attendance

The administrator can create a scheduled session with valid start and end times, assign the correct student and optional package, and later record its outcome.

Invalid time ranges must be rejected.

A cancelled or rescheduled session must not be counted twice.

A completed session must satisfy the required completion and attendance rules defined in Document 05.

Pass criteria: session state transitions and class-balance effects are consistent and auditable.

### AT-08: Meeting Links

The administrator can save multiple links for one student, identify each provider, select a preferred active link, and open the selected link.

Unsafe schemes such as javascript: must be rejected.

A deactivated or expired link must not be presented as a valid default.

A link assigned to a session must belong to the same student or satisfy the explicit sharing rule, if one is later approved.

Pass criteria: links are persisted and associated with the correct records; no unsafe URL is executed.

### AT-09: Archive and Reactivate

When a student is made inactive, the student is excluded from default active views but remains available in historical search.

All historical enrollments, payments, sessions, notes, and links remain available.

When the student returns, the administrator can reactivate the same student ID or create a new enrollment under that identity as appropriate.

Pass criteria: no historical record is deleted, and reactivation does not create a duplicate identity automatically.

### AT-10: Notes and Audit Trail

The administrator can add a dated note to a student and later retrieve it.

Important changes create audit entries with the verified actor, action, entity, timestamp, outcome, and safe change summary.

Failed mutations must not create audit entries that falsely claim the change succeeded.

Pass criteria: notes remain associated with the correct student and audit events reflect actual outcomes.

### AT-11: Import Preview and Reconciliation

Given a supported source sheet, the importer maps recognized columns and shows a preview before committing changes.

Rows with missing required fields, invalid amounts, invalid dates, or duplicate candidates are reported explicitly.

The administrator can review duplicate candidates and row-level results.

A repeated import must not silently duplicate already imported records.

Pass criteria: the batch summary reconciles total rows with imported, skipped, duplicate-review, and failed outcomes, according to the documented counting rules.

### AT-12: Search, Filters, and Navigation

The administrator can navigate to students, fees, packages, classes, imports, reports, and settings as supported by the product scope.

Search and filters return matching records and do not mutate the database.

Empty results display a useful empty state rather than an application error.

Pass criteria: all navigation destinations are functional and no required screen is a placeholder at release.

### AT-13: Export

An authorized export contains only the selected, permitted data and preserves identifiers, dates, and monetary precision.

Export failures must be reported clearly and must not expose secrets in the generated file.

Pass criteria: exported data can be reconciled against the persisted source records.

## 7. Security Acceptance Tests

The release must verify all of the following:

- Anonymous API requests cannot read or mutate protected records.
- Arbitrary email text supplied by the client cannot impersonate the administrator.
- Invalid, expired, or wrong-audience tokens are rejected.
- Frontend route guards are not treated as backend authorization.
- The master spreadsheet is not published to the web.
- Spreadsheet access is limited to authorized identities.
- Production secrets are absent from frontend bundles and repository history.
- Tokens are not placed in URLs or routine logs.
- API errors do not return stack traces, secrets, or unnecessary personal data.
- Cross-origin failures do not trigger an insecure fallback.
- Unsafe meeting URL schemes are rejected.
- Financial corrections and important mutations are auditable.
- Import and export endpoints require administrator authorization.

Any failure involving unauthorized access or disclosure of student or financial data blocks release.

## 8. Data Integrity and Failure Tests

Test these conditions:
- A required spreadsheet tab is missing.
- A required header is missing or duplicated.
- A referenced student or obligation does not exist.
- A related record belongs to a different student.
- Two mutations attempt to change the same important record concurrently.
- A spreadsheet write fails.
- An audit write fails.
- A network request times out after a mutation may have completed.
- A client retries a mutation.
- A response is malformed or incomplete.
- A sheet contains an empty dataset or an unexpected blank row.

The system must fail explicitly, avoid claiming success without confirmation, and provide a recovery or reconciliation path for ambiguous write outcomes.

For multi-record operations, document whether the operation is atomic or can partially complete. If partial completion is possible, return and persist enough information to reconcile it safely.

## 9. Accessibility and Usability Checks

Verify:
- Forms have visible labels and understandable validation messages.
- Keyboard users can reach and operate important controls.
- Focus is visible.
- Dialogs can be dismissed or completed accessibly.
- Status is not communicated by color alone.
- Tables remain usable at supported screen widths.
- Destructive and financially significant actions require clear confirmation.
- Loading and error states explain what the administrator can do next.

## 10. Performance Checks

Performance must be measured against a synthetic dataset representative of expected usage, including historical sessions and payments.

Measure:
- Initial dashboard load.
- Student search and filtered-list response.
- Student profile load.
- Payment recording and balance refresh.
- Class creation and update.
- Import preview and processing.
- Export generation.

Set explicit response-time budgets after the first end-to-end prototype is measured. Do not invent performance guarantees before testing the Apps Script and Sheets integration.

The implementation must avoid cell-by-cell spreadsheet calls and repeated full-sheet scans within one logical operation.

## 11. Browser and Responsive Checks

Test the supported current versions of Chrome and Safari where available, with at least one desktop and one mobile viewport.

Verify:
- Sign-in and sign-out.
- Main navigation.
- Student search and profile views.
- Payment and class forms.
- Meeting-link opening.
- Error and expired-session behavior.
- No unintended horizontal overflow on essential workflows.

The exact browser support matrix may be narrowed in Document 07 if required by the implementation constraints.

## 12. Release Smoke Test

Before each production release, run a short non-destructive checklist:

1. Frontend loads over HTTPS.
2. Authorized administrator can sign in.
3. An unauthorized identity cannot access protected data.
4. Dashboard data loads from the intended production backend.
5. Student search returns expected records.
6. A read-only student profile loads.
7. Payment and class screens load without errors.
8. Meeting-link buttons use the saved URL and correct provider.
9. Production configuration points to the intended spreadsheet.
10. Logs contain no tokens or unnecessary personal information.

Do not create or void real financial transactions merely to test the production deployment.

## 13. Defect Severity

Critical:
- Unauthorized data access or disclosure.
- Data loss or widespread corruption.
- Incorrect financial totals affecting multiple records.
- Authentication bypass.

High:
- Incorrect payment or class-balance calculation.
- Incorrect student-to-record association.
- Failed archive/reactivation behavior that loses history.
- Import behavior that silently duplicates or overwrites records.

Medium:
- A major workflow is impaired but safe data recovery is possible.
- Search, filtering, or navigation is materially incorrect.
- Important validation or error handling is missing.

Low:
- Cosmetic issues that do not block safe completion of core tasks.

Critical and high-severity defects must be resolved before release. Medium-severity defects require explicit product-owner approval and a documented mitigation before release. Low-severity issues may be deferred with a tracked follow-up.

## 14. Definition of Test Completion

Testing is complete when:
- Every functional requirement has one or more acceptance tests.
- Every critical business rule has unit and integration coverage where practical.
- Security acceptance tests pass.
- End-to-end core workflows pass in the staging deployment.
- Import and reconciliation tests pass with representative fixtures.
- No critical or high-severity defect remains open.
- Test results and known limitations are recorded.
- Backup and restoration have been tested before real-data use.

## 15. Release Decision

Release is permitted only when all mandatory criteria in this document pass and the security release gate in Document 03 is satisfied.

A visually complete frontend is not sufficient evidence of release readiness.

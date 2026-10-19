# 12 — Implementation Agent Instructions

## 1. Purpose

This document is the implementation handoff for the Student Management Dashboard. It instructs a coding agent to implement the product defined by the approved documentation package without inventing requirements, changing the architecture silently, or overengineering the solution.

The agent must read the existing numbered documentation before writing application code. These instructions do not replace the requirements, schemas, business rules, API contracts, UI specification, file architecture, migration rules, security requirements, testing criteria, or deployment procedures defined in the other documents.

## 2. Required Reading Order

Read the following documents in order before implementation:

1. `00-document-index.md`
2. `01-product-requirements.md`
3. `02-system-architecture.md`
4. `03-security-and-authentication.md`
5. `04-google-sheets-data-model.md`
6. `05-business-rules-and-workflows.md`
7. `06-apps-script-api-specification.md`
8. `07-frontend-product-and-ui-specification.md`
9. `08-frontend-file-and-code-architecture.md`
10. `09-data-import-and-migration.md`
11. `10-testing-and-acceptance-criteria.md`
12. `11-deployment-and-operations.md`

If any listed document is missing, do not fabricate its contents. Identify the missing document and request that it be completed before implementing features that depend on it.

## 3. Authority and Conflict Resolution

Use the following documents as the authoritative source for each area:

- Product scope: `01-product-requirements.md`
- Overall architecture: `02-system-architecture.md`
- Security and authentication: `03-security-and-authentication.md`
- Google Sheets tabs, columns, and relationships: `04-google-sheets-data-model.md`
- Domain rules and state transitions: `05-business-rules-and-workflows.md`
- API operations and payloads: `06-apps-script-api-specification.md`
- Pages and user interactions: `07-frontend-product-and-ui-specification.md`
- Source-code structure: `08-frontend-file-and-code-architecture.md`
- Import and reconciliation: `09-data-import-and-migration.md`
- Test requirements: `10-testing-and-acceptance-criteria.md`
- Deployment and operations: `11-deployment-and-operations.md`

If two documents conflict, stop the affected work, report the exact conflict, identify its implementation impact, and propose the smallest documentation correction. Do not resolve the conflict by silently choosing an interpretation or changing schemas, API contracts, or business rules.

## 4. Product and Architecture Guardrails

Implement the agreed small, single-administrator system:

- Frontend: React, TypeScript, and Vite.
- Hosting: Vercel, subject to current plan eligibility and applicable terms.
- Backend: Google Apps Script Web App.
- Datastore: one canonical private Google Spreadsheet with documented tabs.
- Version control: GitHub when a repository and remote are available.

Do not add Supabase, Firebase, a SQL database, a separate server, microservices, queues, a state-management framework, or other infrastructure unless the approved documents explicitly require it or a documented architecture blocker is approved for resolution.

The frontend must never access the master spreadsheet directly. All protected reads and writes must go through the backend and be authorized server-side.

The application is for one authorized administrator in Version 1. Do not build student or parent accounts, staff roles, tenant support, or a public portal.

## 5. Domain Rules That Must Not Be Lost

Preserve these product constraints throughout implementation:

- A student's identity is stable across active, inactive, and returning periods.
- Inactive students are archived from routine active views, not deleted.
- Historical payments, class records, notes, and enrollment information remain retrievable.
- The calendar and scheduled-class workflow are required.
- Meeting links are required; a student may need both Zoom and Google Meet links.
- Attendance is marked manually by the administrator.
- A class is deducted from the class balance only when both the teacher and the student attended, as defined by the approved business rules.
- Schedule changes are expected to be relatively rare; implement a clear, reliable workflow rather than a complex scheduling engine.
- The dashboard is the normal day-to-day interface and writes changes back to Google Sheets.
- Automate repetitive work where safe, but require human review when identity, duplicate resolution, or financial reconciliation is uncertain.
- Notifications may be shown inside the dashboard. Do not add paid notification services. External notifications may only be added if the approved requirements establish that they can be delivered reliably at no cost.
- The system must not invent payment, attendance, class-credit, or import data to make a screen look complete.

If the approved data model or business-rules document contradicts one of these established constraints, report the conflict before coding the affected behavior.

## 6. Mandatory File Architecture

Follow `08-frontend-file-and-code-architecture.md` exactly.

The global constraints are:

- Every domain in `src/` and `public/` must be a directory of single-purpose micro-files.
- Every source file must be under 150 lines; use a maximum of 149 lines.
- No catch-all files such as `actions.js`, `app.js`, or equivalent monoliths.
- No monolithic CSS files.
- No single component may combine unrelated domains or workflows.
- Keep presentation, API communication, validation, business logic, and persistence concerns separated according to the architecture.
- Avoid artificial fragmentation that makes a simple function harder to understand. Each file still needs one clear responsibility.
- Do not bypass the line limit by compressing code onto long lines or removing useful formatting.

Before considering a domain complete, check its file list and line counts. Split files by responsibility whenever a file reaches the limit.

## 7. Implementation Sequence

Work in small, verifiable phases. Do not build the entire application in one uncontrolled generation pass.

### Phase 0 — Documentation and Repository Audit

1. Inspect all numbered documentation files.
2. Check for missing files, unresolved decisions, and contradictions.
3. Inspect the existing repository before changing it.
4. Preserve existing valid work; do not overwrite files merely to match personal preferences.
5. Produce a short implementation plan with dependencies and acceptance tests.
6. Identify any integration proof that must pass before real data is used.

Exit criteria: required specifications are available, conflicts are recorded, and the plan respects the approved architecture.

### Phase 1 — Minimal Integration Proof

Before importing real student data, verify the browser-to-Apps-Script communication path with synthetic data only.

Verify:
- The chosen authentication flow.
- Token verification and administrator allowlisting.
- HTTPS transport.
- Request and response parsing.
- Cross-origin behavior and redirect handling.
- Rejection of anonymous and unauthorized requests.
- Safe error handling.
- No public access to the master spreadsheet.

Do not work around browser security with JSONP or by exposing the spreadsheet. If the chosen integration cannot satisfy the documented security requirements, stop and request an explicit architecture decision.

Exit criteria: the integration proof passes the relevant security and acceptance checks.

### Phase 2 — Repository and Configuration Foundation

1. Create the frontend and Apps Script project structure specified by the architecture document.
2. Configure TypeScript, Vite, formatting, linting, and tests only as required by the approved toolchain.
3. Establish separate development and production configuration.
4. Keep secrets out of source control and frontend bundles.
5. Add health checks and schema validation.
6. Add only the shared utilities needed by real features.

Exit criteria: the project builds, checks pass, and no production secrets are present in the repository.

### Phase 3 — Backend Data and Security Foundation

1. Implement authenticated request handling.
2. Implement operation routing according to the API specification.
3. Implement request validation and consistent error responses.
4. Implement centralized spreadsheet access and header validation.
5. Implement stable ID generation.
6. Implement repository functions and relationship checks.
7. Implement audit logging for required mutations.
8. Add locking and idempotency protections where specified.
9. Add backend tests using synthetic data.

Exit criteria: unauthenticated access is rejected, schema mismatches fail safely, and core repository operations pass tests.

### Phase 4 — Core Student Workflows

Implement in dependency order:

1. Student creation, listing, search, and profile editing.
2. Student archive and reactivation.
3. Enrollment and the documented package model.
4. Fee obligations and payment ledger.
5. Financial balance calculations and correction/void workflows.
6. Meeting-link management.
7. Calendar, class scheduling, rescheduling, and cancellation.
8. Manual attendance and class-balance effects.
9. Student notes and follow-ups.
10. Dashboard summaries and filters.

Do not create a feature before its data model, API contract, and business rules are defined. Do not substitute a local-only mock for a working backend integration while claiming the feature is complete.

Exit criteria: each workflow persists data, reloads correctly, handles failures, and passes its acceptance tests.

### Phase 5 — Import and Reconciliation

1. Inspect representative source Sheets.
2. Map source columns to the canonical schema.
3. Normalize column names, dates, amounts, statuses, and meeting URLs.
4. Detect potential duplicate students and duplicate transactions.
5. Show a preview and validation report before writing records.
6. Require explicit confirmation before committing an import.
7. Record batch and row-level results.
8. Support safe retries without creating duplicate records.
9. Reconcile imported counts and financial totals against source data.
10. Keep original source spreadsheets unchanged during initial migration.

Do not import real data until security checks and a restore plan have passed. Do not auto-merge ambiguous student identities. Present uncertain matches for administrator review.

Exit criteria: a test import can be reconciled, retried safely, and traced to source rows.

### Phase 6 — UI Completion and Accessibility

1. Complete all required pages and interactions from the UI specification.
2. Add loading, empty, error, success, and confirmation states.
3. Make validation errors understandable and actionable.
4. Ensure destructive and financially significant actions require suitable confirmation.
5. Check responsive layouts and keyboard usability.
6. Verify that filters and search do not mutate data.
7. Verify that meeting links are clearly labeled and safely opened.
8. Verify that the interface does not expose data to unauthenticated users.

Exit criteria: the application supports all documented day-to-day workflows without requiring routine edits in Google Sheets.

### Phase 7 — Testing, Hardening, and Release

1. Run all unit tests.
2. Run backend and frontend integration tests.
3. Run the acceptance scenarios in Document 10.
4. Test unauthorized and malformed requests.
5. Test duplicate submissions and concurrent mutations where applicable.
6. Test archive/reactivation and historical data retention.
7. Test financial calculations and class-credit rules with boundary cases.
8. Test import failure and recovery scenarios.
9. Test backup restoration.
10. Test the production build and deployment configuration.
11. Verify all `src/` and `public/` source files meet the line limit.
12. Document any remaining limitations; do not mark failed requirements as complete.

Exit criteria: all release-blocking tests pass and the deployment checklist is complete.

## 8. Coding Standards

- Use TypeScript types for domain entities, API requests, and API responses.
- Avoid `any` unless a narrow, documented boundary makes it unavoidable.
- Keep validation explicit and reusable where appropriate.
- Use named functions and clear names for business concepts.
- Keep functions small and focused.
- Handle rejected requests and malformed responses explicitly.
- Avoid silent catch blocks and ignored errors.
- Do not use hard-coded spreadsheet row numbers or column letters.
- Do not duplicate financial calculations across UI components.
- Do not store authoritative financial or class balances in frontend state.
- Do not rely on frontend validation for data integrity or security.
- Do not introduce dependencies without a concrete requirement.
- Keep third-party libraries to the minimum needed for the approved features.
- Use accessible labels and controls.
- Keep user-facing errors clear without exposing stack traces or secrets.

## 9. API and Data Contract Rules

- Implement the API operations and response envelope defined in Document 06.
- Treat the Google Sheets schema in Document 04 as authoritative.
- Treat the workflows in Document 05 as authoritative.
- Validate references between related records on the backend.
- Generate IDs on the backend.
- Use documented date, timezone, and currency conventions.
- Distinguish a missing field from an explicit empty value where relevant.
- Do not silently coerce invalid amounts, dates, IDs, or status values.
- Make state-changing operations safe against accidental repeated submission as specified by the API contract.
- Do not report success before the backend confirms persistence.
- If a multi-record operation partially fails, return the documented failure state and support reconciliation.

## 10. Financial and Class-Tracking Safeguards

Financial and class balances are derived from persisted source records and documented business rules.

The implementation agent must:
- Use one authoritative backend calculation for each balance.
- Preserve original payment records when correcting errors.
- Represent voids, reversals, and adjustments explicitly.
- Avoid rounding values inconsistently between screens and exports.
- Ensure a payment cannot be allocated to another student's obligation.
- Ensure a session cannot affect another student's package.
- Deduct a class only when the documented attendance conditions are satisfied.
- Prevent rescheduling or retrying an operation from deducting the same class twice.
- Keep cancelled sessions from consuming classes unless an approved policy explicitly says otherwise.
- Test boundary conditions, including zero remaining classes, partial payment, overpayment, voided payments, and incomplete attendance.

If the documents do not specify a financial or attendance edge case, do not invent a policy. Record the unresolved case and request a decision.

## 11. Authentication and Privacy Rules

- Never embed privileged credentials in frontend code.
- Never trust an email address or administrator flag supplied by the browser without verified identity.
- Never make the master spreadsheet public.
- Never expose real student data in preview deployments or screenshots without explicit authorization and safeguards.
- Never log identity tokens, secrets, or unnecessary personal information.
- Fail closed when authentication or authorization cannot be verified.
- Do not use production student data in tests; use synthetic fixtures.
- Do not add analytics that transmit student notes, contact details, meeting URLs, or financial information.
- Verify the security behavior of every new protected API operation.

## 12. Testing Rules

Every feature must include tests appropriate to its risk.

At minimum, test:
- Valid and invalid input.
- Missing required fields.
- Invalid or nonexistent related IDs.
- Unauthorized access.
- API failure and malformed responses.
- Persistence and reload behavior.
- Duplicate submission behavior for mutations.
- Historical record preservation.
- Boundary conditions for financial and class calculations.
- Empty states and error states in the UI.

Tests must be repeatable and must not depend on real student data or manual production edits.

A test that has not been run must not be reported as passing.

## 13. Git and Change Management

- Inspect the current branch and working tree before editing.
- Never discard unrelated user changes.
- Make small, logical commits when Git is available.
- Use clear commit messages describing the change.
- Do not commit secrets, private exports, real student records, or generated credentials.
- Do not push to a remote unless a remote exists and the user-authorized workflow permits it.
- Report whether changes are committed locally and whether they were pushed.
- Update the relevant documentation when an approved implementation decision changes a contract.
- Do not claim a commit was created unless Git confirms it.

## 14. Required Deliverables

The coding agent must produce:

1. Frontend source code following Document 08.
2. Apps Script backend source code following the backend architecture.
3. Documented spreadsheet initialization and schema validation.
4. Authentication and authorization implementation.
5. All required dashboard workflows.
6. Import preview, validation, and reconciliation workflow.
7. Unit, integration, security, and acceptance tests.
8. Environment/configuration templates containing placeholders only.
9. Deployment instructions and required Apps Script configuration steps.
10. Backup and restoration instructions.
11. A README with setup, local development, testing, and deployment steps.
12. A list of implemented requirements and their test evidence.
13. A list of unresolved issues and known limitations.
14. A clean Git history of logical changes, where Git is available.

## 15. Definition of Done

A requirement is complete only when:
- It matches the approved documentation.
- The implementation is connected to the intended backend where required.
- Server-side validation and authorization are in place.
- Relevant tests have been run and pass.
- Failure states are handled.
- Historical and related data remain consistent.
- The UI reflects persisted state accurately.
- The required documentation is updated.
- Source files comply with the directory and line-count rules.

The product is release-ready only when all release-blocking acceptance tests pass, the production configuration is verified, authentication is tested, a backup can be restored, and the administrator can complete the required workflows without direct routine spreadsheet editing.

## 16. Agent Reporting Format

At the end of each implementation phase, report:

1. Phase completed.
2. Requirements implemented.
3. Files created or changed.
4. Tests run and their actual results.
5. Git commit hash, if committed.
6. Known issues or blocked work.
7. Any documentation conflicts or decisions required.
8. Confirmation that no secrets or real student data were committed.

Do not report the whole project as complete when only the current phase is complete.

## 17. Final Instruction

Build the smallest reliable implementation that satisfies the approved specifications.

Do not redesign the product, add speculative features, replace the chosen stack, weaken security, fabricate missing business rules, or overengineer the system. Prefer a clear, maintainable implementation with strong data integrity over a larger collection of abstractions.

When uncertain, inspect the documentation, identify the exact gap, and ask for a decision before implementing behavior that could affect privacy, money, attendance, class balances, or historical records.

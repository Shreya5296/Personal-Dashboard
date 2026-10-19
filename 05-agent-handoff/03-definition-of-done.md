# 03 — Definition of Done

## 1. Purpose

This document defines the conditions that must be met before the Student Management Dashboard is considered complete and safe to use with real student data.

A feature is not done merely because its screen exists or its happy path works. It must be implemented, validated, tested, documented, and integrated with the agreed architecture.

## 2. Product-Level Completion

- [ ] The administrator can sign in and sign out using the approved authentication flow.
- [ ] Only the explicitly authorized administrator can access protected data and operations.
- [ ] The dashboard, student directory, student profile, enrollments, packages, fee obligations, payments, classes, meeting links, notes, imports, and required reports are implemented according to the approved specifications.
- [ ] Search, filters, empty states, loading states, validation messages, and failure states work as specified.
- [ ] Inactive students remain available in historical views and can be reactivated without creating duplicate identities.
- [ ] Routine management can be performed through the dashboard without directly editing the master spreadsheet.
- [ ] No unapproved feature or behavior has been added that changes the agreed scope.

## 3. Data and Business Rules

- [ ] The master spreadsheet contains the approved tabs and exact documented headers.
- [ ] Schema validation detects missing tabs, missing headers, duplicate headers, and unsupported schema versions.
- [ ] All records use stable backend-generated IDs; row numbers and names are never treated as IDs.
- [ ] Foreign-key relationships are validated server-side before writes.
- [ ] Fee balances are derived from valid fee obligations and payment transactions, not manually maintained totals.
- [ ] Payment recording, correction, and voiding preserve an auditable transaction history.
- [ ] Package balances are calculated according to the approved class-credit rules.
- [ ] Cancelled or rescheduled sessions do not accidentally count as completed sessions or consume class credits.
- [ ] No-show, absence, excused attendance, and cancellation behavior follows the finalized business rules.
- [ ] Invalid or duplicate import rows are reported and do not silently overwrite existing data.
- [ ] Archiving does not delete student, enrollment, payment, package, class, meeting-link, note, or audit history.

## 4. Security and Privacy

- [ ] All protected API operations authenticate and authorize requests on the server.
- [ ] Invalid, expired, incorrectly scoped, or unauthorized identity tokens are rejected.
- [ ] Client-supplied administrator flags, email addresses, IDs, or permissions are never trusted as proof of authorization.
- [ ] The master spreadsheet is private and is not published to the web.
- [ ] No privileged credential, secret, or private backend configuration is included in frontend code or committed to the repository.
- [ ] The cross-origin frontend-to-Apps-Script request flow has been tested in supported browsers without disabling browser security or exposing private data through JSONP.
- [ ] Inputs are validated server-side, including dates, amounts, enums, IDs, relationships, and meeting URLs.
- [ ] Logs and user-facing errors do not expose authentication tokens, secrets, or unnecessary student and financial information.
- [ ] Meeting URLs are rendered safely and unsafe URL schemes are rejected.
- [ ] Important data changes and financial corrections produce appropriate audit records.
- [ ] Security tests for anonymous access and unauthorized accounts pass.

## 5. Frontend and Code Quality

- [ ] The frontend uses the approved React, TypeScript, and Vite stack.
- [ ] The implementation follows the authoritative frontend directory and file architecture.
- [ ] Every domain in `src/` and `public/` is organized into directories of single-purpose micro-files.
- [ ] Every source file in `src/` and `public/` is under 150 lines.
- [ ] There are no catch-all files such as `actions.js` or `app.js`, and no monolithic CSS files.
- [ ] UI components do not contain unrelated business logic or direct spreadsheet access.
- [ ] Shared utilities have narrow, documented responsibilities.
- [ ] TypeScript checks pass without unresolved type errors.
- [ ] Linting and production build checks pass using the repository's documented commands.
- [ ] The interface is usable at supported desktop, tablet, and mobile widths.
- [ ] Controls have accessible names, visible focus states, and appropriate keyboard behavior.
- [ ] The UI never reports a mutation as successful before the backend confirms success.

## 6. API and Backend Quality

- [ ] The implemented API matches the authoritative API specification.
- [ ] Requests and responses use the documented common response envelope.
- [ ] Unknown operations, malformed payloads, invalid relationships, and unauthorized requests are rejected explicitly.
- [ ] Business rules are enforced in backend services rather than only in the frontend.
- [ ] Spreadsheet reads and writes use the centralized access layer and validated header mappings.
- [ ] Important concurrent mutations use the documented locking and conflict-handling strategy.
- [ ] Duplicate submissions are handled according to the documented idempotency behavior.
- [ ] Partial-write and audit-failure behavior is documented and tested for important operations.
- [ ] API errors are actionable without revealing sensitive implementation details.

## 7. Import and Migration

- [ ] Source spreadsheets can be mapped to the canonical schema using the documented import process.
- [ ] Import preview and validation occur before records are committed.
- [ ] Duplicate candidates and ambiguous student matches require explicit review rather than unsafe automatic merging.
- [ ] Imported data preserves source references needed for reconciliation.
- [ ] Each import batch has a status and row-level results.
- [ ] Imported, skipped, duplicate-review, and failed row counts reconcile with the source row count.
- [ ] Re-running an import does not silently create duplicate records or overwrite existing records.
- [ ] A migration report can identify unresolved rows and required manual corrections.
- [ ] The first real-data import is performed only after security and recovery release gates pass.

## 8. Testing Requirements

- [ ] Unit tests cover core business calculations and validation rules.
- [ ] Integration tests cover API handlers, authorization, and spreadsheet access behavior.
- [ ] Tests cover partial payments, full payments, voided transactions, overdue obligations, and balance calculations.
- [ ] Tests cover package consumption, completed sessions, cancellation, rescheduling, and no-show rules.
- [ ] Tests cover student archiving and reactivation with retained history.
- [ ] Tests cover malformed imports, duplicate detection, partial failures, and reconciliation.
- [ ] End-to-end tests cover the primary administrator workflows.
- [ ] Security acceptance tests in the security specification pass.
- [ ] Critical workflows are tested with representative data volumes.
- [ ] No known critical or high-severity defect remains open at release.
- [ ] Test results and any accepted lower-severity limitations are documented.

## 9. Deployment and Operations

- [ ] Development and production configuration are separated.
- [ ] Production configuration references the intended production spreadsheet and Apps Script deployment.
- [ ] Secrets are configured outside committed source files.
- [ ] The frontend production build deploys successfully to the approved Vercel project and plan.
- [ ] The Apps Script backend is deployed as a versioned Web App with the approved access settings.
- [ ] The deployed frontend and backend pass an end-to-end smoke test.
- [ ] The documented backup procedure has been executed successfully.
- [ ] A restoration test has demonstrated that required data can be recovered.
- [ ] Deployment, rollback, troubleshooting, and recovery instructions are current.
- [ ] The owner knows how to rotate credentials, update the Apps Script deployment, and identify the active production version.

## 10. Documentation and Handoff

- [ ] All required architecture documents are finalized and mutually consistent.
- [ ] The README explains setup, configuration, local development, tests, and deployment.
- [ ] Required configuration keys are documented without revealing secret values.
- [ ] The master spreadsheet schema and migration procedure are documented.
- [ ] The API contract and error behavior match the implementation.
- [ ] Known limitations, quotas, and operational constraints are documented.
- [ ] The implementation agent has not silently changed an approved architecture decision.
- [ ] The repository contains only intended project files and no real student data, credentials, tokens, or accidental exports.
- [ ] The final handoff identifies completed work, test results, deployment locations, and any explicitly deferred items.

## 11. Release Blockers

The application must not be approved for real student data if any of the following is true:

- Authentication or server-side authorization can be bypassed.
- The master spreadsheet is publicly accessible.
- The frontend-to-backend integration requires disabling browser security or exposing private records through an unsafe workaround.
- Financial balances or class balances are demonstrably incorrect.
- Historical payments or class records can be silently lost through ordinary operations.
- Import can silently overwrite or duplicate important records.
- Backup restoration has not been verified.
- A critical or high-severity security defect remains unresolved.

## 12. Final Acceptance

The product owner may accept the release only after reviewing the acceptance-test results and confirming that the release blockers are cleared.

Any incomplete requirement must be explicitly marked as deferred, with its impact documented and the product owner's approval recorded. A coding agent must not mark the project complete merely because the application builds or deploys.

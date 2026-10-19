# 01 — Implementation Sequence

## 1. Purpose

This document defines the required implementation order for the Student Management Dashboard. It is the execution plan for a coding agent after the architecture and product specifications have been reviewed and approved.

The agent must implement the existing specification, not redesign the product. If requirements conflict, are incomplete, or depend on an unverified platform capability, stop at the relevant gate and report the issue before proceeding.

## 2. Governing Decisions

- Frontend: React, TypeScript, and Vite.
- Hosting: Vercel, subject to plan terms and suitability for the intended business use.
- Backend: Google Apps Script Web App.
- Canonical datastore: one private Google Spreadsheet with documented tabs and schemas.
- Version control: Git repository hosted on GitHub when a remote is configured.
- Initial user model: one authorized administrator.
- No Supabase, separate database server, parent portal, or multi-tenant architecture in Version 1.
- Every domain under `src/` and `public/` must be organized into directories of single-purpose micro-files.
- Every source file under those domains must contain fewer than 150 lines. Do not satisfy this limit by compressing code onto long lines.
- Do not introduce catch-all files such as `actions.js`, `app.js`, or monolithic CSS files.
- No real student data may be used until the security release gate passes.

## 3. Source-of-Truth Order

Before coding, read the documentation in this order:

1. `00-documentation/00-document-index.md`
2. `00-documentation/01-product-requirements.md`
3. `00-documentation/02-system-architecture.md`
4. `00-documentation/03-security-and-authentication.md`
5. `00-documentation/04-google-sheets-data-model.md`
6. `00-documentation/05-business-rules-and-workflows.md`
7. `00-documentation/06-apps-script-api-specification.md`
8. `00-documentation/07-frontend-product-and-ui-specification.md`
9. `00-documentation/08-frontend-file-and-code-architecture.md`
10. `00-documentation/09-data-import-and-migration.md`
11. `00-documentation/10-testing-and-acceptance-criteria.md`
12. `00-documentation/11-deployment-and-operations.md`
13. `00-documentation/12-implementation-agent-instructions.md`
14. `00-documentation/13-glossary-and-architecture-decisions.md`, if present
15. `01-frontend/`, `02-backend/`, `03-data/`, and `04-quality-and-operations/` supporting specifications
16. This implementation sequence and the remaining `05-agent-handoff/` documents

Some repository structures may split detailed specifications into supporting folders. If a referenced document does not exist, do not invent its contents or assume it was approved. Identify the missing dependency and ask for it or use the explicitly designated authoritative document.

## 4. Implementation Principles

1. Build in small, verifiable increments.
2. Complete and test one phase before beginning the next phase that depends on it.
3. Keep API contracts, schemas, business rules, and UI behavior aligned with the documents.
4. Prefer simple solutions over new dependencies or infrastructure.
5. Use typed request and response models at the frontend boundary.
6. Validate all protected operations on the server.
7. Keep persistence access inside the backend data-access layer.
8. Do not expose spreadsheet IDs as secrets or embed privileged credentials in frontend code.
9. Never use mock data as though it were live persisted data.
10. Use synthetic test data during development.
11. Make errors explicit and actionable without exposing secrets or unnecessary personal data.
12. Keep source files under 150 lines and split files by responsibility.
13. Update tests and documentation when a requirement changes.
14. Do not claim a phase is complete until its exit criteria pass.

## 5. Phase 0 — Repository and Specification Audit

### Tasks

- Inspect the repository and current Git status.
- Confirm the expected folder structure.
- Read all authoritative architecture and product documents.
- Identify missing documents, contradictory requirements, unresolved decisions, and unverified platform assumptions.
- Confirm the current branch and whether a Git remote exists.
- Establish a baseline list of requirements and their planned tests.
- Do not overwrite existing work merely to match an assumed structure.

### Deliverables

- Specification audit notes.
- List of blockers and resolved conflicts.
- Confirmed implementation checklist.

### Exit criteria

- The coding agent can identify the authoritative schema, business rules, API contract, frontend specification, security requirements, and deployment procedure.
- No unresolved conflict is silently ignored.

## 6. Phase 1 — Architecture Feasibility Spike

This phase must happen before building the full application because the separate Vercel-hosted browser frontend and Apps Script Web App have cross-origin and authentication constraints.

### Tasks

- Create a minimal, isolated proof of concept using synthetic data only.
- Verify the selected Google sign-in approach and token verification strategy.
- Verify that Apps Script can validate the identity and administrator allowlist server-side.
- Verify browser request behavior from the intended frontend origin.
- Verify response readability, redirects, preflight behavior where applicable, and error handling.
- Verify that no request relies on JSONP or disabled browser security.
- Verify that the spreadsheet remains private and cannot be read directly by an unauthenticated browser.
- Record relevant Apps Script quotas, deployment constraints, and execution limits.

### Deliverables

- Minimal frontend-to-backend integration proof.
- Written record of the tested request and authentication flow.
- List of platform limitations and the chosen supported integration pattern.

### Exit criteria

- A browser request can reach the backend using the intended secure flow.
- The backend rejects anonymous and unauthorized requests.
- The frontend can safely read a test response after authorization.
- No real student data or production spreadsheet is used.

### Stop condition

If the secure integration cannot be demonstrated using supported platform behavior, stop. Present the evidence and the smallest viable architecture adjustment for approval. Do not weaken authentication, publish the spreadsheet, expose privileged credentials, or introduce an unapproved proxy.

## 7. Phase 2 — Repository Foundation and Tooling

### Tasks

- Set up the frontend project using the approved React, TypeScript, and Vite stack.
- Set up the Apps Script project using the documented repository workflow.
- Configure formatting, linting, type checking, and automated tests.
- Configure environment-specific settings without committing secrets.
- Add a clear README for local development and test commands.
- Establish the documented domain-based directory tree.
- Add automated checks for source-file line limits and forbidden catch-all files.
- Keep generated files and build output out of source directories where appropriate.

### Deliverables

- Reproducible project setup.
- Initial directory tree.
- Lint, type-check, and test commands.
- Safe configuration template containing placeholders only.

### Exit criteria

- A clean checkout can install dependencies and run the documented checks.
- No secret is present in the repository.
- Source-file policy checks pass.

## 8. Phase 3 — Data Schema and Spreadsheet Bootstrap

### Tasks

- Implement the exact approved spreadsheet schema.
- Add a controlled setup or validation procedure for required tabs and headers.
- Implement header-based field mapping rather than relying on column letters.
- Validate unique IDs and required columns.
- Add schema-version handling and explicit migration behavior.
- Add test fixtures using synthetic students, enrollments, packages, fee obligations, payments, sessions, links, notes, and audit entries.
- Ensure setup does not silently rename, reorder, or delete existing production data.

### Deliverables

- Schema validation and setup scripts.
- Synthetic test spreadsheet or isolated test environment.
- Schema validation tests.

### Exit criteria

- All required tabs and headers are validated.
- Missing or duplicate headers produce explicit failures.
- Record IDs do not depend on row positions.
- Development setup cannot accidentally write to production data.

## 9. Phase 4 — Backend Foundation

### Tasks

- Implement the API entry point and operation routing.
- Implement a consistent success and error response envelope.
- Implement request parsing and schema validation.
- Implement server-side authentication and authorization.
- Implement centralized spreadsheet access and repository helpers.
- Implement request correlation IDs and safe operational logging.
- Add appropriate locking and idempotency support for important mutations.
- Add audit-log writing for supported state changes.
- Ensure failures are explicit and do not masquerade as successful writes.

### Deliverables

- Tested API foundation.
- Authentication and authorization middleware or equivalent shared guards.
- Centralized data-access layer.
- Standard error handling.

### Exit criteria

- Anonymous and unauthorized requests are rejected.
- Invalid operations and malformed requests are rejected.
- Repository code is the only route to spreadsheet persistence.
- Logs do not include authentication tokens or unnecessary personal data.

## 10. Phase 5 — Backend Domain Services

Implement domains in this order so dependent records and calculations have a stable foundation.

### 5.1 Students

- Create, read, update, search, archive, and reactivate students.
- Validate required fields and stable IDs.
- Preserve historical relationships.

### 5.2 Enrollments

- Create and update enrollment periods.
- Validate student ownership and lifecycle transitions.
- Preserve previous enrollment records.

### 5.3 Packages

- Create packages and class allocations.
- Validate quantities, prices, dates, and enrollment relationships.
- Implement authoritative remaining-class calculations as specified.

### 5.4 Fee obligations

- Create, update, and void charges according to business rules.
- Calculate paid and outstanding balances from valid transactions.
- Apply due-date and overdue rules consistently.

### 5.5 Payments

- Record payments, allocate them to valid obligations, and prevent duplicate submissions.
- Implement corrections or voiding with audit history.
- Enforce the documented overpayment and advance-credit policy.

### 5.6 Meeting links

- Create, edit, deactivate, and select preferred links.
- Validate provider, URL scheme, and student ownership.

### 5.7 Class sessions and attendance

- Schedule, complete, cancel, reschedule, and record outcomes.
- Apply the approved package-consumption policy exactly once.
- Preserve session and change history.

### 5.8 Notes and follow-ups

- Create and edit dated notes.
- Validate student references.
- Preserve auditability.

### 5.9 Audit and operational reporting

- Verify audit coverage for important mutations.
- Implement only the reports and aggregates specified in the product documents.

### Exit criteria

- Each domain has tests for valid operations, invalid inputs, missing references, unauthorized access, and relevant state transitions.
- Financial and class balances are derived from persisted source records.
- Historical records are retained.

## 11. Phase 6 — Frontend Foundation

### Tasks

- Implement the documented application shell and navigation.
- Implement login, sign-out, session loading, and protected routes.
- Implement the centralized API client.
- Implement typed request and response models.
- Implement consistent loading, empty, success, and error states.
- Implement reusable form controls and validation presentation.
- Implement accessible dialogs and confirmations.
- Implement shared date, currency, and status formatting.
- Keep domain behavior out of presentation-only components.

### Deliverables

- Navigable authenticated application shell.
- Central API client and domain service boundaries.
- Shared UI primitives and formatting helpers.

### Exit criteria

- Protected pages do not display private records before authorization.
- Expired or invalid authentication is handled safely.
- API failures are visible and do not silently leave stale data presented as current.
- File and directory constraints pass.

## 12. Phase 7 — Frontend Product Screens

Implement screens in the following sequence:

1. Dashboard overview.
2. Student directory, search, and filters.
3. Student creation and editing.
4. Student profile and historical sections.
5. Enrollment management.
6. Package management and class balance display.
7. Fee obligations and payment ledger.
8. Payment recording and correction workflows.
9. Class schedule and session management.
10. Attendance and class completion.
11. Meeting-link management and join actions.
12. Notes and follow-ups.
13. Import preview and reconciliation.
14. Reports and exports.
15. Application settings and health checks.

For each screen:
- Follow the approved UI specification.
- Connect to real backend operations, not permanent hard-coded data.
- Implement loading, empty, error, and success states.
- Validate inputs before submission for usability.
- Rely on backend validation for security and integrity.
- Refresh affected data after successful mutations.
- Prevent repeated submission while an operation is in progress where practical.

### Exit criteria

- All specified navigation paths work.
- Each form and action has a defined success and failure behavior.
- The UI accurately reflects backend responses.
- No screen exposes data to unauthenticated users.

## 13. Phase 8 — Import and Migration

### Tasks

- Implement source-sheet inspection and column mapping.
- Support explicit mappings for equivalent source headers.
- Normalize dates, monetary values, statuses, and meeting links.
- Preview the import before writing records.
- Detect likely duplicate students and duplicate transactions.
- Preserve source spreadsheet, tab, and row references where useful.
- Create import batch and row-level result records.
- Provide reconciliation counts and actionable row errors.
- Make retries safe and prevent duplicate imports where practical.
- Require explicit confirmation before importing into production.

### Deliverables

- Import preview workflow.
- Import execution and reconciliation report.
- Documented recovery procedure for failed or partial imports.

### Exit criteria

- A representative synthetic source dataset imports correctly.
- Invalid rows are reported, not silently dropped.
- Duplicate candidates are surfaced for review.
- Totals and record counts reconcile against the source.
- Existing target records are not silently overwritten.

## 14. Phase 9 — Integration and End-to-End Testing

### Tasks

- Run frontend unit and component tests.
- Run backend unit and service tests.
- Run API integration tests against an isolated test spreadsheet.
- Run browser tests for the main administrative workflows.
- Test authentication failures and unauthorized operations.
- Test concurrent and repeated submissions for critical mutations.
- Test partial payments, voids, overdue fees, package exhaustion, no-shows, cancellations, and rescheduling.
- Test archiving and reactivation with complete history.
- Test imports with malformed, duplicate, and incomplete rows.
- Test responsive behavior and basic accessibility.
- Test API and spreadsheet failures without data corruption.

### Exit criteria

- All mandatory acceptance criteria pass.
- No known critical or high-severity security issue remains open.
- Financial and class-balance test cases match documented calculations.
- Tests use synthetic or isolated data.

## 15. Phase 10 — Deployment Preparation

### Tasks

- Configure the production Apps Script deployment.
- Configure the production spreadsheet and permissions.
- Configure the frontend production environment in Vercel.
- Verify Google identity client configuration and administrator allowlist.
- Verify that secrets are stored only in appropriate protected settings.
- Confirm plan eligibility and terms for the intended business use.
- Run a production-like smoke test using non-sensitive test data.
- Verify logs, backup, restore, and rollback procedures.
- Verify the production build contains no test credentials or private fixture data.

### Exit criteria

- Production and development resources are separated.
- Authentication and authorization pass against the production deployment.
- Backup and recovery procedures are usable.
- Deployment and rollback steps are documented.

## 16. Phase 11 — Controlled Data Migration

### Tasks

- Inventory the existing Google Sheets.
- Standardize headers and resolve known schema differences.
- Create a verified source-to-target mapping.
- Identify duplicate people and conflicting contact information.
- Reconcile fee totals, payment history, class balances, and meeting links.
- Take a pre-import backup of the target environment.
- Run a dry run and review its report.
- Import a small representative subset first.
- Validate results with the administrator.
- Import the remaining approved data in controlled batches.
- Keep the original source sheets unchanged until verification is complete.

### Exit criteria

- Imported counts reconcile with the approved source inventory.
- Financial and class-history discrepancies are documented and resolved or explicitly accepted.
- No source sheet is deleted or overwritten as part of migration.
- The administrator approves the migrated dataset before routine use.

## 17. Phase 12 — Release and Handover

### Tasks

- Complete the release checklist.
- Confirm all acceptance tests pass.
- Confirm the source tree complies with the micro-file policy.
- Confirm there are no committed secrets or production student records.
- Provide setup, deployment, backup, recovery, and troubleshooting instructions.
- Record known limitations and deferred features.
- Tag or identify the release commit.
- Confirm repository status and remote push status accurately.

### Deliverables

- Working deployed application.
- Source repository.
- Approved documentation package.
- Test results.
- Migration reconciliation report.
- Operations and recovery instructions.
- Known-issues list, if any.

### Exit criteria

- The administrator can perform the primary workflows independently.
- The system has passed the documented release gates.
- No unresolved blocker is represented as complete.

## 18. Required Cross-Phase Checks

At the end of every phase, the agent must verify:

- Tests relevant to the phase pass.
- Linting and type checking pass where applicable.
- No source file exceeds 149 lines.
- No catch-all domain files have been introduced.
- No credentials or real student records were committed.
- The API contract and schemas have not drifted.
- Documentation has been updated for approved changes.
- Git diff contains only intended changes.

## 19. Git and Commit Policy

- Work in the existing repository and current intended branch unless instructed otherwise.
- Inspect Git status before changing files.
- Never discard unrelated user changes.
- Use small, meaningful commits at completed milestones.
- Do not commit secrets, real student data, generated credentials, or local environment files.
- Run relevant checks before committing.
- Report the exact commit hash after a successful commit.
- Do not claim a commit was pushed unless a remote push succeeded.
- If no remote exists or credentials are unavailable, report that the commit is local only.
- Do not rewrite published history without explicit approval.

Suggested commit milestones:

1. `chore: establish project tooling and structure`
2. `feat: add spreadsheet schema validation`
3. `feat: implement authenticated Apps Script API foundation`
4. `feat: implement student and enrollment services`
5. `feat: implement packages and financial ledger`
6. `feat: implement class sessions and meeting links`
7. `feat: add authenticated dashboard foundation`
8. `feat: implement student management screens`
9. `feat: add import and reconciliation workflow`
10. `test: complete acceptance and security coverage`
11. `docs: finalize deployment and handover`

Use only the commit message appropriate to the work actually completed.

## 20. Agent Reporting Format

At the end of each phase, report:

- Phase name and status.
- Files created or changed.
- Tests and checks executed.
- Results, including failures.
- Decisions or blockers requiring owner input.
- Security or data-integrity concerns discovered.
- Commit hash, if committed.
- Whether changes were pushed to a remote.
- Exact next phase and its prerequisites.

Never report success solely because files were generated. Success requires the phase's exit criteria to pass.

## 21. Final Definition of Implementation Completion

Implementation is complete only when:

- All required Version 1 workflows are implemented.
- The architecture feasibility gate passed.
- Authentication and authorization are enforced server-side.
- Spreadsheet schemas and API contracts match the documentation.
- Financial and class balances pass their acceptance tests.
- Import and reconciliation have been tested.
- Historical records survive archiving and reactivation.
- Deployment, backup, recovery, and troubleshooting are documented.
- Source-file organization meets the required micro-file constraints.
- No critical or high-severity known issue remains unresolved.
- The administrator has a working release and can operate it using the handover documentation.

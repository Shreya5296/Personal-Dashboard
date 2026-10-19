# 02 — Coding Agent Rules

## 1. Purpose

These rules govern any coding agent working on the Student Management Dashboard. The agent must implement the approved documentation, not redesign the product or invent undocumented behavior.

The product is an admin-only student management application using:

- React, TypeScript, and Vite for the separate frontend.
- Google Apps Script as the backend API and business-logic layer.
- Google Sheets as the canonical datastore.
- Vercel for frontend hosting, subject to current plan eligibility and terms.
- GitHub for version control.

The architecture must remain appropriately small for a single administrator and a modest operational workload.

## 2. Source-of-Truth Order

Before making changes, inspect the available project files and read the relevant specifications. Use this authority order:

1. Explicitly approved decisions and constraints from the project owner.
2. `00-documentation/` product and architecture specifications.
3. Domain-specific documents in `01-frontend/`, `02-backend/`, `03-data/`, and `04-quality-and-operations/`.
4. Agent-handoff documents in `05-agent-handoff/`.
5. Existing implementation, only where it does not conflict with approved specifications.

If documents conflict, stop the affected work, report the exact conflict, and propose the smallest documentation change needed. Do not silently choose an interpretation or implement both incompatible approaches.

Do not assume a referenced document exists merely because it appears in an index. Check the workspace. If required documentation is missing, identify it as a blocker rather than fabricating its contents.

## 3. Documentation-First Workflow

The project owner has explicitly chosen to finalize the documentation before implementation.

Until the owner authorizes implementation:

- Write and review documentation only.
- Do not scaffold the application.
- Do not generate application source code.
- Do not create production services or deploy infrastructure.
- Do not connect to real student spreadsheets.
- Do not import real student or payment data.

Once implementation is authorized, follow `01-implementation-sequence.md` and the acceptance criteria. Do not skip ahead because a later feature seems easy to build.

## 4. Mandatory Micro-File Architecture

Every domain in `src/` and `public/` must be a directory of single-purpose micro-files. Each source file must remain strictly under 150 lines: maximum 149 lines.

This rule is mandatory, not a suggestion.

### 4.1 Required practices

- Organize files by domain and responsibility.
- Give each file one clear reason to change.
- Split large components into smaller components, hooks, schemas, types, and services where appropriate.
- Keep business rules out of presentation components.
- Keep API transport concerns out of domain components.
- Keep styles close to their owning component or domain.
- Use explicit names that communicate responsibility.
- Check file lengths after creating or modifying files.

### 4.2 Prohibited patterns

Do not create catch-all or monolithic files such as:

- `actions.js`
- `app.js` used as a catch-all for unrelated logic
- `utils.ts` containing unrelated helpers
- `helpers.ts` containing unrelated helpers
- `api.ts` containing every endpoint and domain operation
- A single giant page component containing all dashboard behavior
- A monolithic CSS file for the entire application

A necessary framework entry point is allowed only for its narrow entry-point responsibility. It must not become a place for unrelated application logic.

### 4.3 Splitting guidance

Split by meaningful responsibility, not by arbitrary line count. Examples include:

- A page shell and its individual sections.
- A form component and its validation schema.
- An API client and individual domain API modules.
- A business service and its repository.
- A table and its filters, columns, and row actions.
- CSS tokens, shared primitives, and domain-specific styles.

Do not evade the limit by minifying code, putting many statements on one line, or moving source into generated strings. Count comments and blank lines when checking the limit so the rule is applied consistently.

The precise directory tree must follow `08-frontend-file-and-code-architecture.md` and the approved backend structure. Do not invent an alternative tree without documenting and approving the change.

## 5. Security Rules

- The frontend must never access the master Google Spreadsheet directly.
- Never place privileged credentials, service-account secrets, private tokens, or spreadsheet write credentials in frontend code.
- Never commit secrets to source control.
- Every protected backend operation must authenticate and authorize the caller server-side.
- Never trust a frontend flag such as `isAdmin` as proof of authorization.
- Never trust an email address supplied as ordinary request data.
- Validate identity tokens using the approved verification flow, including issuer, expiry, and audience checks where applicable.
- Fail closed when authentication or authorization cannot be verified.
- Do not make the spreadsheet public or publish it to the web.
- Do not use JSONP, disabled browser security, or other insecure workarounds to expose private records.
- Do not log authentication tokens, secrets, or unnecessary student, guardian, or financial information.
- Validate meeting URLs and render them as links, never as executable HTML.
- Do not add third-party analytics that receive student or financial data without explicit approval and documented privacy review.

If the selected frontend-to-Apps-Script integration cannot support the required secure authenticated request flow, stop and report the blocker. Do not weaken security to make a demo work.

## 6. Data and Business-Rule Integrity

- Google Sheets is the canonical datastore.
- Use stable backend-generated IDs; never use row numbers, names, or phone numbers as record IDs.
- Reference related records by IDs and validate relationships server-side.
- Use the exact approved tab names, column names, enum values, and data types.
- Resolve columns by validated headers, not hard-coded column letters.
- Do not add undocumented columns or rename schema fields without an approved migration.
- Do not calculate authoritative financial or class balances only in the frontend.
- Do not treat a manually edited remaining-class count as the source of truth.
- Do not overwrite payment history to represent a correction.
- Do not hard-delete inactive students or their historical records through normal UI actions.
- Do not count cancelled or rescheduled classes as completed classes.
- Do not silently create duplicate students or duplicate import records.
- Use the approved rules for partial payments, overpayments, refunds, no-shows, credits, and package adjustments. If a rule is not specified, flag it for a product decision.
- Use locking and revalidation for concurrent mutations where required by the backend specification.
- Do not claim a multi-record operation is atomic unless the implementation actually guarantees it.

## 7. API and Error Handling

- Follow the approved API contract exactly.
- Use the documented request and response envelope.
- Validate every request on the backend, including requests from the legitimate frontend.
- Reject unknown operations and malformed payloads.
- Return stable, documented error codes and safe user-facing messages.
- Do not return stack traces, secrets, or internal implementation details to the browser.
- Do not report success before persistence has succeeded.
- Treat malformed, unexpected, or incomplete API responses as errors.
- Keep transport, domain validation, business logic, and spreadsheet persistence in their documented layers.
- Do not duplicate business rules across frontend and backend. Frontend checks may improve usability, but backend checks are authoritative.

## 8. Frontend Rules

- Use TypeScript types for domain data and API contracts.
- Avoid `any`; when unavoidable at an external boundary, narrow and validate the value immediately.
- Keep components focused and accessible.
- Provide loading, empty, success, and error states for data-driven views.
- Distinguish an actual zero from unavailable or failed data.
- Refresh or reconcile displayed data after successful mutations.
- Do not present optimistic local state as persisted truth.
- Confirm financially significant or destructive actions.
- Keep active and historical records clearly distinguishable.
- Do not expose inactive students in default active operational lists unless specified.
- Do not hard-code production URLs, spreadsheet IDs, administrator emails, or secrets into components.
- Keep environment-specific configuration separate and documented.
- Do not add dependencies for functionality that can be implemented clearly with the approved stack and existing dependencies.

## 9. Apps Script Rules

- Keep API routing, authentication, validation, domain services, repositories, and spreadsheet utilities separated by responsibility.
- Use the documented Apps Script project structure.
- Centralize spreadsheet access and header mapping.
- Validate required tabs and schema before performing mutations.
- Batch spreadsheet reads and writes where practical.
- Avoid repeated full-sheet scans inside loops.
- Use script locks for critical concurrent mutations where required.
- Keep lock duration short and release locks reliably.
- Avoid external network calls while holding a lock unless strictly necessary.
- Handle partial-write risks explicitly and provide reconciliation or recovery behavior where rollback cannot be guaranteed.
- Do not assume Apps Script offers relational transactions.
- Do not store secrets in the public `AppConfig` sheet.
- Respect Apps Script runtime, quota, payload, and deployment limitations.

## 10. Dependencies and Complexity

- Prefer the smallest dependency set that meets the documented requirements.
- Do not introduce a new framework, database, backend host, state-management library, or service without approval.
- Do not add Supabase, Firebase, a SQL database, or another persistence service unless the owner approves an architecture change.
- Do not build multi-tenant support, role hierarchies, student portals, parent portals, payment gateways, or automated meeting creation in Version 1.
- Do not introduce microservices or a generic plugin framework.
- Avoid speculative abstractions for hypothetical future requirements.
- Prefer straightforward, typed, testable modules over clever abstractions.

## 11. Testing Rules

- Add or update tests with each behavior change.
- Test business rules independently from UI rendering.
- Test API authorization and validation, not only successful requests.
- Test financial calculations with partial payments, voids, and boundary cases defined in the specifications.
- Test package balances for completed, cancelled, rescheduled, and no-show sessions according to the approved policy.
- Test imports for duplicates, invalid rows, retries, and partial failures.
- Test archiving and reactivation without loss of history.
- Test the actual frontend-to-Apps-Script integration in a controlled environment before relying on it.
- Never use production student data as casual test fixtures.
- Use synthetic fixtures with clearly fake names and contact details.
- Do not mark a test as passed unless it was actually run and its result observed.

## 12. Configuration and Environments

- Separate development, test, and production configuration.
- Do not let development code write to the production spreadsheet by accident.
- Keep secrets out of `.env` files committed to Git.
- Provide a safe example environment file containing placeholders only.
- Document each required configuration value and where it is stored.
- Validate required configuration at startup or through a documented health check.
- Fail safely when required configuration is missing.
- Do not silently fall back to production values when development configuration is absent.

## 13. Git and Workspace Rules

Before editing:

1. Inspect the current working directory and repository status.
2. Read relevant documentation and existing code.
3. Check for uncommitted user changes.
4. Do not overwrite or discard unrelated work.

During work:

- Make small, coherent changes.
- Keep generated files and dependencies intentional.
- Do not commit secrets, private exports, real student records, or local credentials.
- Do not rewrite Git history or force-push unless explicitly authorized.
- Do not claim a remote push occurred unless it actually succeeded.
- Do not claim a commit exists unless Git confirms it.

After work:

1. Run the relevant tests, type checks, lint checks, and build checks available for the project.
2. Inspect the diff for unrelated changes and accidental secrets.
3. Check that all source files remain under 150 lines.
4. Summarize files changed and checks actually run.
5. Commit only when requested or required by the current task, and report the resulting commit ID.

If the expected workspace or repository is missing, do not pretend to have modified it. Create or use a workspace only when the task context clearly authorizes that, and report any limitation accurately.

## 14. Documentation Maintenance

When an implementation changes an approved contract:

- Identify every affected document.
- Update the authoritative specification before or alongside the code change.
- Update tests and requirements traceability.
- Record the reason and impact of the change.
- Keep examples, names, enum values, and API contracts consistent.

Do not use code as an excuse to leave documentation knowingly incorrect.

## 15. Required Agent Response Format

At the end of a work unit, report briefly:

- Outcome: completed, blocked, or partially completed.
- Files created or changed.
- Tests and checks actually run, including failures.
- Any unresolved decision or blocker.
- Commit ID, if a commit was actually created.
- Remote push status, only if a push was attempted.

Do not claim completion based only on generated code or a successful-looking UI. Completion requires the relevant acceptance criteria to pass.

## 16. Definition of Compliance

An agent is compliant when it:

- Follows approved documentation and the implementation sequence.
- Preserves the documentation-first gate.
- Uses single-purpose files under 150 lines in every `src/` and `public/` domain.
- Keeps the frontend separate from privileged data access.
- Enforces authentication and authorization on the backend.
- Preserves historical student, payment, enrollment, and class records.
- Implements and tests documented business rules.
- Avoids unapproved dependencies and features.
- Reports failures and limitations honestly.
- Leaves the repository in a reviewable state.

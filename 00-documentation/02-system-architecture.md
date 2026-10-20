# 02 — System Architecture

## 1. Document Control

- Product: Student Management Dashboard
- Document ID: 02
- Status: Architecture specification
- Version: 1.0.0
- Last updated: 2026-10-19
- Depends on: `00-document-index.md`, `01-product-requirements.md`
- Architecture status: Proposed, subject to the integration validation gate in Section 14

This document defines the system boundaries, components, responsibilities, data flow, integration constraints, and deployment shape. It does not replace the authoritative spreadsheet schema, business rules, API contract, UI specification, or deployment runbook defined in their respective documents.

## 2. Architectural Goals

The architecture must:

1. Provide one private dashboard for the administrator's student-management work.
2. Keep Google Sheets as the canonical datastore for Version 1.
3. Use Google Apps Script for backend processing without adding a separate database server.
4. Host the frontend separately as a React application.
5. Keep all privileged data access and business rules on the backend.
6. Preserve student, enrollment, payment, package, class, and audit history.
7. Remain simple enough for one administrator and a relatively small operational workload.
8. Be testable and maintainable by a coding agent following the documentation package.
9. Avoid hidden assumptions about browser security, Apps Script behavior, or Google identity.
10. Keep every file in `src/` and `public/` within the single-purpose micro-file constraints in Section 11.

## 3. Architecture Summary

### 3.1 Selected stack

- Frontend: React, TypeScript, Vite
- Frontend hosting: Vercel, subject to current plan terms and project eligibility
- Backend: Google Apps Script Web App
- Canonical datastore: One private Google Spreadsheet with defined tabs
- Authentication: Server-side HMAC-SHA256 session token authentication via Script Properties (Zero GCP / Zero Google Cloud Console dependency)
- Version control: GitHub
- Local development: Node.js and npm

No Google Cloud Platform (GCP) project, OAuth consent screen, Supabase, separate SQL database, dedicated application server, or microservice infrastructure is required.

### 3.2 Logical component diagram

Browser
→ React presentation and route layer
→ Frontend domain service
→ Centralized API client
→ Authenticated request transport
→ Apps Script API entry point
→ Authentication and authorization
→ Request schema validation
→ Domain business service
→ Repository
→ Centralized Sheets access layer
→ Private master Google Spreadsheet

Responses travel back through the same request chain. The frontend may display results and maintain temporary UI state, but it is never authoritative for permissions, persisted values, or financial and class-balance calculations.

### 3.3 Trust boundaries

- The browser is an untrusted environment.
- The Vercel-hosted frontend is public static application code; it must contain no privileged secrets.
- The Apps Script backend is the enforcement point for authenticated operations.
- The master spreadsheet is private and must not be published or shared broadly.
- Google identity verification is a separate concern from application authorization.
- GitHub and deployment settings are part of the operational security boundary.

## 4. Component Responsibilities

### 4.1 React frontend

The frontend is responsible for:

- Rendering the dashboard, student directory, student profiles, payments, packages, class schedule, imports, reports, and settings.
- Collecting user input and performing immediate usability validation.
- Managing routes, filters, pagination, dialog state, and transient form state.
- Initiating login and logout flows supported by the chosen identity integration.
- Calling the backend through a single API client.
- Displaying backend responses and normalized errors.
- Refreshing affected data after successful mutations.
- Showing explicit loading, empty, saved, failed, and unauthorized states.
- Opening validated meeting links after an administrator action.
- Preventing accidental duplicate submissions where practical.

The frontend must not:

- Access the master spreadsheet directly.
- Embed service-account credentials, OAuth client secrets, or other privileged secrets.
- Decide whether a user is an administrator.
- Calculate authoritative outstanding balances or package balances independently.
- Assume a write succeeded before receiving a successful backend response.
- silently substitute mock data when the API fails.

### 4.2 Frontend domain services

Domain services provide named operations such as listing students, reading a student profile, recording a payment, scheduling a class, or importing source rows. They translate UI intent into API calls and return typed results.

Domain services must not contain React components, direct spreadsheet access, or duplicated business rules. They must use the centralized API client and shared response/error types.

### 4.3 Centralized API client

The API client is the only frontend module allowed to perform network requests to the Apps Script API. It owns:

- Base URL configuration.
- Request construction and serialization.
- Authentication token transport.
- Response parsing and schema checks.
- Error normalization.
- Request correlation identifiers where supported.
- Timeout and retry behavior where safe and technically supported.

Retries must not automatically repeat a mutation unless the operation uses an idempotency mechanism. The API client must not expose raw tokens in logs or error messages.

### 4.4 Apps Script API entry point

The API entry point receives supported requests, identifies the operation, validates the envelope, and dispatches to the relevant application service. It must reject unknown operations and malformed payloads.

The entry point must not contain all business logic or all spreadsheet operations in one file. It must delegate to single-purpose modules.

### 4.5 Authentication and authorization

The backend must verify the selected Google identity credential using a documented supported mechanism, validate the expected token properties, and check the verified identity against the configured administrator allowlist.

A client-supplied email, role, `isAdmin` flag, or user ID is not proof of identity or permission. Every protected read and write must be checked server-side.

The exact token transport and verification details are specified in `03-security-and-authentication.md` and the backend/API specifications. No implementation may weaken authentication to work around a cross-origin issue.

### 4.6 Domain business services

Business services implement application rules for:

- Students and lifecycle transitions.
- Enrollments.
- Packages and class allocation.
- Fee obligations and payment allocation.
- Class scheduling, cancellation, completion, and attendance.
- Meeting links.
- Notes and follow-ups.
- Import validation and reconciliation.
- Audit events.

A service validates relevant state and relationships before requesting persistence. Business rules must have one authoritative backend implementation rather than being independently recreated in UI components and repository code.

### 4.7 Repositories

Repositories provide entity-oriented persistence methods. They map validated domain records to spreadsheet rows and map rows back to typed records.

Repositories must not decide product policy such as whether a no-show consumes a class. They must not silently repair malformed data or silently drop fields that are required by the schema.

### 4.8 Sheets access layer

The Sheets access layer centralizes low-level spreadsheet operations. It is responsible for:

- Resolving the configured spreadsheet and tab names.
- Reading and writing ranges in batches where practical.
- Resolving columns by validated header names rather than fixed column letters.
- Validating required tabs and headers.
- Handling empty sheets and malformed rows explicitly.
- Providing controlled append, update, and read operations.
- Applying locks for operations that require serialized writes.
- Avoiding repeated full-sheet reads inside row-by-row loops.

Only this layer should know the low-level spreadsheet range and row-mapping mechanics.

### 4.9 Master Google Spreadsheet

The spreadsheet is the canonical datastore for Version 1. Its exact tabs, columns, keys, enums, and relationships are defined in `04-google-sheets-data-model.md`.

The backend must not create a second canonical spreadsheet or similarly named duplicate tabs automatically. Schema changes must use a documented migration procedure.

## 5. Backend Module Boundaries

The Apps Script project must use single-purpose modules organized by domain. Expected responsibilities include:

- API: request entry, operation dispatch, response construction.
- Auth: identity verification, allowlist checks, authorization helpers.
- Students: student profile and lifecycle operations.
- Enrollments: enrollment lifecycle and relationship validation.
- Packages: package operations and class-allocation queries.
- Fees: fee obligation operations and outstanding-balance calculations.
- Payments: payment recording, allocation, correction, and voiding.
- Classes: scheduling, rescheduling, cancellation, and completion.
- Attendance: attendance operations and policy enforcement.
- Meeting links: provider, URL, preference, and status management.
- Notes: dated notes and follow-ups.
- Imports: batch orchestration, row validation, duplicate review, reconciliation.
- Audit: append-oriented audit-event creation and querying.
- Repositories: entity-specific persistence and row mapping.
- Sheets: spreadsheet access, schema validation, and locking helpers.
- Shared: small cross-domain types and utilities with a clear purpose.

The final exact tree belongs in `08-frontend-file-and-code-architecture.md` and the backend project-structure specification. This list defines boundaries, not permission to create large catch-all files.

## 6. Data Flow

### 6.1 Read operation

1. The user opens a page or requests a search.
2. The page calls its domain service.
3. The domain service calls the centralized API client.
4. The client sends an authenticated request.
5. The backend verifies identity and authorization.
6. The backend validates the operation and filters.
7. The relevant service queries repositories.
8. Repositories use the Sheets access layer.
9. The backend returns a documented response envelope.
10. The client validates and normalizes the response.
11. The UI renders the result or an explicit error state.

### 6.2 Mutation operation

1. The user submits a form or confirms an action.
2. The frontend performs usability validation.
3. The API client sends the request with an operation/request identifier where applicable.
4. The backend authenticates and authorizes the request.
5. The service validates fields, record relationships, and current state.
6. The service acquires a script lock when serialization is necessary.
7. The service re-reads the state needed to prevent stale decisions.
8. The repository persists the change using the Sheets access layer.
9. The operation records the required audit event and handles audit failure according to the defined policy.
10. Locks are released in a guaranteed cleanup path.
11. The backend returns success only when the operation has met its documented persistence conditions.
12. The frontend refreshes affected data and displays the outcome.

A failure must not be displayed as a successful save. If a multi-record operation partially succeeds and rollback is not guaranteed, the response and audit/reconciliation records must make that state explicit.

### 6.3 Financial calculations

Payments and fee obligations are separate records. Outstanding balances are calculated from valid, non-voided payments allocated to the relevant obligation. The frontend displays backend-provided authoritative totals.

The implementation must define how overpayments, credits, refunds, and corrections behave before implementing them. No undocumented negative balances or implicit credits may be introduced.

### 6.4 Class-balance calculations

Purchased class quantity is stored on a package. Consumption is derived from qualifying session records and any explicitly supported, auditable adjustments. Scheduled, cancelled, and rescheduled sessions must not accidentally consume a class. No-show and excused-absence behavior follows the business policy in `05-business-rules-and-workflows.md`.

## 7. Data Model and Relationships

The master spreadsheet is divided into defined tabs for students, enrollments, packages, fee obligations, payments, class sessions, meeting links, notes, audit history, import batches, import row results, and non-secret application configuration.

Every entity uses a stable backend-generated ID. IDs must not depend on spreadsheet row numbers, names, phone numbers, sorting, or current display order.

Foreign-key relationships must be validated by the backend. For example, a payment cannot be allocated to another student's fee obligation, and a class session's package must belong to the same student and a compatible enrollment.

The exact schemas and required fields are owned by `04-google-sheets-data-model.md`; this document does not redefine them.

## 8. State, Caching, and Freshness

The frontend may keep temporary UI state, filters, and currently displayed records in memory. It must refresh data after successful mutations and handle stale responses safely.

Backend caching is optional and must be introduced only for a demonstrated performance need. Any cache must have documented invalidation and freshness behavior. Financial balances, permissions, and class balances must not rely on an unvalidated stale cache as their source of truth.

The initial implementation should prefer straightforward reads and batched writes over a complex caching subsystem.

## 9. Concurrency and Spreadsheet Integrity

Google Sheets does not provide relational transactions. Apps Script locking can serialize selected operations, but it does not make arbitrary multi-tab changes fully transactional.

For important mutations, the backend must:

- Validate all known inputs before writing.
- Lock the smallest practical critical section.
- Re-read relevant records while protected from competing script mutations.
- Detect duplicate or stale submissions where supported.
- Write in batches when possible.
- Release locks even when errors occur.
- Return explicit failure or partial-completion information.
- Provide reconciliation or recovery behavior for operations that cannot be rolled back atomically.

Locks must not be held during unnecessary network calls. The system must not claim transactional guarantees that Google Sheets and Apps Script do not provide.

## 10. Error Handling and Observability

All API operations use a consistent response envelope defined in the API specification. Errors must include a stable machine-readable code and a safe human-readable message. Internal stack traces, tokens, spreadsheet secrets, and unnecessary personal information must not be returned to the browser.

The frontend must distinguish at least:

- Authentication required or expired.
- Access denied.
- Invalid input.
- Record not found.
- Duplicate or conflicting operation.
- Rate limit or temporary service failure.
- Backend configuration or schema failure.
- Unexpected internal failure.

Operational logs should capture request correlation ID, operation, outcome, safe error category, and duration where practical. Logs must not contain raw authentication tokens or full sensitive payloads.

## 11. Source-File and Directory Constraints

Every domain in `src/` and `public/` must be a directory of single-purpose micro-files. The implementation must not create catch-all files such as `actions.js`, `app.js`, or monolithic CSS files.

Rules:

1. Every source file must remain under 150 lines; treat 149 lines as the maximum permitted length.
2. Split files by responsibility, not by arbitrary line count alone.
3. React components must not combine unrelated screens or workflows.
4. UI components must not contain spreadsheet access or business rules.
5. API operations, domain services, schemas, and repositories must have clear boundaries.
6. CSS must be split by component or domain and remain maintainable.
7. Avoid one-file-per-trivial-expression fragmentation; each file must have a coherent single purpose.
8. Keep barrel exports small and do not use them to hide oversized modules.
9. Generated files and build artifacts must not be committed unless explicitly required.
10. Add a repeatable check that fails when files under the governed directories reach 150 lines.
11. The same modularity principle should be applied to Apps Script source modules where the runtime and build arrangement allow it.

The exact directory tree, file naming conventions, and enforcement mechanism are defined in `08-frontend-file-and-code-architecture.md`.

## 12. Deployment Shape

### 12.1 Frontend

- Source is version-controlled in GitHub.
- Vite builds the React application into static assets.
- Vercel hosts the frontend.
- Development, preview, and production configuration are separated.
- Only non-secret configuration required by the browser may be exposed to the frontend build.
- Current Vercel plan terms must be checked before business production use.

### 12.2 Backend

- Google Apps Script runs the API logic.
- The production Web App deployment uses an explicitly selected execution identity and access configuration.
- The master spreadsheet ID and administrator allowlist are maintained in protected configuration, not frontend source or public application settings.
- Changes are versioned and deployed through a documented procedure.
- Development must not accidentally write to production student data.

### 12.3 Spreadsheet

- The master spreadsheet remains private.
- Tabs and headers are validated against the approved schema.
- Backups and restoration are documented separately.
- Routine work is performed through the dashboard, not direct manual spreadsheet edits.

The exact deployment steps are owned by `11-deployment-and-operations.md`.

## 13. Environments and Configuration

The system must distinguish local development, preview/testing, and production.

Each environment must explicitly define:

- Frontend API base URL.
- Expected Google identity client/audience configuration, as applicable.
- Backend spreadsheet identifier.
- Administrator allowlist.
- Supported schema version.
- Environment label.

Secrets must not be placed in source control, public Vite environment variables, or the AppConfig spreadsheet tab. Production and test data stores must be distinct where practical.

If separate Apps Script deployments are used for testing and production, their configuration and spreadsheet access must be clearly separated.

## 14. Mandatory Integration Validation Gate

A separately hosted browser frontend and an Apps Script Web App operate across origins. Apps Script web-app behavior, redirects, browser CORS rules, request content types, and authentication transport can affect whether a direct browser integration is viable.

Before implementing real-data workflows, create a minimal integration proof that verifies:

1. A browser can call the chosen Apps Script endpoint from the intended frontend origin.
2. The request can carry the required authentication material safely.
3. The backend can verify the administrator identity and reject unauthorized callers.
4. The browser can read the response under normal browser security rules.
5. Success and error responses can be parsed consistently.
6. Redirect behavior does not leak credentials or break the request flow.
7. Preflight behavior, where applicable, is handled without disabling browser security.
8. An invalid or expired credential cannot read or mutate data.
9. The master spreadsheet is not exposed publicly.

Do not use JSONP, public spreadsheet publishing, embedded privileged credentials, or disabled browser security as a workaround.

If the direct integration does not pass, stop before importing real data. Document the failed test and propose the smallest secure architecture adjustment for explicit review. Do not silently add a proxy, another backend, or a different database.

## 15. Architecture Trade-offs

### Benefits

- Minimal infrastructure and operational overhead.
- Google Sheets remains familiar and inspectable.
- Apps Script can perform backend work close to the spreadsheet.
- The frontend can be developed and hosted independently.
- No separate database service is required.
- Historical records can be modeled explicitly.

### Limitations

- Sheets is not a relational database and lacks full transaction semantics.
- Apps Script quotas, execution limits, and service availability apply.
- Large sheets and repeated full-table scans can become slow.
- Cross-origin browser integration requires validation.
- Authentication and authorization must be deliberately implemented.
- Concurrent writes require locking, validation, and reconciliation.
- Vercel plan eligibility and commercial-use terms may change and must be checked at deployment time.

This architecture is appropriate only while workload and data volume remain within tested limits. If those limits are exceeded, any future migration must be a documented architecture decision, not an ad hoc change.

## 16. Architecture Decisions

### ADR-001: Separate frontend

Decision: Use a separately hosted React frontend.

Reason: The administrator wants a dedicated dashboard that provides one interface for student records, payments, classes, and meeting links.

Consequence: Cross-origin integration and authentication must pass the gate in Section 14.

### ADR-002: Google Sheets datastore

Decision: Use one private master Google Spreadsheet for Version 1.

Reason: Low operational overhead and compatibility with the existing records.

Consequence: Data relationships, validation, batching, locking, and recovery must be implemented in the application.

### ADR-003: Apps Script backend

Decision: Use Google Apps Script for API and business logic.

Reason: Avoid a separately operated backend service for the initial workload.

Consequence: Apps Script quotas and integration limitations must be tested and documented.

### ADR-004: Backend authority

Decision: Backend owns authentication, authorization, validation, business rules, and authoritative calculations.

Reason: Browser code is untrusted and must not be a security boundary.

Consequence: The UI can improve usability but cannot bypass backend validation.

### ADR-005: Historical records retained

Decision: Archive or close records through explicit lifecycle states rather than deleting operational history.

Reason: Students may return and the administrator needs historical payment and class records.

Consequence: Current operational views must filter historical records without removing them.

### ADR-006: Micro-file architecture

Decision: Govern `src/` and `public/` as domain directories containing single-purpose files under 150 lines.

Reason: Prevent monolithic code and make agent-generated changes reviewable.

Consequence: The repository must include an automated line-limit check and modularity review.

## 17. Architecture Acceptance Criteria

The architecture is ready for implementation when:

- Frontend, backend, and persistence responsibilities are separated.
- The frontend has no direct master-spreadsheet access.
- All protected reads and writes require server-side authorization.
- The master spreadsheet schema is owned by its dedicated specification.
- Stable IDs and relationship validation are required.
- Financial and class balances have one authoritative backend calculation path.
- Important writes have documented concurrency and partial-failure behavior.
- Errors are structured and do not expose secrets or unnecessary personal data.
- Development and production configuration are separated.
- The browser-to-Apps-Script integration proof passes before real-data import.
- The micro-file and line-limit constraints have automated enforcement.
- Deployment, backup, recovery, and acceptance tests are specified in their dedicated documents.

## 18. Related Documents

- `00-document-index.md`
- `01-product-requirements.md`
- `03-security-and-authentication.md`
- `04-google-sheets-data-model.md`
- `05-business-rules-and-workflows.md`
- `06-apps-script-api-specification.md`
- `07-frontend-product-and-ui-specification.md`
- `08-frontend-file-and-code-architecture.md`
- `09-data-import-and-migration.md`
- `10-testing-and-acceptance-criteria.md`
- `11-deployment-and-operations.md`
- `12-implementation-agent-instructions.md`
- `13-glossary-and-architecture-decisions.md`

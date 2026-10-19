# 04 — Requirements Traceability

## 1. Purpose

This document links product requirements and architectural constraints to their authoritative specifications, implementation areas, and verification tests. It is the compact control sheet for confirming that the finished application implements the agreed product rather than a coding agent's assumptions.

## 2. Traceability Rules

1. Every requirement marked required must map to at least one implementation area and one verifiable acceptance test.
2. Product behavior is defined by the product requirements and business-rules documents; the API and data model must implement that behavior consistently.
3. A coding agent must not mark a requirement complete because a screen exists. The behavior must work end to end, including persistence and error handling where applicable.
4. Tests must use synthetic data until the security release gate has passed.
5. A requirement may be deferred only with an explicit reason and approval from the product owner.
6. When a requirement changes, update this matrix and every affected authoritative document and test.
7. Do not add a new requirement merely because a technical library makes it easy to do so.

## 3. Requirement Status Values

- `PLANNED`: specified but not implemented.
- `IN_PROGRESS`: implementation has started.
- `IMPLEMENTED`: code exists but verification is incomplete.
- `VERIFIED`: acceptance test passed against the integrated application.
- `BLOCKED`: cannot proceed because a dependency or decision is unresolved.
- `DEFERRED`: explicitly excluded from the current release by the product owner.

The initial status for all requirements is `PLANNED` unless a later implementation record proves otherwise.

## 4. Product Requirement Traceability

| ID | Requirement | Authoritative specification | Implementation area | Required verification |
|---|---|---|---|---|
| PR-01 | Secure administrator sign-in and sign-out | `00-documentation/03-security-and-authentication.md` | Frontend auth, Apps Script auth | Unauthenticated and unauthorized requests are rejected; authorized administrator can sign in and sign out. |
| PR-02 | One canonical student directory | `00-documentation/01-product-requirements.md`, `00-documentation/04-google-sheets-data-model.md` | Students API, Students UI, Students tab | Create, search, view, edit, and reload a student; changes persist in the master spreadsheet. |
| PR-03 | Stable student identity | `00-documentation/04-google-sheets-data-model.md` | ID generation, repositories, import | Sorting or moving rows does not change IDs; duplicate IDs are rejected. |
| PR-04 | Student profile with linked history | `00-documentation/01-product-requirements.md`, `00-documentation/04-google-sheets-data-model.md` | Student profile, related-record services | Profile shows the correct enrollment, fees, payments, packages, classes, links, and notes for the selected student only. |
| PR-05 | Active and inactive lifecycle | `00-documentation/01-product-requirements.md`, `00-documentation/05-business-rules-and-workflows.md` | Student service and directory filters | Archiving hides the student from default active views without deleting history; reactivation restores active visibility without creating a duplicate. |
| PR-06 | Enrollment history | `00-documentation/04-google-sheets-data-model.md`, `00-documentation/05-business-rules-and-workflows.md` | Enrollment service and profile | A returning student can have a new enrollment while prior enrollment records remain intact. |
| PR-07 | At most one active class package per student | `00-documentation/05-business-rules-and-workflows.md` | Package service, package UI, data validation | Attempting to create or activate a second package for the same student is rejected; historical closed packages remain visible. |
| PR-08 | Fee obligations and due dates | `00-documentation/04-google-sheets-data-model.md`, `00-documentation/05-business-rules-and-workflows.md` | Fee service, fee views | Create an obligation, set a due date, and calculate its outstanding and overdue state correctly. |
| PR-09 | Payment ledger and partial payments | `00-documentation/04-google-sheets-data-model.md`, `00-documentation/05-business-rules-and-workflows.md` | Payment service and payment UI | Multiple valid partial payments produce the correct balance; voiding a payment preserves the original record and audit trail. |
| PR-10 | Class package balance calculation | `00-documentation/04-google-sheets-data-model.md`, `00-documentation/05-business-rules-and-workflows.md` | Package and class services | Balance changes only according to the approved session and adjustment rules; it cannot be manually overwritten as the source of truth. |
| PR-11 | Class scheduling and calendar | `00-documentation/01-product-requirements.md`, `00-documentation/05-business-rules-and-workflows.md`, `01-frontend/03-pages-components-and-interactions.md` | Calendar UI, class-session API | Calendar view is available; sessions display on the correct local date/time and open the correct student/session details. |
| PR-12 | Class completion, cancellation, rescheduling, and attendance | `00-documentation/05-business-rules-and-workflows.md` | Class and attendance services | Each state transition follows the rules; cancelled/rescheduled sessions do not consume a class twice. No-show handling matches the documented policy. |
| PR-13 | Multiple meeting links per student | `00-documentation/04-google-sheets-data-model.md`, `00-documentation/05-business-rules-and-workflows.md` | Meeting-link service and profile | Zoom and Google Meet links can coexist; the selected link opens correctly; inactive links are not offered as valid defaults. |
| PR-14 | Dated internal notes and follow-ups | `00-documentation/04-google-sheets-data-model.md`, `00-documentation/05-business-rules-and-workflows.md` | Notes service and profile | Create, edit, and retrieve notes; notes remain available after student inactivation. |
| PR-15 | Search and operational filters | `01-frontend/03-pages-components-and-interactions.md` | Search service and list views | Search by supported identifiers and names; active, inactive, overdue, upcoming-class, and exhausted-package filters return correct records. |
| PR-16 | Dashboard summary metrics | `01-frontend/03-pages-components-and-interactions.md`, `03-data/03-financial-and-class-balance-calculations.md` | Dashboard and summary API | Metrics match source records and selected date range; unavailable data is not shown as zero. |
| PR-17 | Controlled import from existing Google Sheets | `00-documentation/09-data-import-and-migration.md`, `03-data/05-existing-sheets-import-and-reconciliation.md` | Import service and import UI | Preview, validation, duplicate review, row-level results, and reconciliation work without silent overwrites. |
| PR-18 | Export and backup support | `00-documentation/11-deployment-and-operations.md`, `04-quality-and-operations/04-backup-and-recovery.md` | Export and operations procedures | Exported data is complete for the chosen scope and contains no secrets; a backup can be restored in a tested procedure. |
| PR-19 | Audit trail for important changes | `00-documentation/03-security-and-authentication.md`, `00-documentation/04-google-sheets-data-model.md` | Audit service and mutation workflows | Important changes create accurate audit records; failed writes are not recorded as successful. |
| PR-20 | Consistent validation and error handling | `00-documentation/06-apps-script-api-specification.md`, `02-backend/04-business-services-and-validation.md` | API layer and all backend services | Invalid payloads and invalid relationships are rejected with stable error codes and no partial unintended mutation. |
| PR-21 | Responsive, accessible operational UI | `01-frontend/02-design-system-and-ui-guidelines.md`, `01-frontend/03-pages-components-and-interactions.md` | Frontend pages and components | Core workflows remain usable at agreed desktop, tablet, and mobile sizes; controls have accessible labels and states. |
| PR-22 | Live synchronization with the master Google Sheet | `02-backend/05-google-sheets-access-and-integrity.md`, `00-documentation/02-system-architecture.md` | Repository layer and refresh behavior | A successful dashboard mutation is persisted to Sheets; supported direct sheet edits are reflected after the documented refresh/synchronization interval. Conflicts are handled explicitly. |

## 5. Architecture and Security Traceability

| ID | Constraint | Authoritative specification | Required verification |
|---|---|---|---|
| AR-01 | React frontend is separate from Apps Script backend | `00-documentation/02-system-architecture.md` | Production frontend communicates with the deployed backend using the approved integration. |
| AR-02 | Google Sheets is the canonical datastore | `00-documentation/02-system-architecture.md`, `03-data/01-master-spreadsheet-schema.md` | No second datastore is introduced; persisted records are read through the backend. |
| AR-03 | Frontend never accesses the master spreadsheet directly | `00-documentation/02-system-architecture.md`, `00-documentation/03-security-and-authentication.md` | Repository and network review confirms no privileged spreadsheet access from browser code. |
| AR-04 | Server-side authentication and authorization | `00-documentation/03-security-and-authentication.md`, `02-backend/03-authentication-and-authorization.md` | Anonymous, expired-token, invalid-audience, and unauthorized-account tests fail closed. |
| AR-05 | Validate cross-origin integration before real data | `00-documentation/02-system-architecture.md`, `00-documentation/03-security-and-authentication.md` | A documented proof of concept passes request, response, authentication, redirect, and browser-origin tests. |
| AR-06 | Single-purpose micro-files under 150 lines in `src/` and `public/` | `00-documentation/08-frontend-file-and-code-architecture.md`, `05-agent-handoff/02-coding-agent-rules.md` | Automated or scripted check confirms all applicable files are below 150 lines and no catch-all or monolithic CSS files exist. |
| AR-07 | Stable IDs and validated relationships | `00-documentation/04-google-sheets-data-model.md`, `02-backend/05-google-sheets-access-and-integrity.md` | Referential integrity tests reject missing or mismatched related records. |
| AR-08 | Financial and class balances are derived from records | `00-documentation/05-business-rules-and-workflows.md`, `03-data/03-financial-and-class-balance-calculations.md` | Independent test fixtures verify balances, edge cases, voids, cancellations, and no-shows. |
| AR-09 | Important mutations are auditable | `00-documentation/03-security-and-authentication.md`, `00-documentation/04-google-sheets-data-model.md` | Mutation tests verify audit action, actor, entity, outcome, and relevant change summary. |
| AR-10 | Development and production are isolated | `00-documentation/11-deployment-and-operations.md`, `04-quality-and-operations/03-deployment-and-environment-configuration.md` | Development tests cannot write to production data; secrets are absent from repository and built frontend assets. |
| AR-11 | No student or parent portal in Version 1 | `00-documentation/01-product-requirements.md` | No public-facing student/parent authentication or data endpoint is exposed. |
| AR-12 | Avoid unnecessary infrastructure and dependencies | `00-documentation/02-system-architecture.md`, `05-agent-handoff/02-coding-agent-rules.md` | Dependency and deployment review finds no unapproved database server, backend platform, or service. |

## 6. Data Schema Traceability

| Data area | Canonical schema | Required integrity checks |
|---|---|---|
| Students | `03-data/01-master-spreadsheet-schema.md` | Unique stable ID, required identity fields, valid lifecycle status. |
| Enrollments | `03-data/01-master-spreadsheet-schema.md` | Existing student reference, valid dates and status, historical retention. |
| Packages | `03-data/01-master-spreadsheet-schema.md` | Positive purchased quantity, matching student/enrollment, one active package per student. |
| Fee obligations | `03-data/01-master-spreadsheet-schema.md` | Valid amount, due date, student and optional enrollment/package consistency. |
| Payments | `03-data/01-master-spreadsheet-schema.md` | Positive normal payment, matching student and obligation, duplicate-submission protection, preserved voids. |
| Class sessions | `03-data/01-master-spreadsheet-schema.md` | Valid state transition, matching student/package/enrollment, correct class-credit effect. |
| Meeting links | `03-data/01-master-spreadsheet-schema.md` | Existing student, allowed URL scheme, valid provider/status, preferred-link invariant. |
| Student notes | `03-data/01-master-spreadsheet-schema.md` | Existing student, dated content, appropriate access. |
| Audit log | `03-data/01-master-spreadsheet-schema.md` | Backend-generated records, correct operation outcome, no unnecessary sensitive data. |
| Import batches and results | `03-data/01-master-spreadsheet-schema.md` | Every row result belongs to a batch; totals reconcile with row outcomes. |
| App configuration | `03-data/01-master-spreadsheet-schema.md` | Supported keys and values only; no secrets stored in the sheet. |

## 7. API Traceability

Every API operation listed in `00-documentation/06-apps-script-api-specification.md` must map to:

- A named frontend caller, unless the operation is intentionally administrative-only.
- A backend service responsible for its business rules.
- A persistence operation or an explicitly read-only result.
- Authentication and authorization requirements.
- Request validation and defined error responses.
- At least one success test and one relevant failure test.
- An audit event for important state-changing operations.

The API specification must include an operation inventory. Any operation without a consumer or explicit operational purpose must be reviewed before implementation.

## 8. Frontend Screen Traceability

Every screen defined in `01-frontend/03-pages-components-and-interactions.md` must map to the API operations and data it needs.

At minimum, verify:

- Sign-in and session-expiry behavior.
- Dashboard summary.
- Student directory and filters.
- Student profile and historical sections.
- Enrollment and package management.
- Fees and payment ledger.
- Calendar and class-session details.
- Meeting-link selection and launch.
- Notes and follow-ups.
- Import preview, execution, and reconciliation.
- Export, settings, and operational health where included in Version 1.

Every screen must define loading, empty, error, and successful-mutation states where applicable. A screen must not display hard-coded demonstration values in production.

## 9. Release Gates

The release is blocked until all applicable gates pass:

### Gate A — Architecture
- The frontend/backend integration proof succeeds.
- The approved authentication approach is implemented.
- Development and production are separated.

### Gate B — Data integrity
- Schema validation succeeds.
- IDs and relationships are validated.
- Payment and class-balance calculations pass independent tests.
- Import results reconcile to source rows.

### Gate C — Security
- Anonymous and unauthorized requests are rejected.
- Spreadsheet access remains private.
- Secrets are not present in source control or frontend bundles.
- Error responses do not expose tokens or unnecessary personal data.

### Gate D — Product acceptance
- Core student, payment, package, class, calendar, and meeting-link workflows pass.
- Archiving and reactivation preserve history.
- Backup restoration has been tested.
- No critical or high-severity release-blocking defect remains unresolved.

### Gate E — Documentation and handoff
- Every required requirement is marked `VERIFIED`, or has an explicitly approved `DEFERRED` status.
- All deferred items are listed with their reason and impact.
- The implementation and deployment instructions match the actual code.
- The product owner has reviewed the final acceptance report.

## 10. Traceability Maintenance

The implementation agent must update this document during delivery, not only at the end.

For each requirement, record its current status and point to the relevant test or verification evidence in the implementation's test report. Do not invent test results or mark work as verified based only on code inspection.

If the project uses a separate implementation checklist, this document remains the authoritative mapping between requirements, architecture, and verification. Avoid maintaining a second competing traceability matrix.

## 11. Initial Baseline

At the start of implementation:
- All requirements are `PLANNED`.
- No test is considered passed without recorded evidence.
- No production data is used before the security release gate.
- Any unresolved architecture conflict is recorded as `BLOCKED` and referred to the product owner.

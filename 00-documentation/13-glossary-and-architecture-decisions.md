# 13 — Glossary and Architecture Decisions

## 1. Document Control

- Project: Student Management Dashboard
- Document ID: 13
- Version: 1.0
- Status: Architecture baseline
- Audience: Product owner, developers, implementation agents, reviewers
- Depends on: Documents 00–12
- Scope: Shared terminology, confirmed architecture decisions, constraints, and unresolved decisions

This document prevents different implementation agents from interpreting the same product terms differently. It records decisions already established by the product requirements and architecture. It does not authorize an agent to change decisions unilaterally.

## 2. Glossary

### Administrator
The single authorized person who uses the dashboard to manage student, enrollment, fee, package, class, meeting-link, and historical records.

### API
The defined interface through which the frontend requests data or actions from the Apps Script backend. Protected API operations require server-side authentication and authorization.

### Archive / Inactive Student
A student whose current relationship with the administrator has ended or paused indefinitely. Inactivation removes the student from default active workflows but does not delete the student or related history.

### Audit Log
An append-oriented record of important operations, including who performed an action, when it occurred, which record was affected, and whether the operation succeeded.

### Authentication
Verification of the identity of the person making a request. Authentication alone does not establish permission to access this application.

### Authorization
The server-side decision about whether an authenticated identity may perform a requested operation. Version 1 permits only the explicitly configured administrator.

### Backend
The Google Apps Script application that validates requests, enforces business rules, authorizes operations, and reads or writes the master Google Spreadsheet.

### Class Balance / Remaining Classes
The number of purchased class credits that remain available under a package after applying completed sessions and explicitly supported, auditable adjustments. It is calculated from records, not treated as an independently editable source of truth.

### Class Session
A scheduled or historical teaching event. A session may be scheduled, completed, cancelled, rescheduled, or marked as a no-show according to the supported workflow.

### Canonical Record
The authoritative record for an entity in the master spreadsheet. Other sheets, imports, caches, and frontend state must not become competing sources of truth.

### Enrollment
A student's participation period or commercial arrangement. A returning student may have more than one enrollment over time.

### Fee Obligation
A specific amount owed by a student, such as an agreed fee or installment. It is separate from the payments made toward it.

### Frontend
The React, TypeScript, and Vite website hosted separately from Apps Script. It renders the user interface and calls the backend API; it does not access the master spreadsheet directly.

### Google Apps Script (GAS)
Google's scripting platform used as the backend runtime and API layer for Version 1.

### Google Meet / Zoom Link
A stored meeting URL associated with a student and, where appropriate, a class session. A student may have multiple links; obsolete links are deactivated rather than silently erased.

### Historical Record
A record retained to explain past activity, including former enrollments, packages, payments, classes, attendance, meeting links, and notes. Historical records are not automatically deleted when a student becomes inactive.

### Idempotency
A property of an operation that prevents a repeated submission of the same logical request from creating duplicate effects, such as recording the same payment twice.

### Import Batch
A tracked attempt to import data from a source spreadsheet or tab. A batch has an overall status and row-level results for reconciliation.

### Master Spreadsheet
The private Google Spreadsheet containing the canonical application tabs defined in Document 04. It is the persistence layer for Version 1.

### Micro-file
A source file with one clear responsibility. Every domain in `src/` and `public/` must be organized as directories of single-purpose micro-files. No source file may reach 150 lines; the hard maximum is 149 lines.

### Package
A purchased allocation of classes associated with a student and, when applicable, an enrollment. Package price and purchased class quantity are distinct from payments and class sessions.

### Payment
A financial transaction recorded against a fee obligation, with a date, amount, method, and status. A correction must preserve an audit trail.

### Student ID
The immutable, unique identifier for a student. It must not be derived from the student's name, phone number, email address, or spreadsheet row number.

### Source Reference
Information identifying where an imported record originated. A source reference supports reconciliation but does not replace the canonical application ID.

### Soft Archive
Changing a record's lifecycle status while preserving the record and its relationships. Normal UI operations must not hard-delete students or their financial/class history.

### Vercel
The intended hosting platform for the separate frontend. Deployment eligibility and current plan terms must be checked before production use.

### Version 1 (V1)
The initial single-administrator student management product defined by this documentation set. Features outside the agreed scope require an explicit decision before implementation.

## 3. Confirmed Architecture Decisions

### ADR-001: Separate Frontend and Backend

**Decision:** Build a separate React + TypeScript + Vite frontend and use Google Apps Script as the backend.

**Reason:** The administrator wants a dedicated dashboard website while keeping backend infrastructure simple.

**Consequences:** The frontend and backend communicate through a defined API. Cross-origin behavior and secure authentication must be proven before real student data is used.

### ADR-002: Google Sheets as the Canonical Datastore

**Decision:** Use one private master Google Spreadsheet with explicitly defined tabs and schemas.

**Reason:** Existing records already live in Google Sheets, and the expected workload does not justify introducing a separate database server at this stage.

**Consequences:** The backend must centralize spreadsheet access, validate schemas, batch reads/writes where practical, and account for the lack of full relational transactions.

### ADR-003: No Supabase or Separate Database in V1

**Decision:** Do not introduce Supabase or another database service in the initial architecture.

**Reason:** Avoid unnecessary setup and operational complexity for the current scale.

**Consequences:** The system must be tested against realistic data volume and Apps Script/Sheets quotas. If the workload outgrows these constraints, migration requires a documented architecture decision rather than an improvised parallel datastore.

### ADR-004: Single Administrator

**Decision:** Version 1 supports one explicitly authorized administrator.

**Reason:** The immediate need is personal operational management, not a multi-user SaaS platform.

**Consequences:** Do not build role hierarchies, staff permissions, parent accounts, or student accounts in V1. Every protected backend operation still requires authorization.

### ADR-005: Backend Owns Business Rules

**Decision:** All authoritative validation, permission checks, financial calculations, class-balance calculations, and persistence operations run on the backend.

**Reason:** Frontend checks can be bypassed and must not be treated as security or data-integrity controls.

**Consequences:** Frontend calculations may be used for previews, but persisted results must be validated and derived server-side.

### ADR-006: Stable IDs and Related Tables

**Decision:** Use stable generated IDs and separate tabs for students, enrollments, packages, fee obligations, payments, class sessions, meeting links, notes, audit events, and imports.

**Reason:** Names and row numbers are not reliable keys; separating entities preserves history and prevents duplicated data.

**Consequences:** The backend must validate every relationship and avoid relying on row position or display names.

### ADR-007: Preserve History

**Decision:** Archive inactive students rather than deleting them. Preserve related financial and class history.

**Reason:** Students may return, and historical payment/class records remain useful.

**Consequences:** Active views filter by status; historical views remain searchable. Reactivation uses the existing student identity where appropriate.

### ADR-008: Payments Are Transactions

**Decision:** Record payments as separate ledger entries linked to fee obligations. Corrections and voids must be auditable.

**Reason:** A manually edited paid-total field cannot reliably explain payment history or partial payments.

**Consequences:** Balances are calculated from valid records. Unallocated advances, refunds, and complex credit handling must not be implied unless their rules are explicitly implemented.

### ADR-009: Class Balances Are Derived

**Decision:** Calculate remaining class credits from package allocations, completed sessions, and explicitly supported adjustments.

**Reason:** Manually maintaining both session history and a remaining-class number creates contradictions.

**Consequences:** The backend must define which session outcomes consume a credit and prevent duplicate consumption when a session is edited or rescheduled.

### ADR-010: Meeting Links Are Separate Records

**Decision:** Store meeting links in their own tab and optionally reference a link from a class session.

**Reason:** A student may use both Zoom and Google Meet, or change links over time.

**Consequences:** Link provider, status, preferred status, validity dates, and URL validation must be handled explicitly.

### ADR-011: Small Single-Purpose Source Files

**Decision:** Every domain in `src/` and `public/` must be a directory of single-purpose micro-files under 150 lines. The maximum is 149 lines per file.

**Reason:** The project will be implemented by coding agents, and small responsibilities make changes easier to review, test, and maintain.

**Consequences:** No catch-all files such as `actions.js` or `app.js`, and no monolithic CSS. Do not evade the limit through compressed one-line code. Split by responsibility and keep file names descriptive.

### ADR-012: GitHub as Source Control

**Decision:** Source code and documentation should be version-controlled in GitHub, with changes made in reviewable commits.

**Reason:** The product needs traceable changes and a repeatable handoff to coding agents.

**Consequences:** Secrets, tokens, private student data, and live spreadsheet exports must not be committed. A local commit is not the same as a remote push.

### ADR-013: Vercel Frontend Hosting

**Decision:** Vercel is the intended frontend hosting platform, subject to current plan terms and project eligibility.

**Reason:** It provides a straightforward deployment workflow for a static React/Vite frontend.

**Consequences:** Verify whether the selected plan permits the intended business use before production deployment. Preview and production configurations must be separated.

### ADR-014: Security Integration Proof Before Real Data

**Decision:** Prove the complete browser-to-Apps-Script request, authentication, response-reading, and error-handling flow before importing real student data.

**Reason:** Separate origins, redirects, token transport, and browser security rules can affect the integration.

**Consequences:** Do not work around integration failures by making the spreadsheet public, embedding privileged credentials, disabling browser protections, or exposing private records through JSONP. If the secure flow cannot be established, stop and revise the architecture explicitly.

### ADR-015: Controlled Data Migration

**Decision:** Import existing spreadsheets through validation, preview, duplicate review, and row-level reconciliation.

**Reason:** Source sheets may differ slightly, and silent overwrites or partial imports could corrupt records.

**Consequences:** Normalize source headers, retain source references, report failures, and make repeated imports safe. Do not automatically merge ambiguous student identities.

## 4. Implementation Constraints

The implementation agent must follow these rules:

1. Treat Documents 00–12 as the detailed product and technical specifications.
2. Use this document for shared terminology and confirmed decisions.
3. Do not add infrastructure without a documented need and explicit approval.
4. Do not create a public endpoint for private student or financial data.
5. Do not expose the master spreadsheet to the browser.
6. Do not hard-delete historical records through normal application workflows.
7. Do not silently change schemas, status enums, financial rules, or API contracts.
8. Do not introduce mock data into production records.
9. Keep all source files within the 149-line maximum.
10. Update affected documentation and tests when an approved decision changes.

## 5. Decisions That Must Be Verified Before Production

These are validation gates, not permission to guess:

- The supported secure authentication and browser-to-Apps-Script integration flow.
- The exact Google identity verification mechanism and token audience.
- Whether the selected Vercel plan permits the intended business use.
- Apps Script quotas and performance under realistic data volume.
- The operational policy for no-shows, late cancellations, refunds, and fee overpayments.
- The backup frequency, retention period, and successful restore procedure.

Any decision affecting product behavior must be documented in the relevant authoritative document and reflected in tests.

## 6. Change Procedure

When a confirmed architecture decision needs to change:

1. Identify the decision ID and reason for reconsideration.
2. Describe the proposed alternative and its trade-offs.
3. Identify affected documents, schemas, API operations, and tests.
4. Obtain explicit product-owner approval.
5. Update this decision record and all affected authoritative documents.
6. Implement only after the documentation is consistent.
7. Verify the change through the acceptance criteria.

Do not silently replace a decision because a different implementation seems easier.

## 7. Definition of Completion

This document is complete when:
- Shared terms have one consistent meaning.
- Confirmed architecture decisions are recorded with rationale and consequences.
- The implementation constraints are explicit.
- Production validation gates are visible.
- No decision grants permission to bypass the security or file-size rules.

# 01 — Product Requirements

## 1. Document Control

- **Product:** Student Management Dashboard
- **Document ID:** 01
- **Status:** Approved for implementation
- **Version:** 1.0.0
- **Audience:** Product owner, developers, implementation agents, reviewers
- **Predecessor:** `00-document-index.md`
- **Related documents:** `02-system-architecture.md`, `03-security-and-authentication.md`, `04-google-sheets-data-model.md`, `05-business-rules-and-workflows.md`, `06-apps-script-api-specification.md`, `07-frontend-product-and-ui-specification.md`, `09-data-import-and-migration.md`, `10-testing-and-acceptance-criteria.md`, `13-glossary-and-architecture-decisions.md`

## 2. Purpose

This document defines what the Student Management Dashboard must do and what Version 1 will not do. It establishes product scope and testable requirements before implementation begins.

The dashboard consolidates student information currently maintained across multiple Google Sheets. It provides one private interface for student profiles, enrollments, fees, payments, class packages, class schedules, attendance, meeting links, notes, and historical records.

This is a requirements document, not an implementation plan. The detailed data schema, API contract, screen specifications, and deployment steps belong in their respective documents.

## 3. Product Summary

The product is a private, admin-only web application.

- **Frontend:** React, TypeScript, and Vite.
- **Backend:** Google Apps Script Web App.
- **Canonical datastore:** One structured master Google Spreadsheet.
- **Frontend hosting:** Vercel, subject to current plan terms and eligibility.
- **Source control:** GitHub.
- **Initial user model:** One authorized administrator.
- **Authentication:** Server-side HMAC-SHA256 signed session tokens via Apps Script Script Properties (Zero GCP / Google Cloud Console setup required).
- **Initial deployment model:** One production instance for the administrator's student-management operation.

The frontend must not read or write the master spreadsheet directly. All application data operations must pass through the backend.

## 4. Problem Statement

The administrator currently maintains separate Google Sheets for different students or groups of students. The sheets mostly follow similar structures, but may contain differences. This leads to fragmented information, repeated manual updates, difficulty finding the correct meeting link, uncertainty about outstanding fees or remaining classes, and avoidable risk of inconsistent records.

The product must reduce this administrative overhead without creating an unnecessarily complex system or losing historical information.

## 5. Goals

- **G-01 — Consolidation:** Maintain one canonical dataset rather than requiring routine updates across multiple student sheets.
- **G-02 — Fast retrieval:** Find a student and their operational details quickly from one interface.
- **G-03 — Financial clarity:** See fee obligations, payment history, paid amounts, outstanding balances, and due dates.
- **G-04 — Class clarity:** Track purchased class quantities, scheduled sessions, completed sessions, cancellations, attendance, and remaining package balances.
- **G-05 — Meeting access:** Store and distinguish multiple meeting links for a student, including Zoom and Google Meet.
- **G-06 — Historical continuity:** Retain inactive students and their historical records, and allow them to return without creating a duplicate identity.
- **G-07 — Controlled migration:** Import existing Google Sheets through preview, validation, duplicate review, and reconciliation.
- **G-08 — Lower manual effort:** Calculate derived values from persisted records rather than requiring repeated manual totals.
- **G-09 — Privacy:** Restrict all student and financial data to the authorized administrator.
- **G-10 — Operational simplicity:** Use Google Sheets and Apps Script without a separate database service in Version 1.
- **G-11 — Traceability:** Preserve an audit trail for financially or operationally significant changes.
- **G-12 — Maintainability:** Keep implementation modular and small enough for a coding agent or developer to understand and change safely.

## 6. Non-Goals for Version 1

The following are explicitly out of scope unless the product owner approves a documented change:

- Parent or student accounts and portals.
- Multiple administrators, staff accounts, or a role hierarchy.
- Multi-tenant or SaaS functionality.
- Payment-gateway integration or automatic collection of payments.
- Automatic creation of Zoom or Google Meet meetings.
- Automatic recurring billing or invoices sent to parents.
- Automated WhatsApp messages, SMS, or email campaigns.
- A native iOS or Android application.
- A separate SQL or NoSQL database.
- AI chat, predictive analytics, or recommendation features.
- Full accounting, tax filing, or statutory compliance software.
- Direct access to the master spreadsheet from the browser.
- Automatic destructive cleanup of old source spreadsheets.
- Automatic migration that silently overwrites canonical records.

A future need does not justify implementing it in Version 1 without an approved requirement.

## 7. Users and Permissions

### 7.1 Administrator

The only supported application user in Version 1 is the authorized administrator.

The administrator can, subject to server-side authorization:

- View and search student records.
- Create and update student profiles.
- Create and manage enrollments and packages.
- Record payments and review fee obligations.
- Schedule, reschedule, cancel, and complete class sessions.
- Record attendance and relevant notes.
- Create, update, prefer, and deactivate meeting links.
- Archive and reactivate students.
- Import and reconcile legacy data.
- View operational summaries and reports.
- Export authorized records.
- View relevant audit history.
- Change supported application settings.

### 7.2 Parents, Students, and Other People

Parents and students do not sign in to the dashboard in Version 1. The dashboard must not expose records to them through public URLs, unauthenticated API calls, or frontend-only route protection.

A future portal would require a separate access-control design and is not implied by this document.

## 8. Functional Requirements

### FR-01 — Secure Sign-In and Sign-Out

The administrator must sign in through the approved identity flow. The backend must verify identity and authorization for every protected request. The interface must support sign-out and handle expired or invalid authentication state.

**Acceptance:** An unauthenticated or unauthorized request cannot retrieve or modify protected data, regardless of frontend behavior.

### FR-02 — Dashboard Overview

The landing page must provide a useful summary of current operations, including:

- Active student count.
- Upcoming classes for a selected period.
- Fee obligations that are due or overdue.
- Recent payments.
- Packages with low or zero remaining class balances.
- Recent relevant changes, where available.

Metrics must be derived from persisted records and defined business rules. The UI must distinguish a true zero from a failed or unavailable calculation. The dashboard must not display fabricated placeholder data as real data.

**Acceptance:** Each displayed metric can be traced to the underlying records and has a documented calculation.

### FR-03 — Student Directory

The administrator must be able to view and search students. The default view should prioritize active students and routine operational needs.

The directory should display, where available:

- Student ID and name.
- Lifecycle status.
- Parent or guardian name and primary contact.
- Current enrollment or package summary.
- Next scheduled class.
- Outstanding fee balance.

Filters must include active/inactive status and useful operational conditions such as overdue fees, upcoming classes, and exhausted packages.

**Acceptance:** Search and filters do not mutate records and can include historical students when explicitly requested.

### FR-04 — Student Profile

Each student must have a stable, unique identifier that does not depend on the student's name, phone number, or spreadsheet row.

The profile must bring together:

- Basic student details.
- Parent or guardian contact information.
- Lifecycle status.
- Current and historical enrollments.
- Packages and class balances.
- Fee obligations and payment history.
- Scheduled and historical class sessions.
- Attendance.
- Active and inactive meeting links.
- Internal notes and follow-ups.
- Creation and last-update information.

**Acceptance:** An administrator can understand a student's current operational state without opening several legacy spreadsheets.

### FR-05 — Enrollment History

A student may have more than one enrollment over time. The application must retain prior enrollments and associate each enrollment with the appropriate packages, fee obligations, and class sessions.

A returning student should normally be reactivated under the existing student identity and receive a new enrollment when that reflects the actual arrangement.

**Acceptance:** Starting a new enrollment does not overwrite or erase the previous enrollment's history.

### FR-06 — Fee Obligations

The application must support one or more fee obligations per student, including installments where applicable.

The administrator must be able to record the amount due, issue date, due date, relevant enrollment or package, description, and notes. The system must show the paid and outstanding amounts based on valid payment records.

The UI must distinguish at least:

- Open/unpaid.
- Partially paid.
- Paid.
- Overdue.
- Voided.

Overdue status is derived from the due date and outstanding balance; it must not be maintained as an unrelated manually editable value.

**Acceptance:** Fee status and outstanding balance are recalculated from persisted obligations and valid allocated payments.

### FR-07 — Payment Ledger

Each payment must be recorded as a separate transaction with its date, amount, currency, method, relevant obligation where applicable, reference, and notes.

The application must support partial payments and must define how overpayments or unallocated advances are handled before implementation. Version 1 must not silently invent a credit balance when no credit model has been specified.

Financial corrections must preserve an audit trail. Normal operations must not silently delete a payment or rewrite the history of a settled obligation.

**Acceptance:** Recording a payment updates the derived balance correctly, and correcting a payment leaves a traceable record of the correction.

### FR-08 — Class Packages

The application must represent purchased class allocations as packages. A package may include a purchased class quantity, price, purchase date, applicable start or expiry dates, status, and enrollment association.

The remaining class balance must be calculated from the package allocation, qualifying session outcomes, and explicitly supported adjustments. It must not depend solely on a manually edited remaining-class field.

**Acceptance:** The balance can be reproduced from persisted package and session records.

### FR-09 — Class Scheduling and Session Outcomes

The administrator must be able to create a scheduled session, associate it with a student and applicable enrollment/package, set the start and end time, choose a meeting link, and later record the outcome.

The application must support scheduling, completion, cancellation, rescheduling, and no-show outcomes. Attendance must be represented separately where that distinction is meaningful.

A cancelled or rescheduled session must not accidentally consume a class. The policy for no-shows, late cancellations, and excused absences must be finalized in the business-rules document before implementation.

**Acceptance:** Each session outcome affects package balance only according to the documented business rule.

### FR-10 — Meeting Links

A student may have multiple meeting links, including Zoom and Google Meet, for different purposes or periods.

The administrator must be able to add, edit, label, prefer, deactivate, and open links. A class session may reference the link intended for that session. The interface must clearly identify the provider and must not present inactive or expired links as valid defaults.

The system must validate URL schemes and handle unrecognized providers safely.

**Acceptance:** The administrator can distinguish and open the correct active link without overwriting another provider's link.

### FR-11 — Student Lifecycle and Archiving

Version 1 supports active and inactive student states.

Archiving/inactivation must remove a student from default active operational views without deleting their profile or related records. Historical search must remain available. Reactivation must preserve the same student ID.

**Acceptance:** An archived student's payments, enrollments, sessions, notes, and links remain accessible to the administrator, and reactivation does not create a duplicate identity.

### FR-12 — Notes and Follow-Ups

The administrator must be able to create dated internal notes associated with a student, with a category and optional follow-up date/status.

Notes must not substitute for structured financial or class records. Editing notes must be auditable where required by the security and audit design.

**Acceptance:** Notes remain available in the student's history after the student becomes inactive.

### FR-13 — Import and Migration

The system must provide a controlled process to bring records from existing Google Sheets into the canonical spreadsheet.

The process must support:

- Source inventory and column mapping.
- Preview before committing changes.
- Required-field and type validation.
- Normalization of equivalent headers.
- Duplicate candidate detection.
- Row-level success, skip, and failure results.
- Source-to-target reconciliation.
- A summary of imported, skipped, duplicate-review, and failed rows.

The import must not silently overwrite an existing canonical student or financial record. Ambiguous matches must be presented for review rather than guessed.

**Acceptance:** Every source row receives a traceable outcome, and the final import report reconciles with the attempted row count.

### FR-14 — Search and Navigation

The main interface must provide navigation to the dashboard, students, fees/payments, packages, classes/schedule, imports, reports, and settings as applicable to Version 1.

Student search should be easy to reach from the main interface. Related records should link back to their associated student profile.

**Acceptance:** Routine tasks can be completed within the dashboard without opening a spreadsheet.

### FR-15 — Reports and Export

The administrator must be able to review relevant operational lists, including due/overdue obligations, payment history, upcoming classes, and package balances.

Authorized records must be exportable for operational use and backup/reconciliation. Exported values must preserve dates, IDs, and monetary precision. Exports must not contain authentication tokens, secrets, or unrelated personal data.

**Acceptance:** An export can be reconciled to the selected source records and does not disclose secrets.

### FR-16 — Audit History

Important changes must produce audit entries, including student lifecycle changes, payment creation/correction/voiding, fee changes, package changes, session changes, meeting-link changes, imports, and exports where appropriate.

Audit records must identify the actor, timestamp, action, affected entity, outcome, and a safe change summary. Sensitive information must not be copied unnecessarily.

**Acceptance:** A reviewer can determine what important change occurred and whether the operation succeeded.

### FR-17 — Data and Application Errors

The interface must show clear loading, empty, success, and failure states. It must not claim that a change succeeded until the backend confirms persistence. Failed or ambiguous writes must be surfaced and must not be silently retried in a way that creates duplicate payments or sessions.

**Acceptance:** Simulated API failures do not produce false success messages or corrupt displayed state.

## 9. Data Integrity Requirements

- **DI-01:** Student IDs and entity IDs are stable and unique.
- **DI-02:** Relationships use IDs, not names alone.
- **DI-03:** The backend validates all writes independently of frontend validation.
- **DI-04:** Financial amounts use a consistent currency and precision.
- **DI-05:** Payments cannot be allocated to another student's fee obligation.
- **DI-06:** Derived financial and class balances are calculated from source records.
- **DI-07:** Historical records are not hard-deleted by ordinary lifecycle actions.
- **DI-08:** Duplicate import attempts are detected or safely rejected.
- **DI-09:** Important mutations have a defined audit and recovery behavior.
- **DI-10:** Schema mismatches are reported rather than silently ignored.
- **DI-11:** A failed operation is never reported as successfully persisted.
- **DI-12:** Concurrent updates to important records use documented safeguards.

## 10. Privacy and Security Requirements

- Only the explicitly authorized administrator may use the application.
- The master spreadsheet must remain private.
- The browser must not contain privileged Google credentials.
- The backend must verify identity and authorization for every protected operation.
- Student or parent information must not be sent to third-party analytics.
- Logs and error messages must avoid unnecessary personal or financial data.
- Meeting links must be treated as potentially sensitive.
- Development/test data must not be silently substituted for production data.
- Real student data must not be imported before the security release gate passes.
- Authentication and cross-origin behavior must be validated for the selected frontend/backend integration.

Detailed controls are defined in `03-security-and-authentication.md`.

## 11. Usability and Accessibility Requirements

- Responsive layout for desktop, tablet, and mobile.
- Desktop-first efficiency for frequent administration.
- Clear distinction between active and historical students.
- Forms with field-level validation and understandable error messages.
- Confirmation for financially significant or irreversible-looking actions.
- Accessible labels, focus states, and keyboard navigation where practical.
- Clear display of currency, due dates, and remaining class balances.
- No routine dependence on direct spreadsheet editing.
- Meeting-link actions must clearly identify the selected provider.

## 12. Reliability and Performance Requirements

The application must:

- Handle unavailable or malformed API responses safely.
- Avoid duplicate mutations caused by repeated submissions where practical.
- Refresh relevant views after a successful mutation.
- Report partial import failures.
- Avoid loading all historical data when a smaller result set is sufficient.
- Use batched spreadsheet access where practical.
- Include backup and restoration instructions.
- Be tested with realistic student, payment, and class-history volumes.

Exact response-time targets and expected maximum data volumes must be recorded in the testing document after an initial performance baseline. They must not be invented without testing.

## 13. Architecture and Code Constraints

The following constraints are mandatory:

- React + TypeScript + Vite frontend.
- Google Apps Script backend.
- Google Sheets as the canonical datastore.
- No separate database server in Version 1.
- All protected data access goes through the backend.
- No implementation begins before the architecture documents are reviewed.
- Every domain in `src/` and `public/` must be a directory of single-purpose micro-files.
- Every source file must remain under 150 lines.
- No catch-all files such as `actions.js` or `app.js`.
- No monolithic CSS files.
- Business logic must not be embedded in presentation components.
- Files must be split by responsibility rather than compressed into unreadable one-liners.

The exact directory tree and file responsibilities are defined in `08-frontend-file-and-code-architecture.md`.

## 14. Operational Constraints and Known Trade-Offs

Google Sheets and Apps Script keep infrastructure light but are not a full relational database. The implementation must account for quotas, execution limits, concurrent writes, and the absence of general multi-table transactions.

The separate Vercel frontend and Apps Script backend must pass an integration proof covering browser origin behavior, authentication transport, redirects, response parsing, and error handling. If a secure supported request flow cannot be established, implementation must pause for an explicit architecture decision. Security must not be weakened to preserve the original stack.

Vercel plan eligibility and terms must be checked at deployment time. The architecture must not assume that a free hosting tier permits every intended business use.

## 15. Release Acceptance Checklist

Version 1 is ready for release only when all applicable tests pass and the administrator can:

1. Sign in and sign out securely.
2. Create, search, view, and update a student.
3. Create and review enrollment history.
4. Create fee obligations and record full or partial payments.
5. Verify paid and outstanding amounts.
6. Create a package and verify its class balance.
7. Schedule, reschedule, cancel, and complete sessions.
8. Record attendance and verify the documented balance behavior.
9. Store and open multiple meeting links for one student.
10. Archive and reactivate a student without losing history.
11. Import legacy sheets and reconcile all source-row outcomes.
12. Review operational lists and export authorized records.
13. Trace important changes through audit history.
14. Recover safely from documented API and import failures.
15. Use the dashboard without routine direct edits to the master spreadsheet.

The detailed pass/fail criteria belong in `10-testing-and-acceptance-criteria.md`.

## 16. Open Decisions That Must Be Resolved Before Implementation

The following are product-policy decisions, not details for a coding agent to guess:

- Whether no-shows consume a class.
- Whether late cancellations consume a class.
- Whether excused absences consume a class.
- Whether fee overpayments are rejected or tracked as student credit.
- Whether unallocated advance payments are supported in Version 1.
- How refunds and payment reversals are represented.
- Whether packages can be paused, extended, transferred, or adjusted.
- Whether a student may have multiple simultaneous active enrollments.
- Whether fee obligations can be edited after payments have been allocated.
- Which exact Google identity and token-verification flow will work with the selected Apps Script deployment.
- Backup frequency and retention period.

Each decision must be recorded in the relevant business, security, data, or operations document before the dependent functionality is implemented.

## 17. Change Control

A change to this document must state:

- Requirement ID or section changed.
- Reason for the change.
- Other documents affected.
- Data schema, API, UI, and test impacts.
- Whether the change is approved or still proposed.

Implementation agents must not silently broaden product scope or replace an architecture decision.

## 18. Definition of Done for This Document

This document is ready for architecture review when the product scope, goals, non-goals, functional requirements, data integrity expectations, security expectations, constraints, release checklist, and open decisions are understood.

Approval of this document does not by itself authorize implementation. The complete architecture and its dependent documents must also be reviewed.

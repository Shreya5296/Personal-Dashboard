# 01 — Frontend Requirements

## 1. Document Purpose

Define the functional, behavioral, accessibility, and technical requirements for the Student Management Dashboard frontend.

This document is authoritative for frontend requirements. The UI specification, component inventory, state/data-flow document, and source-code architecture must implement these requirements without changing the product scope or backend contracts.

## 2. Product Context

The application is a private, single-administrator dashboard for managing online students and classes. The administrator currently maintains multiple Google Sheets and needs one interface for daily operations.

The frontend is a separate website built with React, TypeScript, and Vite. It communicates with a Google Apps Script backend. Google Sheets remains the canonical datastore and must never be accessed directly by browser code.

## 3. Version 1 Scope

The frontend must support:

- Administrator sign-in and sign-out.
- Dashboard overview and operational alerts.
- Student search, filtering, creation, editing, archiving, and reactivation.
- Student profiles with current and historical related records.
- Enrollment management.
- Class package management and remaining-class visibility.
- Fee obligations and payment recording/history.
- Class scheduling, rescheduling, cancellation, completion, and attendance.
- Multiple meeting links per student, including Zoom and Google Meet.
- Student notes and follow-up records.
- Controlled data import with preview and row-level results.
- Relevant reports and authorized exports.
- Application settings and backend health/error feedback where authorized.

The frontend must not implement student or parent accounts in Version 1.

## 4. Out of Scope

Do not add the following unless a later approved requirement changes the scope:

- Parent or student portals.
- Multi-tenant organization support.
- Staff roles and permission administration.
- Payment gateway integration.
- Automated recurring billing or payment collection.
- Automated Zoom or Google Meet meeting creation.
- WhatsApp or email campaign automation.
- Native mobile applications.
- Offline-first editing or background synchronization.
- A frontend-managed copy of the master database.

## 5. Supported Environment

- Current stable desktop versions of Chrome, Edge, Firefox, and Safari should be supported where practical.
- The layout must remain usable on tablet and mobile screens.
- Desktop is the primary environment because administrative work includes tables, financial records, and scheduling.
- The frontend must use HTTPS in production.
- The frontend must not require browser extensions or local installation.

Exact browser support is confirmed during implementation testing; unsupported legacy browsers need not be accommodated.

## 6. Application Shell and Navigation

The authenticated application must provide consistent navigation to:

- Dashboard
- Students
- Classes and schedule
- Fees and payments
- Packages
- Imports
- Reports
- Settings

Related records should link to their parent student profile where practical. Navigation must preserve useful filter context when returning from a detail page, where this can be done without unnecessary complexity.

The application shell must include:

- Product title or wordmark.
- Primary navigation.
- Current administrator identity in a restrained account area.
- Sign-out action.
- Main content region with a clear page title.
- Consistent loading and error presentation.

Do not create duplicate navigation systems for individual modules.

## 7. Authentication Experience

The frontend must:

- Present a clear sign-in screen for the approved Google identity flow.
- Show a useful explanation when access is denied.
- Keep protected application routes unavailable until authentication state is resolved.
- Send required identity material through the documented backend integration.
- Handle expired, invalid, or revoked authentication material.
- Provide a sign-out action that clears frontend session state.
- Avoid persisting privileged credentials in localStorage.
- Never treat a frontend-only `isAdmin` flag as authorization.

The backend remains responsible for verifying identity and authorization on every protected operation. A hidden route or disabled button is not a security control.

The exact sign-in and token transport mechanism must match the approved security design and must pass the cross-origin integration proof before real student data is used.

## 8. Dashboard Overview

The dashboard must present a concise operational summary based on backend data:

- Active student count.
- Upcoming classes for a useful selected period.
- Fee obligations due or overdue.
- Recent payments.
- Packages with zero remaining classes or approaching expiry, when expiry is configured.
- Recent operational activity where available.

Each metric must have a clear label and a meaningful empty state. Clicking a metric should open the corresponding filtered view when useful.

Do not calculate authoritative financial totals or class balances independently in the browser. The backend is the source of truth. The frontend may format returned values for display.

Avoid decorative charts that do not help the administrator take action. Any report or metric must have a defined meaning and a traceable source.

## 9. Student Directory

The student directory must support:

- Search by student name and stable student ID.
- Search by supported parent contact fields where appropriate.
- Filtering by Active and Inactive status.
- Filtering for overdue fees, upcoming classes, and exhausted packages when those filters are supported by backend queries.
- Sorting by useful fields such as name, status, and next class.
- Opening a student profile.
- Creating a student.
- Editing permitted student details.
- Archiving an active student.
- Reactivating an inactive student.

The default view should show active students. Historical students remain searchable through an explicit filter or view.

The list must not expose unnecessary sensitive details. Display columns should prioritize operational usefulness rather than reproducing every spreadsheet column.

Search and filter state must be clearly visible. An empty result must be distinguishable from a failed request.

## 10. Student Profile

The student profile is the primary consolidated workspace for one student. It must clearly display identity and lifecycle status and provide access to:

- Contact information.
- Current and historical enrollments.
- Packages and class balances.
- Fee obligations, paid amounts, and outstanding amounts.
- Payment history.
- Upcoming and historical class sessions.
- Attendance and session notes.
- Active and inactive meeting links.
- Internal student notes and follow-ups.

Use sections, tabs, or clearly separated panels as appropriate. Do not put all data into one oversized form.

Financial and class summaries must distinguish current records from historical records. The interface must not imply that an archived student's old enrollment is currently active.

The profile must make the most common actions easy to find, including recording a payment, scheduling a class, opening a meeting link, adding a note, and editing contact details.

## 11. Enrollment and Package Interfaces

Enrollment forms must capture only fields defined in the canonical data model. The frontend must make the student relationship explicit and display status and relevant dates.

Package interfaces must show:

- Package name.
- Purchased class quantity.
- Completed or consumed class quantity where returned by the backend.
- Remaining classes.
- Purchase/start/expiry dates where applicable.
- Package status.
- Associated enrollment.

The remaining-class value is read-only in normal use. The frontend must not provide an ordinary editable field for overriding a calculated balance.

If an adjustment workflow is supported, it must be a distinct, auditable action with a reason and confirmation. If that workflow is not part of the approved backend contract, the frontend must not invent it.

## 12. Fees and Payments

The frontend must provide views for fee obligations and payment history.

Fee obligation details must distinguish:

- Amount due.
- Amount paid.
- Outstanding amount.
- Issue date and due date.
- Open, partially paid, paid, or void status.
- Associated student and enrollment/package where applicable.

The payment form must collect the fields required by the API, including amount, payment date, payment method, and applicable fee obligation. Optional transaction reference and notes should be supported where defined by the contract.

The interface must:

- Validate obvious input errors before submission.
- Display backend validation errors next to relevant fields when possible.
- Require confirmation for voiding or correcting a financial record.
- Explain that a correction is an auditable action.
- Prevent accidental repeated submission while a request is in progress.
- Refresh affected balances after a successful write.
- Never show an optimistic balance as saved before backend confirmation.

A failed payment submission must leave the user able to review and correct the form without creating a false success message.

## 13. Classes, Scheduling, and Attendance

The class interface must provide a schedule/list view and a way to open an individual session.

Class records must display, as available:

- Student.
- Scheduled start and end time.
- Session status.
- Attendance status.
- Related package or enrollment.
- Selected meeting link.

The administrator must be able to schedule a session, reschedule it, cancel it, mark it completed, and record attendance using supported backend operations.

The interface must make state transitions explicit. A cancelled or rescheduled session must not be displayed as completed. A session must not be marked completed merely because its meeting link was opened.

Time inputs must be interpreted and displayed consistently in Asia/Kolkata time. The UI must clearly label the time zone where ambiguity is possible.

Before a state-changing action, show confirmation when the action has financial or class-balance consequences. The exact effect of no-shows, cancellations, and completed sessions is determined by the business-rules document and backend response.

## 14. Meeting Links

A student may have multiple Zoom, Google Meet, or other approved meeting links.

The interface must support:

- Adding a link.
- Editing its label and URL where allowed.
- Selecting a provider.
- Setting or clearing the preferred-link designation.
- Activating or deactivating a link.
- Viewing validity dates and notes when present.
- Associating a link with a scheduled class where supported.
- Opening an active link in a new browser tab.

The UI must distinguish provider and label, for example `Zoom — Regular class` and `Google Meet — Backup`.

Links must be rendered as links, never as executable HTML. Only approved URL schemes may be opened. Prefer HTTPS. Use safe new-tab behavior and do not expose authentication tokens in link URLs.

If a student has multiple links, the interface must not silently select an arbitrary link when joining a class. The chosen link must be visible to the administrator.

## 15. Notes and Follow-ups

The student profile must provide a simple interface to add and review dated notes.

Notes may include a type, text, follow-up date, and follow-up status as supported by the data model.

The UI must distinguish notes from structured financial or class records. A note saying that a payment was made must not create or replace a payment transaction.

Notes must be displayed as plain text. User-entered content must not be interpreted as HTML.

## 16. Import Workflow

The import interface must guide the administrator through a controlled process:

1. Select or identify the supported source spreadsheet and tab.
2. Inspect and map source columns.
3. Validate required fields and data formats.
4. Preview the records and proposed mappings.
5. Identify potential duplicates and records requiring review.
6. Require explicit confirmation before writing records.
7. Show batch progress or current status where supported.
8. Present imported, skipped, duplicate-review, and failed row counts.
9. Allow the administrator to inspect row-level errors.

An import must never silently overwrite existing student, payment, or class history. The UI must clearly separate preview from execution.

If an import fails partially, the result view must explain which records were processed and which need attention. The administrator must not be encouraged to rerun the entire import blindly.

## 17. Reports and Exports

The frontend may provide simple operational reports for:

- Outstanding and overdue fee obligations.
- Payment history over a selected date range.
- Upcoming classes.
- Package balances.
- Active and inactive students.

Reports must use backend-defined calculations and filters. Each report must show the selected period and relevant filter criteria.

Export actions must clearly identify the dataset and selected scope before execution. The UI must not include authentication tokens, secrets, or unrelated sensitive fields in exports.

Do not build a general-purpose report designer in Version 1.

## 18. Settings

Settings must expose only approved, non-secret application configuration, such as supported display preferences or defaults.

The frontend must not display or edit privileged deployment credentials, identity-verification secrets, or other backend secrets.

Any setting that changes business behavior must have validation and a clear explanation. Configuration changes must be saved through the backend and must show success only after persistence is confirmed.

## 19. Frontend API Boundary

All persistent data operations must go through a centralized API client and domain-specific frontend services.

Components must not construct arbitrary backend operations independently. They must use the documented API contract.

The API layer must normalize:

- Network failures.
- Authentication failures.
- Authorization failures.
- Validation errors.
- Not-found responses.
- Conflict responses.
- Server or Apps Script execution errors.
- Unexpected or malformed responses.

The UI must not expose raw stack traces or internal implementation details to the user.

## 20. State and Mutation Behavior

The frontend must distinguish:

- Data currently loading.
- Data successfully loaded.
- No records found.
- A request failed.
- A form contains unsaved changes.
- A mutation is in progress.
- A mutation succeeded.
- A mutation failed.

Avoid introducing a global state library unless implementation demonstrates a concrete need. Local component state and a small set of domain-level hooks/services are sufficient for the initial product.

After a successful mutation, refresh or update the affected view using confirmed backend results. Do not keep stale financial balances or class counts visible without indicating that a refresh failed.

Forms must guard against accidental navigation loss when meaningful unsaved changes exist, without adding intrusive confirmation prompts to every navigation action.

## 21. Validation and Error Messages

Use client-side validation for immediate feedback and backend validation as the final authority.

Messages must be specific and actionable. Examples:

- `Enter a valid payment amount.`
- `Choose a due date.`
- `This student could not be found. Refresh the list and try again.`
- `Your session has expired. Sign in again.`
- `The record changed or is no longer available. Reload it before retrying.`

Do not show a generic success toast before the backend confirms the operation.

Preserve form input after recoverable failures where safe to do so.

## 22. Accessibility and Interaction

The frontend must:

- Use semantic HTML elements.
- Associate form labels with inputs.
- Support keyboard navigation for primary workflows.
- Provide visible focus indicators.
- Use accessible names for icon-only controls.
- Avoid communicating status through color alone.
- Maintain readable contrast and text sizing.
- Use confirmation dialogs that can be operated by keyboard.
- Return focus sensibly after dialogs close.
- Avoid unnecessarily dense forms and tables on small screens.

Accessibility work should be practical and testable; do not add a large UI framework solely to claim compliance.

## 23. Responsive Behavior

On desktop, tables may use multiple columns and persistent navigation.

On smaller screens:

- Primary actions must remain reachable.
- Wide tables may use horizontal scrolling or a compact record layout.
- Forms must fit the viewport.
- Meeting-link actions must remain clearly identifiable.
- Important fee and class-balance values must not be hidden behind decorative elements.

Responsive behavior must preserve function, not merely shrink desktop layouts.

## 24. Performance and Network Behavior

The frontend must:

- Avoid requesting all historical data when a summary is sufficient.
- Use backend-supported filters and pagination where appropriate.
- Avoid duplicate requests caused by avoidable component behavior.
- Prevent stale responses from overwriting newer search results.
- Disable repeated submissions while a mutation is pending.
- Provide a loading indication for operations that take noticeable time.
- Avoid caching sensitive responses beyond what is justified and documented.

Performance targets and test datasets are defined in the testing document.

## 25. Privacy Requirements

The frontend must:

- Display only fields needed for the current task.
- Avoid sending student information to third-party analytics.
- Avoid placing private records in URLs or browser console logs.
- Avoid embedding real student records in source code or fixtures.
- Use synthetic data for development and screenshots.
- Clear protected UI state when the session becomes invalid.
- Never rely on obscuring a UI element to enforce authorization.

## 26. Source-Code Constraints

The frontend must follow the architecture defined in the dedicated source-code architecture document.

Mandatory rules:

- Every domain in `src/` and `public/` must be a directory of single-purpose micro-files.
- Every source file must remain under 150 lines.
- No catch-all files such as `actions.js` or `app.js`.
- No monolithic CSS files.
- Components must have one clear responsibility.
- API transport, domain services, validation, and presentation must remain separated.
- Shared utilities must stay small and genuinely reusable.
- Avoid adding dependencies without a clear requirement.
- Do not compress code into unreadable one-line statements to satisfy the line limit.

The root entry point may perform minimal application bootstrapping, but must not become a catch-all implementation file.

## 27. Frontend Configuration

Only non-secret frontend configuration may be included in the Vite build, such as a public API endpoint or public identity-client identifier where required by the selected authentication flow.

Any value prefixed for exposure to the browser must be treated as public. No service-account credential, private API key, or privileged secret may be placed in frontend environment variables.

Development, preview, and production environments must be configured explicitly. The frontend must not accidentally send production mutations while running against a development build.

## 28. Acceptance Criteria

The frontend requirements are satisfied when tests demonstrate that:

1. An unauthenticated user cannot view protected application data.
2. An authorized administrator can navigate all Version 1 modules.
3. Student search, filtering, profile access, archive, and reactivation work.
4. Enrollment and package details are displayed accurately.
5. Payment forms validate input and reflect confirmed backend results.
6. Fee balances are not independently calculated as authoritative values in the browser.
7. Class scheduling and status transitions follow backend business rules.
8. Multiple meeting links are clearly distinguished and safely opened.
9. Notes are handled as plain text.
10. Import preview and reconciliation results are understandable.
11. Loading, empty, error, and success states are distinct.
12. Expired authentication clears protected UI state and prompts re-authentication.
13. The interface remains usable on desktop and narrow screens.
14. No browser code accesses the master spreadsheet directly.
15. Source files comply with the micro-file and under-150-line constraints.
16. The frontend passes the approved cross-origin integration proof.
17. No real student data or secrets are committed to the frontend repository.

## 29. Dependencies on Other Documents

This document must be implemented consistently with:

- Product requirements.
- System architecture.
- Security and authentication.
- Google Sheets data model.
- Business rules and workflows.
- Apps Script API specification.
- Frontend product and UI specification.
- Frontend file and code architecture.
- Data import and migration.
- Testing and acceptance criteria.
- Deployment and operations.

Where details are owned by another authoritative document, this document
states the frontend requirement but does not redefine the underlying
schema, security mechanism, or business calculation.

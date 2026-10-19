# 03 — Pages, Components, and Interactions

## 1. Purpose

This document defines the Version 1 frontend pages, their responsibilities, reusable UI components, and expected user interactions for the Student Management Dashboard.

It is an implementation specification, not a visual mockup. The design must remain simple, fast for routine administration, and consistent across pages.

## 2. Product Context

The application is a private, single-admin dashboard for managing online students and classes.

The frontend is built with React, TypeScript, and Vite. It communicates with the Google Apps Script backend through the API client defined in the frontend architecture. Google Sheets is accessed only by the backend; the browser must never read or write the master spreadsheet directly.

Version 1 does not include student or parent accounts, staff roles, a payment gateway, automated messaging, or automatic meeting creation.

## 3. Global Application Shell

### 3.1 Layout

The authenticated application shell contains:

- A compact sidebar or equivalent primary navigation.
- A top bar with page title, global student search, and account menu.
- A main content region.
- A consistent notification area for success and error feedback.
- A responsive navigation pattern for narrow screens.

Desktop is the primary interaction target because the administrator will frequently work with tables and forms. Mobile layouts must remain usable, but must not force desktop tables to overflow the viewport without a fallback.

### 3.2 Primary Navigation

Navigation items, in order:

1. Dashboard
2. Students
3. Classes
4. Fees & Payments
5. Packages
6. Imports
7. Reports
8. Settings

Audit history is accessible from relevant record details and, if implemented as a standalone view, through an appropriate administrative route. It does not need a top-level navigation item in Version 1.

### 3.3 Global UI States

The shell and pages must consistently handle:

- Initial loading.
- Loaded data.
- Empty results.
- Failed requests.
- Expired authentication.
- Permission denial.
- Unsaved form changes.
- Successful mutation.
- Mutation failure.

Do not display stale data as if a failed refresh succeeded. When stale data remains visible after a refresh failure, make that state clear and provide a retry action.

## 4. Route Map

Use explicit, named routes. Route names may be adjusted to match the chosen router, but the page boundaries must remain stable.

- `/login` — sign-in page.
- `/` — dashboard overview.
- `/students` — student directory.
- `/students/new` — create student.
- `/students/:studentId` — student profile.
- `/students/:studentId/edit` — edit student details.
- `/classes` — class schedule and session list.
- `/classes/new` — create a class session.
- `/classes/:classSessionId` — class session detail or edit view.
- `/fees` — fee obligations and balances.
- `/payments` — payment ledger.
- `/packages` — package list.
- `/packages/new` — create package.
- `/imports` — import batches and migration workflow.
- `/imports/:importBatchId` — import preview/results.
- `/reports` — operational summaries and exports.
- `/settings` — supported application settings and system health.
- `*` — not-found page.

The implementation may use nested routes for shared layouts. A route must not bypass authentication by being opened directly in the browser.

## 5. Login Page

### Purpose

Authenticate the one authorized administrator using the approved Google identity flow.

### UI

- Product name and concise purpose statement.
- Sign-in control.
- Loading state while authentication is in progress.
- Clear error state for cancellation, unauthorized identity, or failed verification.

### Interactions

- Start the supported Google sign-in flow.
- Exchange identity material with the backend according to the authentication specification.
- Navigate to the dashboard only after backend authorization succeeds.
- If the identity is not authorized, show a generic access-denied message without revealing private configuration.

The frontend must not decide that a user is an administrator merely because an email is present in browser state.

## 6. Dashboard Page

### Purpose

Provide a quick operational overview and shortcuts to common work.

### Summary cards

- Active students.
- Fees currently overdue.
- Classes scheduled today or in the selected near-term period.
- Recently recorded payments.
- Students requiring a fee follow-up, where supported by available data.

Show only metrics that can be calculated reliably by the backend. Do not create multiple similar cards that communicate the same information.

### Sections

- Upcoming classes.
- Recent payments.
- Fee follow-ups.
- Recently updated students, if this can be provided without excessive complexity.

### Interactions

- Selecting a metric opens the relevant filtered list.
- Selecting a student opens that student's profile.
- Selecting an upcoming class opens its session detail.
- Selecting a payment opens the related payment or fee detail.
- A refresh action reloads dashboard data.

### Empty and error states

If there are no upcoming classes or payments, show a concise empty state. If one dashboard section fails while another succeeds, display section-level failure where practical rather than hiding all successful data.

## 7. Student Directory Page

### Purpose

Search, filter, and open student records efficiently.

### Table columns

- Student name.
- Student ID, where useful to disambiguate records.
- Status.
- Parent or guardian contact summary.
- Current enrollment or package summary.
- Outstanding fees, when available.
- Next scheduled class, when available.
- Row actions.

Avoid displaying full sensitive details in the directory when a summary is sufficient.

### Controls

- Search by student name, student ID, and supported contact fields.
- Status filter: Active or Inactive.
- Fee filter: All, Due, or Overdue, when the backend supports these states.
- Class/package filter where it materially helps daily work.
- Clear filters.
- Create student.
- Pagination or incremental loading for larger datasets.

### Interactions

- Clicking a row or its name opens the student profile.
- Create student opens the new-student form.
- Archive is a deliberate action with confirmation.
- Reactivate is available for inactive students.
- Search and filters must not mutate records.
- Empty search results provide a clear way to clear filters or create a student.

Do not use row index as identity. Every action must use the stable `student_id` returned by the backend.

## 8. Create and Edit Student Forms

### Fields

- First name.
- Last name.
- Preferred name.
- Date of birth, optional.
- Parent/guardian name.
- Relationship, optional.
- Primary phone.
- Secondary phone, optional.
- Parent email, optional.
- City, optional.
- Internal summary, optional.

Lifecycle status is managed through explicit lifecycle actions rather than being casually changed in an ordinary profile form.

### Interactions

- Validate required fields before submission for usability.
- Show field-level errors.
- Disable duplicate submissions while a save is in progress.
- Preserve form input after a recoverable API failure.
- Navigate to the created or updated profile only after the backend confirms success.
- Warn before leaving a dirty form.

The backend remains responsible for authoritative validation and duplicate detection.

## 9. Student Profile Page

### Purpose

Provide one consolidated view of the student's current information and history.

### Header

Display:
- Student name.
- Student ID.
- Active/inactive status.
- Primary contact summary.
- Edit action.
- Archive or reactivate action.
- Quick actions to schedule a class, record a payment, or add a meeting link when applicable.

### Profile sections or tabs

1. Overview.
2. Enrollments and packages.
3. Fees and payments.
4. Classes and attendance.
5. Meeting links.
6. Notes.
7. History/audit, where available.

Use tabs only if they improve navigation. On smaller screens, sections may become a vertical layout or compact tab control.

### Overview

Show current enrollment/package status, outstanding balance, remaining classes, next scheduled class, and the preferred meeting link when the data exists.

Every derived value must be sourced from the backend. The frontend must not independently calculate authoritative balances from incomplete page data.

### Enrollments and packages

- List current and historical enrollments.
- Show package quantity, price, dates, status, and calculated remaining classes.
- Allow a new enrollment or package to be created.
- Keep old records visible as history.

### Fees and payments

- List fee obligations with amount, due date, paid amount, and outstanding amount.
- List payment transactions chronologically.
- Provide a record-payment action.
- Show voided/corrected transactions with clear status labels.
- Never silently remove a payment from history.

### Classes and attendance

- Show upcoming and historical sessions.
- Display scheduled time, status, attendance, package association, and meeting link.
- Allow the administrator to open the session, mark attendance, complete a class, reschedule, or cancel according to business rules.

### Meeting links

- List all links with provider, label, status, validity period, and preferred indicator.
- Add or edit a link.
- Set a preferred link according to backend rules.
- Deactivate an obsolete link without deleting its history.
- Open a link in a new tab only after safe URL validation.

### Notes

- Display notes newest first by default.
- Add a dated note.
- Edit a note only through an auditable operation.
- Show follow-up date and status when applicable.

### Lifecycle interactions

Archiving a student requires confirmation and must explain that the record and history will be retained. Reactivation must restore the student to active operational views without creating a duplicate student record.

## 10. Classes Page

### Purpose

Provide a single place to see and manage scheduled sessions.

### Views

Version 1 should provide a practical list view grouped by date. A full drag-and-drop calendar is not required.

### Filters

- Date range.
- Student.
- Session status.
- Attendance status, where useful.

### Table/list fields

- Scheduled date and time.
- Student.
- Class title.
- Duration.
- Session status.
- Attendance status.
- Meeting provider/link availability.
- Row actions.

### Interactions

- Create a session.
- Open session detail.
- Open the assigned meeting link.
- Mark a session completed and record attendance.
- Reschedule a session.
- Cancel a session with a reason where required.
- Open the student's profile.

The UI must not mark a class completed simply because its scheduled time has passed.

## 11. Create and Edit Class Session Form

### Fields

- Student.
- Enrollment, if applicable.
- Package, if applicable.
- Class title.
- Scheduled start date and time.
- Scheduled end date and time or duration.
- Meeting link, optional.
- Notes, optional.

### Interactions

- Student selection is required.
- Enrollment and package options must be limited to valid records for the selected student.
- Meeting link options must be limited to valid links for that student unless the business rules explicitly permit another arrangement.
- End time must be after start time.
- Rescheduling must use the backend operation defined for session updates.
- Cancellation must preserve the original session record and history.

Timezone display and storage must follow the system-wide Asia/Kolkata convention. Avoid converting a local class time twice.

## 12. Fees and Payments Pages

### Fees page

Display fee obligations with:
- Student.
- Description.
- Issue date.
- Due date.
- Amount due.
- Amount paid.
- Outstanding amount.
- Status.

Filters:
- Open.
- Partially paid.
- Paid.
- Overdue.
- Student.
- Due-date range.

### Payments page

Display a chronological ledger with:
- Payment date.
- Student.
- Related fee obligation.
- Amount.
- Method.
- Reference.
- Status.

Filters:
- Student.
- Date range.
- Payment method.
- Status.

### Record payment interaction

The form must capture:
- Student.
- Fee obligation.
- Payment date.
- Amount.
- Payment method.
- Transaction reference, optional.
- Notes, optional.

Selecting a student filters the fee-obligation list to that student's eligible obligations. The backend validates that the selected obligation belongs to the selected student.

Show the expected outstanding amount before submission when available. The displayed amount is informational; the backend must revalidate the transaction at write time.

Require a deliberate confirmation before recording a payment. Prevent accidental repeated submission while the request is pending. If the result is uncertain because the network failed, refresh the ledger before retrying and use the API's idempotency behavior.

### Corrections and voids

Provide a clearly labeled correction/void action only if supported by the backend. Explain the effect, require a reason, and retain the original transaction in history. Do not implement ordinary delete buttons for payment records.

## 13. Packages Page

### Purpose

Manage purchased class allocations without confusing them with payments.

### Table fields

- Student.
- Package name.
- Purchased classes.
- Completed/consumed classes, as defined by the backend.
- Remaining classes.
- Purchase date.
- Expiry date.
- Price.
- Status.

### Filters

- Active.
- Exhausted.
- Expired.
- Cancelled or closed.
- Student.

### Interactions

- Create a package.
- Open the related student profile.
- View package-linked sessions.
- Close or cancel a package only through a supported business operation.

Remaining classes are read-only derived data. The UI must not provide a normal text field for directly overwriting the calculated balance.

## 14. Imports Page

### Purpose

Migrate existing Google Sheets safely and make the result reconcilable.

### Main view

Display import batches with:
- Source name.
- Source tab.
- Start/completion time.
- Status.
- Total rows.
- Imported rows.
- Skipped rows.
- Duplicate-review rows.
- Failed rows.

### Import workflow

1. Select or identify the approved source spreadsheet and tab.
2. Read and validate source headers through the supported backend import process.
3. Map source columns to canonical fields.
4. Preview a sample and validation summary.
5. Review duplicate candidates and missing required fields.
6. Confirm the import.
7. Display progress or the latest available batch status.
8. Review row-level results.
9. Export or otherwise retain the reconciliation report.

The importer must not silently merge ambiguous students or overwrite existing financial history. Duplicate candidates must be reviewable before finalizing their mapping.

Import access must be limited to explicitly authorized source spreadsheets. Do not accept arbitrary spreadsheet IDs as sufficient proof of authorization.

## 15. Reports Page

### Purpose

Provide lightweight operational reporting, not a replacement for accounting software.

Initial reports:
- Outstanding and overdue fees.
- Payments over a selected date range.
- Upcoming classes.
- Class/session history.
- Active and inactive student lists.
- Package balances.

### Interactions

- Select a date range or supported filter.
- Preview the results.
- Export the authorized report.
- Navigate from a report row to the relevant student or record.

Report totals must come from backend calculations and match the underlying records. If a report excludes voided records or inactive students, its inclusion rules must be visible or documented.

## 16. Settings Page

### Purpose

Expose only settings needed for routine administration and diagnostics.

Potential sections:
- Display timezone and currency.
- Default class duration.
- Application/backend health check.
- Current schema version.
- Sign-out.

Do not expose secrets, tokens, spreadsheet credentials, or deployment configuration through the UI.

Do not allow casual editing of schema versions or protected backend configuration.

## 17. Reusable Component Inventory

Components must be split into single-purpose files under the directory structure specified by the frontend architecture document.

### Application shell

- `AppShell` — authenticated layout composition.
- `PrimaryNavigation` — main route links.
- `TopBar` — page heading and global actions.
- `GlobalStudentSearch` — student search entry point.
- `AccountMenu` — identity summary and sign-out.
- `PageHeader` — page title, subtitle, and actions.

### Data display

- `DataTable` — shared table behavior only; domain-specific columns remain outside it.
- `PaginationControls` — page navigation.
- `FilterBar` — layout for page filters.
- `StatusBadge` — consistent status display.
- `CurrencyAmount` — INR formatting.
- `DateDisplay` — consistent date formatting.
- `DateTimeDisplay` — consistent date-time formatting.
- `EmptyState` — no-results or no-data guidance.
- `LoadingState` — loading feedback.
- `ErrorState` — error and retry feedback.
- `ConfirmDialog` — deliberate confirmation for significant actions.
- `ToastMessage` — concise operation feedback.

### Student domain

- `StudentTable` — student-specific table columns and actions.
- `StudentForm` — student create/edit fields.
- `StudentStatusActions` — archive/reactivate controls.
- `StudentProfileHeader` — student identity and quick actions.
- `StudentOverviewPanel` — current operational summary.
- `StudentSearchResults` — global search results.

### Fee and payment domain

- `FeeObligationTable` — fee-specific list.
- `PaymentLedgerTable` — payment history list.
- `RecordPaymentForm` — payment entry.
- `PaymentCorrectionDialog` — supported correction or void workflow.
- `BalanceSummary` — backend-provided financial summary.

### Package domain

- `PackageTable` — package list.
- `PackageForm` — package creation/edit fields.
- `PackageBalanceSummary` — read-only balance display.

### Class domain

- `ClassSessionList` — session list.
- `ClassSessionForm` — session create/edit fields.
- `AttendanceControls` — allowed attendance transitions.
- `MeetingLinkButton` — safe external meeting-link action.

### Meeting-link domain

- `MeetingLinkList` — links for a student.
- `MeetingLinkForm` — link entry/edit.
- `MeetingProviderBadge` — provider display.

### Import domain

- `ImportBatchTable` — batch list.
- `ImportMappingForm` — source-to-canonical field mapping.
- `ImportPreviewTable` — preview and validation status.
- `ImportResultsSummary` — imported/skipped/failed counts.
- `ImportRowResultsTable` — row-level reconciliation.

### Forms and navigation helpers

- `FormField` — label, control, hint, and validation message composition.
- `SearchInput` — controlled search input.
- `SelectField` — accessible select wrapper where useful.
- `DateField` — date input wrapper where useful.
- `MoneyField` — monetary input with validation feedback.

Do not create a component merely to wrap one element without adding meaningful behavior, consistency, or accessibility. The inventory is a responsibility map, not a requirement to create every component before it is needed.

## 18. Interaction Standards

### Loading

- Disable the relevant submit action during a pending mutation.
- Show local progress near the affected content.
- Avoid freezing unrelated navigation for a small request.

### Success

- Show a concise confirmation.
- Refresh or update the relevant persisted data.
- Navigate only when it supports the user's workflow.

### Failure

- Show a useful, non-sensitive message.
- Preserve recoverable form input.
- Offer retry when appropriate.
- Do not display stack traces or raw backend internals.

### Confirmation

Require confirmation for:
- Archiving a student.
- Voiding a payment or fee obligation.
- Cancelling a class where cancellation has operational consequences.
- Closing or cancelling a package.
- Starting an import that will write records.

Ordinary navigation and non-destructive edits should not be burdened with unnecessary confirmation dialogs.

### External links

Meeting links open in a new tab with safe link attributes. The UI must not inject raw URL content as HTML. Invalid or unsupported URLs must be rejected or require an explicit safe resolution path.

## 19. Accessibility and Responsive Behavior

- All interactive controls must have accessible names.
- Form fields must have labels.
- Validation errors must be associated with their fields.
- Status must not be communicated by color alone.
- Dialogs must support keyboard interaction and focus management.
- Tables must have meaningful headers.
- Controls must remain usable at narrow viewport widths.
- Long student names, URLs, and notes must not break the layout.
- Keyboard focus must remain visible.

## 20. State and Data Ownership

- Pages own page-specific temporary state such as open dialogs and active filters.
- Domain services own API calls for their domain.
- The centralized API client owns transport and response normalization.
- Authentication state is managed through the agreed authentication module.
- Backend responses own authoritative balances and lifecycle status.
- Form state is not treated as persisted until the backend confirms success.

Do not create a global state-management dependency unless actual cross-page requirements justify it. Start with React state and small domain hooks/services.

## 21. Performance Expectations

- Load only the data required for the current page.
- Do not load every historical record when opening the dashboard.
- Use pagination or incremental loading for long lists.
- Avoid repeated API requests for each table row.
- Debounce global search where appropriate.
- Cancel or ignore obsolete search results when a newer query supersedes them.
- Keep derived UI formatting inexpensive and deterministic.

## 22. Explicitly Excluded UI Complexity

Do not implement in Version 1 unless a confirmed requirement emerges:
- Drag-and-drop calendar scheduling.
- Custom dashboard layout editors.
- User-configurable widgets.
- Multiple themes and theme editors.
- Complex charts for basic operational totals.
- Multi-step wizards for ordinary record creation.
- Bulk editing across unrelated entities.
- Real-time collaborative editing.
- Student-facing portals.
- An internal chat or messaging system.

## 23. Acceptance Criteria

The frontend meets this specification when:

1. The administrator can sign in and sign out.
2. All protected routes require an authorized session.
3. The dashboard links to the relevant filtered records.
4. Students can be searched, created, edited, archived, and reactivated.
5. A student profile consolidates current information and history.
6. Multiple meeting links can be stored and selected safely.
7. Classes can be scheduled, completed, rescheduled, and cancelled using allowed backend transitions.
8. Payments and fee obligations are displayed distinctly.
9. The UI does not permit direct manual editing of calculated balances.
10. Imports provide preview, confirmation, and row-level reconciliation.
11. Loading, empty, failure, and success states are implemented consistently.
12. The interface is usable at desktop and narrow viewport widths.
13. Sensitive information is not exposed through client-side secrets, public routes, or error messages.
14. Components and files follow the single-purpose, under-150-lines architecture constraints.
15. Every significant interaction has corresponding acceptance tests.

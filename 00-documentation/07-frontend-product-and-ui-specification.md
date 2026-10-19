# 07 — Frontend Product and UI Specification

## 1. Document Control

- Product: Student Management Dashboard
- Document ID: 07
- Status: Architecture specification
- Version: 1.0.0
- Applies to: React + TypeScript + Vite frontend
- Primary user: One authorized administrator
- Related documents: 01 Product Requirements, 02 System Architecture, 03 Security and Authentication, 04 Google Sheets Data Model, 05 Business Rules and Workflows, 06 Apps Script API Specification, 08 Frontend File and Code Architecture

This document defines the frontend's pages, navigation, user interactions, forms, tables, display rules, and UI states. It does not replace the authoritative backend business rules or API contract.

## 2. Frontend Principles

1. The interface is admin-only in Version 1.
2. Optimize for frequent desktop use while remaining responsive on tablet and mobile.
3. Make common actions reachable with minimal navigation.
4. Keep student identity, current operational state, and historical records distinct.
5. Show financial and class balances as backend-calculated values.
6. Do not imply a change was saved until the API confirms success.
7. Use consistent terminology, dates, currency formatting, status labels, and interaction patterns.
8. Prefer simple tables and forms over complex visualizations.
9. Do not expose student data in public routes, page metadata, analytics, or URLs beyond necessary opaque record identifiers.
10. Every interactive control must have a defined behavior, including loading, disabled, success, and error states.

## 3. Application Shell

### 3.1 Desktop Layout

The authenticated application uses:
- A persistent left navigation sidebar.
- A top header containing the page title, global student search, and account menu.
- A main content region.
- Contextual page actions aligned with the relevant page title.

The sidebar may collapse to icons on narrower desktop screens. Its expanded/collapsed state is a UI preference and must not affect authorization or data access.

### 3.2 Navigation Items

Use this order:
1. Dashboard
2. Students
3. Classes
4. Fees & Payments
5. Packages
6. Imports
7. Reports
8. Settings

The account menu contains:
- Signed-in administrator identity.
- Session/account information when available.
- Sign out.

Do not add student or parent-facing routes in Version 1.

### 3.3 Page Header

Each primary page header contains:
- Page title.
- Optional concise supporting text.
- Primary action, if one exists.
- Optional secondary actions such as export or refresh.

Do not crowd the header with unrelated actions. Put row-specific actions in the relevant row or detail page.

## 4. Global Search

### 4.1 Purpose

Global search helps the administrator find a student without first navigating to the Students page.

### 4.2 Search Fields

Search may match:
- Student ID.
- First name.
- Last name.
- Preferred name.
- Parent/guardian name.
- Primary phone.
- Parent email, when present.

Search behavior and supported matching must be aligned with the backend API contract. The frontend must not download the entire database just to implement search locally.

### 4.3 Interaction

- Show a search field in the authenticated top header.
- Begin searching after a short debounce or explicit submission, as specified by the frontend implementation.
- Show a loading indicator while searching.
- Show a concise empty state when no matches exist.
- Display a bounded result list with student name, status, and a useful secondary identifier.
- Selecting a result opens that student's profile.
- Include inactive students only when the search behavior or filter explicitly permits them; communicate the status clearly.
- Escape closes the result list; keyboard navigation must be supported where practical.
- Do not display contact information beyond what is needed to distinguish results.

## 5. Dashboard Page

Route: `/dashboard`

### 5.1 Purpose

Provide a quick operational overview and direct access to tasks needing attention.

### 5.2 Summary Metrics

Show compact cards for:
- Active students.
- Fees overdue.
- Fees due soon or currently due, if the API supports this distinction.
- Classes scheduled for the selected day or period.
- Classes remaining across active packages, if the API exposes a reliable aggregate.

Each metric must show its period or meaning. Avoid ambiguous labels such as “Revenue” unless the API defines the exact accounting basis.

### 5.3 Dashboard Sections

Display:
- Upcoming classes.
- Overdue or due-soon fee obligations.
- Recently recorded payments.
- Recently updated students or records, where useful.

Each section must have a clear “View all” link to the relevant page with applicable filters preserved when feasible.

### 5.4 Dashboard Actions

Provide shortcuts for:
- Add student.
- Schedule class.
- Record payment.
- Import existing records.

Do not duplicate the complete functionality of other pages on the dashboard.

### 5.5 Dashboard States

- Initial loading: show placeholders or a compact loading state.
- Empty system: explain that records have not yet been added and offer the appropriate first action.
- Partial failure: render sections that loaded successfully and identify sections that failed.
- Full failure: show a retry action and a concise error message.
- No upcoming classes: show a neutral empty state, not an error.

## 6. Students Directory

Route: `/students`

### 6.1 Purpose

Provide a searchable directory of student records, with active students shown by default.

### 6.2 Table Columns

Default columns:
- Student name.
- Student ID.
- Status.
- Parent/guardian name.
- Primary phone.
- Current enrollment or package summary, when available.
- Outstanding fees, when available and reliably calculated.
- Next class, when available.
- Row actions.

Do not force every possible field into the default table. Detailed history belongs on the student profile.

### 6.3 Filters

Support filters for:
- Active/inactive status.
- Overdue fees.
- Upcoming classes.
- Exhausted or unavailable package balance, if supported by the API.

Provide a clear way to reset filters. The selected filters must be visible and must not silently alter the records.

### 6.4 Sorting and Pagination

- Support useful sorting such as student name and most recently updated.
- Default ordering: active students first, then a stable, predictable order.
- Use backend pagination when the API contract supports it.
- Preserve search and filter state during ordinary navigation when feasible.
- Show the current result count when available.

### 6.5 Row Actions

Provide:
- Open profile.
- Edit student.
- Archive or reactivate, according to current status.

Archiving requires confirmation and a clear explanation that historical records will be retained. Do not offer permanent deletion as a routine action.

### 6.6 Empty States

Differentiate:
- No students exist yet.
- No students match the search.
- No students match the selected filters.
- Data could not be loaded.

Offer a relevant next action for each case.

## 7. Create and Edit Student

Use a dedicated page or clearly separated form panel. The implementation must choose one consistent pattern and reuse it.

### 7.1 Fields

Required or optional status must match Document 04 and backend validation.

- First name — required.
- Last name — optional.
- Preferred name — optional.
- Date of birth — optional.
- Parent/guardian name — required.
- Parent/guardian relationship — optional.
- Primary phone — required.
- Secondary phone — optional.
- Parent email — optional.
- City — optional.
- Internal summary — optional.
- Status — managed through explicit lifecycle actions; do not expose arbitrary status editing if it bypasses lifecycle rules.

Student ID is generated by the backend and is read-only after creation.

### 7.2 Validation

- Trim unnecessary leading and trailing whitespace.
- Validate required fields before submission.
- Validate email format when an email is supplied.
- Validate phone input without assuming every number follows one rigid formatting pattern.
- Validate dates and prevent invalid future/past values where a business rule applies.
- Show field-specific messages.
- Preserve user input after a recoverable API error.

The backend remains authoritative even when frontend validation passes.

### 7.3 Save Behavior

- Disable repeated submission while the request is in progress.
- Show a clear saving state.
- On success, show confirmation and navigate to the profile or return to the directory as appropriate.
- On failure, keep entered data and show a useful error.
- Do not clear the form or show success before the API confirms the write.

## 8. Student Profile

Route: `/students/:studentId`

### 8.1 Profile Header

Display:
- Student name and preferred name when supplied.
- Student ID.
- Active/inactive status.
- Parent/guardian name.
- Primary contact details.
- Edit action.
- Archive/reactivate action.
- Quick actions such as schedule class or record payment, when valid.

### 8.2 Profile Summary

Show compact summaries for:
- Current enrollment.
- Current active package and remaining classes.
- Outstanding fees.
- Next scheduled class.
- Preferred active meeting link, if available.

Every computed value must come from the API or be derived from a clearly documented response. The frontend must not invent missing balances or treat missing values as zero.

### 8.3 Profile Sections

Use tabs or clearly separated sections for:
1. Overview.
2. Enrollments and packages.
3. Fees and payments.
4. Classes and attendance.
5. Meeting links.
6. Notes.

Keep the navigation consistent for every student. If a section has no records, show an empty state rather than hiding the section unpredictably.

### 8.4 Historical Data

- Show inactive or closed records with visible status labels.
- Sort histories in a predictable chronological order.
- Distinguish current records from historical records.
- Do not remove historical information when the student is archived.
- Link related records to their details where useful.

### 8.5 Profile Actions

The profile may expose:
- Edit student details.
- Create enrollment.
- Create package.
- Create fee obligation.
- Record payment.
- Schedule class.
- Add meeting link.
- Add note.
- Archive/reactivate student.

Actions that require a related record must either collect that relationship or prefill it safely from the current student context.

## 9. Classes and Schedule

Route: `/classes`

### 9.1 Views

Version 1 should provide a practical list view and a date filter. A calendar view is optional and must not delay core functionality.

### 9.2 Filters

Support:
- Date range or selected day.
- Student.
- Session status.
- Attendance status.
- Upcoming versus historical sessions.

### 9.3 Table Columns

- Scheduled date and start time.
- Student.
- Class title.
- Duration or end time.
- Session status.
- Attendance status.
- Associated package, if applicable.
- Meeting provider/link status.
- Actions.

### 9.4 Schedule Class Form

Fields:
- Student — required.
- Enrollment — optional only where the business rules permit it.
- Package — optional only where permitted.
- Class title — optional or defaulted according to the product rules.
- Start date and time — required.
- End date/time or duration — required through one consistent input model.
- Meeting link — optional.
- Notes — optional.

Validation must prevent invalid time ranges and enforce any scheduling constraints defined in Document 05.

### 9.5 Session Actions

Depending on the session state and backend rules:
- Edit or reschedule.
- Cancel.
- Mark completed.
- Record attendance.
- Open meeting link.
- View student profile.

A cancelled or rescheduled session must not be displayed as completed. The UI must explain consequential actions, especially those that affect package balances.

### 9.6 Meeting Link Action

- Show the provider and label next to the join action.
- Open only a validated URL.
- Use a new browser tab where appropriate.
- Do not automatically join a meeting just because a class row is opened.
- If no valid link exists, show “No meeting link assigned” and provide an edit action when authorized.

## 10. Fees and Payments

Route: `/fees-payments`

### 10.1 Page Structure

Provide clearly separated views for:
- Fee obligations.
- Payment history.

Avoid mixing obligations and payments into a single ambiguous table.

### 10.2 Fee Obligation Table

Columns:
- Student.
- Obligation description.
- Issue date.
- Due date.
- Amount due.
- Amount paid.
- Outstanding amount.
- Status.
- Actions.

The amount paid and outstanding amount must be backend-calculated.

### 10.3 Payment History Table

Columns:
- Payment date.
- Student.
- Related obligation, if any.
- Amount.
- Method.
- Transaction reference, when present.
- Status.
- Actions.

Show voided transactions with a visible VOID status; do not silently remove them from historical views.

### 10.4 Filters

Support:
- Student.
- Date range.
- Outstanding/paid/partially paid/void status as applicable.
- Overdue obligations.
- Payment method.

### 10.5 Create Fee Obligation Form

Fields:
- Student — required.
- Enrollment — optional only when allowed.
- Package — optional only when allowed.
- Description — required.
- Amount due — required.
- Currency — default INR and consistent with system configuration.
- Issue date — required or defaulted according to the business rule.
- Due date — optional only if the business model permits it.
- Notes — optional.

### 10.6 Record Payment Form

Fields:
- Student — required.
- Fee obligation — required for obligation-linked payments.
- Payment date — required.
- Amount — required and greater than zero for a normal payment.
- Payment method — required.
- Transaction reference — optional.
- Notes — optional.

The selected obligation must belong to the selected student. If the obligation is preselected from a student profile, still validate it on the backend.

### 10.7 Financial Confirmation and Corrections

- Display the amount and obligation before submission.
- Prevent repeated submission while saving.
- Clearly distinguish recording a payment from editing a fee obligation.
- Corrections or voiding must require confirmation and a reason when required by the backend contract.
- Preserve the original transaction's historical visibility.
- Refresh the relevant balances after a successful mutation.
- Never permit the frontend to directly set an authoritative outstanding balance.

### 10.8 Formatting

- Display monetary amounts using INR formatting.
- Use consistent decimal precision.
- Show due dates explicitly.
- Label overdue obligations clearly.
- Do not infer that an obligation is paid based only on a zero-looking or missing UI value.

## 11. Packages

Route: `/packages`

### 11.1 Package Table

Columns:
- Student.
- Package name.
- Enrollment.
- Purchased classes.
- Completed/consumed classes, when returned by the API.
- Remaining classes.
- Purchase date.
- Expiry date.
- Status.
- Actions.

### 11.2 Package Form

Fields:
- Student — required.
- Enrollment — optional only where allowed.
- Package name — required or defaulted according to product rules.
- Purchased classes — positive integer.
- Price — optional only where the data model permits it.
- Currency.
- Purchase date.
- Start date.
- Expiry date — optional.
- Notes — optional.

### 11.3 Balance Display

- Treat remaining classes as a calculated value.
- Show the source package and status.
- Do not allow direct editing of remaining classes.
- If an adjustment mechanism exists, use the explicit adjustment workflow and reason required by Document 05.
- Clearly identify expired, exhausted, cancelled, and closed packages.

## 12. Meeting Links

Meeting links are primarily managed from a student profile, with an optional filtered management view if needed.

### 12.1 Link List

Display:
- Provider.
- Label.
- Active/inactive status.
- Preferred status.
- Validity dates, if set.
- Open action.
- Edit/deactivate action.

### 12.2 Link Form

Fields:
- Student — required.
- Provider — required: Zoom, Google Meet, or Other.
- Label — required.
- URL — required.
- Preferred — optional boolean.
- Status — controlled through supported actions.
- Valid from/until — optional.
- Notes — optional.

### 12.3 Link Safety

- Accept HTTPS URLs only unless a documented requirement permits otherwise.
- Validate the URL shape before submission.
- Use provider-specific host validation where practical.
- If provider and host disagree, show a warning and require an explicit resolution.
- Render the URL as a link; never inject it as HTML.
- Do not show full meeting URLs unnecessarily in directory tables.
- Deactivate old links instead of deleting them.

## 13. Student Notes

Notes are displayed on the student profile in reverse chronological order by default.

The note form contains:
- Note type.
- Note text.
- Optional follow-up date.
- Follow-up status when applicable.

Show creation time and author identity when available. Do not use notes to record payments, class attendance, or other structured facts that have dedicated records.

## 14. Imports

Route: `/imports`

### 14.1 Purpose

Provide a controlled migration workflow for existing Google Sheets.

### 14.2 Workflow

1. Select or identify the source spreadsheet and tab using the supported import mechanism.
2. Validate access and source structure.
3. Preview source columns and representative rows.
4. Map source columns to canonical fields.
5. Display missing required fields and invalid values.
6. Identify potential duplicates.
7. Require confirmation before starting the import.
8. Display progress when available.
9. Show a final reconciliation summary.
10. Allow inspection of failed, skipped, and duplicate-review rows.

### 14.3 Results Summary

Display:
- Total source rows.
- Imported rows.
- Skipped rows.
- Failed rows.
- Potential duplicates.
- Import start and completion times.
- Overall batch status.

The UI must not imply that all rows succeeded when the batch completed with errors.

### 14.4 Safety

- Preview before mutation.
- Never silently overwrite existing records.
- Clearly distinguish a dry run from a committed import.
- Provide an explicit result for each processed source row.
- Do not expose source spreadsheet credentials or privileged configuration.
- Make retry behavior explicit and safe against duplicate imports.

## 15. Reports

Route: `/reports`

Version 1 should focus on a small set of practical reports:
- Outstanding and overdue fee obligations.
- Payment history for a selected date range.
- Active students and inactive students.
- Upcoming and completed classes.
- Package balances and packages approaching expiry, if expiry is used.

Each report must state its filters and date range. Totals must be calculated by the backend or by a clearly documented, deterministic aggregation over a complete returned dataset.

Provide export where supported. Exports must respect the same authorization as the report view.

Do not introduce a configurable report builder in Version 1.

## 16. Settings

Route: `/settings`

Version 1 settings are limited to supported application configuration and operational diagnostics.

Potential sections:
- Display timezone and currency.
- Default class duration.
- Backend connectivity/health status.
- Schema version and schema validation status.
- Sign-in/account information.

Do not expose privileged secrets, spreadsheet write credentials, or raw tokens.

Settings controls must reflect values that are actually supported by the backend. A frontend-only setting must not be presented as a persistent system setting.

## 17. Global Form Behavior

All forms must follow these rules:

1. Clearly identify required fields.
2. Use appropriate controls for dates, times, amounts, statuses, and long text.
3. Provide field-level validation messages.
4. Preserve entered data when a recoverable request fails.
5. Prevent duplicate submissions while a mutation is in progress.
6. Show a saving state.
7. Display API validation errors near the relevant field where possible.
8. Show a general error when the failure cannot be tied to one field.
9. Confirm financially significant or lifecycle-changing operations.
10. Do not mark a form as saved until the backend confirms success.
11. Warn before navigating away from a form with unsaved changes, where practical.
12. Ensure all controls have accessible labels.

## 18. Global Table Behavior

Tables must:
- Have clear column headers.
- Use consistent date, time, currency, and status formatting.
- Support horizontal scrolling or responsive alternative layouts on narrow screens.
- Provide a loading state.
- Provide an empty state.
- Provide an error state with retry when appropriate.
- Avoid rendering unbounded histories in one response.
- Use pagination or bounded result sets for large datasets.
- Make row actions discoverable and keyboard accessible.
- Keep destructive or high-impact actions visually distinct from routine navigation.

Sorting and filtering must not mutate stored data.

## 19. Status Presentation

Use consistent labels and visual treatments for status values across all pages.

- ACTIVE: active/available record.
- INACTIVE: retained historical student or link, not currently active.
- COMPLETED: completed workflow or session.
- SCHEDULED: future/planned session.
- CANCELLED: cancelled workflow or session.
- OVERDUE: fee obligation past its due date with an outstanding balance.
- PARTIALLY PAID: obligation with some valid payment but a remaining balance.
- PAID: obligation fully settled according to backend rules.
- VOID: preserved historical record excluded from applicable totals.

Color must not be the only way to communicate a status. Include readable text or an accessible equivalent.

## 20. Date, Time, and Currency

- Display dates in the configured display format, defaulting to DD MMM YYYY.
- Display times in Asia/Kolkata unless the application configuration is changed.
- Store and transport timestamps in the API's documented format.
- Do not parse date-only values as UTC timestamps in a way that changes the calendar date.
- Use INR formatting for currency in Version 1.
- Do not calculate financial values using floating-point UI arithmetic when authoritative backend values are available.
- Clearly identify timezone when ambiguity could affect a scheduled class.

## 21. Responsive Behavior

### Desktop

- Full sidebar.
- Multi-column dashboard summaries.
- Tables with the standard column set.
- Forms may use two columns for logically related short fields.

### Tablet

- Collapsible sidebar.
- Reduced table columns where necessary.
- Keep critical actions visible.
- Allow horizontal scrolling when a table cannot reasonably collapse.

### Mobile

- Use a compact navigation pattern.
- Stack forms vertically.
- Present table records as a readable stacked layout or horizontally scrollable table.
- Keep primary actions accessible.
- Avoid requiring hover to reveal essential actions.
- Meeting links and fee status must remain legible.

The mobile layout must not introduce different business rules from desktop.

## 22. Accessibility

The interface must:
- Use semantic page headings and form labels.
- Support keyboard navigation for primary interactions.
- Provide visible focus indicators.
- Maintain readable contrast.
- Associate validation messages with their fields.
- Announce important status changes to assistive technology where practical.
- Not rely only on color or icons to convey meaning.
- Use accessible names for icon-only buttons.
- Return focus appropriately when dialogs close.

## 23. Authentication and Session UI

- Protected application pages require an authenticated session.
- Unauthenticated users are directed to the sign-in flow.
- While identity is being resolved, do not briefly expose protected page data.
- When a session expires, explain that sign-in is required and avoid discarding unsaved work where feasible.
- Sign out clears frontend session state and returns to the unauthenticated view.
- API authorization remains mandatory regardless of the visible route.
- Do not display a fake login screen that grants access based only on local state.

## 24. API Error Presentation

Normalize API errors into user-facing categories:
- Authentication required or session expired.
- Access denied.
- Validation error.
- Record not found.
- Duplicate or conflict.
- Rate/usage limit or temporary service unavailability.
- Network or unreadable response.
- Unexpected server error.

Show actionable, non-sensitive messages. Do not display stack traces, raw server internals, tokens, or full request payloads.

For a failed mutation, clearly state whether the operation was not saved, or whether its outcome is uncertain and must be checked before retrying.

## 25. Loading, Empty, and Failure States

Every data-driven page must define:
- Initial loading state.
- Successful populated state.
- Successful empty state.
- Filtered-empty state, where filters exist.
- Recoverable failure state.
- Partial failure state when independent sections load separately.

Use retries only where the operation is safe. A failed payment submission with an uncertain result must not be blindly repeated without an idempotency or reconciliation strategy.

## 26. Destructive and High-Impact Actions

Require a confirmation dialog for:
- Archiving a student.
- Voiding a payment.
- Voiding a fee obligation.
- Cancelling a class when the action affects records or balances.
- Closing or cancelling a package when consequential.
- Committing a data import.
- Any other action identified as high impact in Document 05.

A confirmation must state what will happen. For corrections, require a reason when specified by the business rules.

Confirmation dialogs must not replace backend authorization or validation.

## 27. Frontend Data Ownership

The frontend may own:
- Open/closed navigation state.
- Current search text.
- Selected filters and sorting.
- Form draft values.
- Current tab or selected date.
- Temporary modal state.

The backend owns:
- Student and related records.
- Authentication and authorization decisions.
- Financial balances.
- Package balances.
- Session state transitions.
- Validity of record relationships.
- Audit history.
- Import outcomes.

The frontend must not persist authoritative business records in browser storage as a substitute for the API.

## 28. UI Component Reuse

Create reusable components for repeated interface patterns where doing so improves consistency, including:
- Application shell and navigation.
- Page header.
- Search input and result list.
- Status label.
- Summary metric card.
- Data table patterns.
- Empty state.
- Error state.
- Loading indicator.
- Confirmation dialog.
- Form field and validation message.
- Date/time and currency display.

Do not build a generic design-system framework beyond the needs of this application. Component boundaries and filenames are specified in Document 08.

## 29. UI Analytics and Third-Party Services

Version 1 does not require third-party behavioral analytics.

Do not send student names, contact details, notes, meeting URLs, payment information, or authentication material to third-party analytics or logging services.

Any future analytics addition requires an explicit privacy and security review.

## 30. UI Acceptance Criteria

The frontend is acceptable when:

1. The administrator can navigate to all primary areas from a consistent shell.
2. Global search finds students through supported fields and opens the correct profile.
3. Student creation and editing show validation and handle failures safely.
4. The profile presents current summaries and historical records clearly.
5. Fees and payments are shown as distinct but related concepts.
6. A payment is not shown as saved until confirmed by the backend.
7. Package balances cannot be manually overwritten in the UI.
8. Class scheduling, cancellation, completion, and attendance reflect backend state.
9. Multiple meeting links can be viewed and the intended one can be opened safely.
10. Inactive students and historical records remain accessible.
11. Import preview and reconciliation distinguish imported, skipped, duplicate-review, and failed rows.
12. Reports clearly show their filters and date ranges.
13. All primary pages provide loading, empty, and failure states.
14. High-impact actions require appropriate confirmation.
15. The UI works at desktop, tablet, and mobile widths.
16. Keyboard focus, labels, validation messages, and status communication are accessible.
17. No protected page is exposed before authentication is resolved.
18. The frontend does not contain privileged credentials or direct spreadsheet access.
19. The implementation follows Document 08's single-purpose micro-file and under-150-line constraints for every file in src/ and public/.
20. All behavior is verified by the tests and acceptance criteria in Document 10.

## 31. Out of Scope for This Document

This document does not define:
- The authoritative spreadsheet column schema; see Document 04.
- Financial and class calculation rules; see Document 05.
- Exact API request and response shapes; see Document 06.
- Exact frontend directory and filename layout; see Document 08.
- Deployment secrets and environment configuration; see Document 11.

If a UI requirement conflicts with the backend contract, do not work around the backend. Resolve the conflict in the authoritative documents before implementation.

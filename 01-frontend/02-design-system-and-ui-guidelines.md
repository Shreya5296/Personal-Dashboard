# 02 — Design System and UI Guidelines

## 1. Purpose

Define the visual and interaction standards for the Student Management Dashboard. The interface is an efficient, private, admin-only tool for managing students, enrollments, fees, payments, packages, classes, meeting links, notes, and historical records.

This document governs visual presentation and interaction consistency. Product behavior is defined by the product requirements and page specifications; API and data rules remain authoritative in their respective documents.

## 2. Design Principles

1. **Clarity over decoration:** prioritize readable information and obvious actions.
2. **Fast daily workflows:** frequent actions should require few steps and minimal navigation.
3. **Consistent patterns:** equivalent actions should look and behave alike across pages.
4. **Financial accuracy:** amounts, due dates, balances, and payment status must be easy to distinguish.
5. **Privacy by default:** show only the data needed for the current task; do not expose records in public URLs or logs.
6. **Responsive, not mobile-first:** optimize the main workflow for desktop while keeping core tasks usable on smaller screens.
7. **Accessible by design:** support keyboard use, visible focus, sufficient contrast, and meaningful labels.
8. **No false certainty:** clearly distinguish saved data from unsaved edits, missing values, loading states, and errors.

## 3. Visual Direction

Use a calm, professional, low-distraction administrative interface. Prefer a neutral background, restrained accent color, clear typography, and compact but comfortable spacing. Avoid gradients, excessive shadows, decorative animation, oversized cards, and unnecessary illustrations.

The implementation should use a small set of design tokens rather than styling each page independently. Do not introduce a large UI framework solely for visual effects. A lightweight component library may be used only if it fits the approved frontend architecture and does not prevent accessible customization.

## 4. Design Tokens

Define tokens centrally and consume them consistently.

### 4.1 Color roles

Use semantic roles instead of hard-coding colors throughout components:

- `--color-background`: application canvas.
- `--color-surface`: cards, panels, menus, and form surfaces.
- `--color-surface-muted`: secondary panels and table headers.
- `--color-text`: primary readable text.
- `--color-text-muted`: secondary labels and helper text.
- `--color-border`: dividers and control outlines.
- `--color-primary`: primary actions and selected navigation.
- `--color-primary-foreground`: text on primary actions.
- `--color-success`: successful or settled state.
- `--color-warning`: due soon or needs attention.
- `--color-danger`: overdue, destructive, or failed state.
- `--color-info`: informational state.
- `--color-focus`: keyboard focus indicator.

Status must never be communicated by color alone; include text or an accessible label. Verify text and control contrast against WCAG AA targets.

### 4.2 Typography

Use a legible system sans-serif stack unless the project adopts a bundled font for a documented reason. Define tokens for:

- Page title
- Section heading
- Card or panel heading
- Body text
- Form label
- Helper and metadata text
- Table text
- Numeric and financial values

Use consistent weight and size hierarchy. Avoid tiny text for important financial information. Use tabular numerals for aligned monetary amounts where supported.

### 4.3 Spacing and shape

Use a consistent spacing scale based on small increments. Define shared tokens for control height, panel padding, page gutters, and gaps. Use modest corner radii and subtle borders. Shadows should indicate elevation only when needed, such as menus or dialogs.

### 4.4 Layout

- Use a persistent application shell with primary navigation and a clear page title.
- Keep page content within a readable maximum width where useful.
- Use full-width tables for dense administrative lists.
- Keep related actions close to the data they affect.
- Avoid nesting cards inside cards without a clear purpose.
- Preserve sufficient whitespace between unrelated sections.

## 5. Application Shell and Navigation

The shared shell should include:

- Application name or wordmark.
- Primary navigation for Dashboard, Students, Classes, Fees and Payments, Packages, Imports, and Reports where implemented.
- A visible current-page state.
- A global student search entry point.
- Administrator/session controls and sign-out.
- A main content region with page title and contextual actions.

Settings may be placed in a secondary navigation area. Do not add navigation items for features that are not implemented. On narrow screens, collapse navigation into an accessible menu without hiding the current page context.

## 6. Page Structure

Use a predictable page pattern:

1. Breadcrumb or section context when helpful.
2. Page title and short explanatory text when needed.
3. Primary action aligned consistently.
4. Optional summary metrics relevant to the page.
5. Search and filters immediately above the list they control.
6. Main content.
7. Pagination or load-more controls when required.

Do not add summary cards to every page by default. Use them only when they help the administrator make a decision or prioritize work.

## 7. Tables and Lists

Tables are the primary pattern for administrative records.

- Use clear, concise column headings.
- Align text fields left and numeric amounts right.
- Keep date formats consistent throughout the application.
- Use consistent status badges with both text and semantic styling.
- Provide a visible empty state when no records match.
- Keep row actions predictable and avoid crowded action columns.
- Use a detail page or side panel for long record information rather than adding every field to the list.
- Keep sorting and filtering state visible where practical.
- Do not rely on color alone to indicate overdue or inactive records.
- Ensure tables remain usable on smaller screens through responsive columns, horizontal scrolling, or an alternate compact layout.

For large lists, use pagination or a documented incremental-loading approach. Do not load unlimited history into the browser by default.

## 8. Forms and Editing

- Use persistent labels; placeholders are examples, not labels.
- Mark required fields clearly.
- Place field-specific validation messages near the relevant control.
- Explain unusual fields with short helper text.
- Group fields into meaningful sections.
- Preserve entered values when a validation error occurs.
- Disable duplicate submission while a mutation is in progress.
- Show a clear success or failure result after submission.
- Warn before leaving a form with unsaved changes when practical.
- Use suitable input types for dates, email addresses, phone numbers, and amounts.
- Do not silently coerce invalid monetary or date values.

Use explicit Save and Cancel actions for substantial edits. Inline editing is appropriate only for small, low-risk fields and must still show save status and errors.

## 9. Financial UI Rules

Financial information requires especially clear presentation.

- Display currency consistently as INR.
- Distinguish amount due, amount paid, and outstanding balance.
- Label the relevant due date explicitly.
- Display partial payment status distinctly from fully paid.
- Display overdue status with text and a semantic warning treatment.
- Do not present a missing amount as zero.
- Do not calculate authoritative balances solely in frontend components.
- Show transaction dates and amounts in payment history.
- Keep payment recording separate from editing a fee obligation.
- Require confirmation for voiding or correcting a financial record and explain that history is retained.
- Refresh displayed balances from the backend after a successful financial mutation.

Financial summaries should avoid ambiguous labels such as “Fees” when the value could mean total charges, amount collected, or outstanding amount.

## 10. Student Profile UI

The student profile should present the most operationally useful information first:

1. Student identity and active/inactive status.
2. Parent or guardian contact details.
3. Current enrollment and package summary.
4. Outstanding fees and recent payment activity.
5. Upcoming class and meeting-link action.
6. Class and attendance history.
7. Historical enrollments and packages.
8. Dated internal notes.

Use tabs or clearly separated sections if the profile becomes too long. Do not hide important warnings behind a secondary tab. Archived students must have an unmistakable inactive state, and reactivation must be a deliberate action.

## 11. Meeting-Link UI

- Display provider and a human-readable label beside each link.
- Clearly identify the preferred link without implying other active links are invalid.
- Offer an explicit “Join” or “Open meeting” action.
- Open external meeting URLs safely, preferably in a new tab with appropriate browser protections.
- Validate allowed URL schemes before rendering an actionable link.
- Show inactive or expired links as historical, not as default join actions.
- Do not silently choose an ambiguous link when a scheduled class has a specific assigned link.

## 12. Statuses and Feedback

Use consistent feedback patterns:

- Loading: indicate that data is being retrieved or saved.
- Empty: explain that no records exist or that filters found no matches.
- Success: confirm the completed action without excessive interruption.
- Validation error: identify the field or rule that needs correction.
- API error: explain what failed and whether the user can retry.
- Session expiry: direct the user to sign in again without exposing protected data.
- Conflict: explain when the record changed or the operation could not be safely applied.

Do not display raw stack traces, internal script errors, tokens, or sensitive payloads to users.

Use inline feedback for routine actions and dialogs for consequential actions. Avoid success dialogs for every minor update.

## 13. Dialogs and Destructive Actions

Use a confirmation dialog for actions such as:

- Archiving or reactivating a student when confirmation is warranted.
- Voiding a payment or fee obligation.
- Cancelling a class where the action affects class balances.
- Deactivating a meeting link currently assigned to a future class.
- Starting an import that will write records.

The dialog must describe the actual consequence and offer clear confirm/cancel choices. Prefer reversible status changes over deletion. Normal UI flows must not hard-delete students, payments, classes, or audit records.

## 14. Search and Filters

- Make global student search easy to reach.
- Support search by student name and stable student ID; add contact search only where appropriate.
- Debounce remote search if needed, without making the interface feel unresponsive.
- Keep active filters visible and easy to clear.
- Distinguish no results from a failed request.
- Preserve filters and pagination during a detail-to-list return where practical.
- Do not send unnecessary personal information to third-party search or analytics services.

## 15. Responsive Behavior

Desktop is the primary operating environment. At smaller widths:

- Navigation must collapse without losing access to sections.
- Forms must become single-column when needed.
- Summary metrics may wrap or simplify.
- Tables may hide low-priority columns or allow controlled horizontal scrolling.
- Primary actions must remain visible and reachable.
- Dialogs must fit within the viewport.
- Touch targets should be comfortably usable.

Responsive behavior must be tested at representative desktop, tablet, and mobile widths rather than relying on a single breakpoint assumption.

## 16. Accessibility

The frontend must:

- Use semantic HTML elements.
- Associate every input with a label.
- Support keyboard navigation for all interactive controls.
- Show a clear keyboard focus indicator.
- Maintain adequate contrast.
- Use buttons for actions and links for navigation.
- Provide accessible names for icon-only controls.
- Announce important asynchronous results and validation errors appropriately.
- Avoid conveying status through color alone.
- Respect reduced-motion preferences.
- Manage focus when dialogs open and close.

Accessibility checks must be included in the testing plan.

## 17. Motion and Animation

Keep motion minimal. Use short transitions only when they clarify state changes or navigation. Avoid animated dashboards, looping effects, and motion that delays routine work. Respect reduced-motion settings and ensure the interface remains understandable without animation.

## 18. Icons and Assets

Use one consistent icon set. Icons supplement text; they must not replace important action labels unless the control has an accessible name and its meaning is unambiguous. Avoid emoji as primary navigation or status indicators. Keep assets local or from approved sources; do not load tracking pixels or unnecessary third-party scripts.

## 19. Component Consistency

Reusable components should include, where needed:

- Button and icon button
- Text input, select, date input, and textarea
- Form field and validation message
- Status badge
- Data table and pagination
- Search and filter controls
- Summary metric
- Empty state
- Loading indicator
- Error message
- Confirmation dialog
- Toast or inline notification
- Page header
- Section panel

Components must remain small and single-purpose. Page-specific business logic must not be hidden inside generic visual components. The exact source layout is defined by the frontend file-architecture document.

## 20. UI State Rules

Every data-driven page must account for:

- Initial loading
- Loaded data
- Empty data
- Search with no matches
- Validation errors
- Request failure
- Expired session
- Saving or mutation in progress
- Successful mutation
- Conflict or stale data where applicable

Do not render stale data as freshly saved. If the application cannot confirm that a mutation succeeded, say so and provide a safe recovery path rather than claiming success.

## 21. Privacy in the Interface

- Do not place student names, phone numbers, payment data, or meeting URLs in query strings unless explicitly required and reviewed.
- Do not show sensitive details in browser notifications or page titles unnecessarily.
- Avoid logging form values in the browser console.
- Clear protected UI state on sign-out and authentication failure.
- Do not expose private records in public error pages.
- Treat meeting URLs as potentially sensitive because they may grant access to a class.

## 22. Performance Expectations

- Keep the initial page lightweight.
- Load detailed history only when requested or needed.
- Avoid unnecessary re-rendering of large tables.
- Use pagination or incremental loading for growing datasets.
- Show progress for operations that take noticeable time.
- Avoid decorative dependencies that materially increase bundle size.
- Never sacrifice server-side authorization for perceived performance.

Performance thresholds and test scenarios are defined in the testing document.

## 23. Design-System Acceptance Checklist

The UI is compliant when:

- Shared design tokens are used consistently.
- Navigation and page headers follow a common pattern.
- Tables, forms, status indicators, and feedback states are consistent.
- Financial values are clearly labeled and not ambiguously presented.
- Meeting links identify their provider and status.
- Active and archived students are visually distinguishable.
- Core workflows work at desktop and smaller viewport sizes.
- Keyboard focus and form labels are present.
- Important actions have appropriate confirmation and error handling.
- Loading, empty, failure, and success states are implemented.
- Sensitive data is not unnecessarily exposed in URLs, logs, or UI metadata.
- No page introduces an undocumented, competing design pattern.

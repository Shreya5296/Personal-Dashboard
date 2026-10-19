# 08 — Frontend File and Code Architecture

- **Status:** Architecture specification
- **Version:** 1.0.0
- **Applies to:** React + TypeScript + Vite frontend
- **Backend:** Google Apps Script Web App
- **Canonical data store:** Google Sheets, accessed only through the backend
- **Related documents:** 02-system-architecture.md, 03-security-and-authentication.md, 04-google-sheets-data-model.md, 05-business-rules-and-workflows.md, 06-apps-script-api-specification.md, 07-frontend-product-and-ui-specification.md, 09-data-import-and-migration.md, 10-testing-and-acceptance-criteria.md, 11-deployment-and-operations.md

## 1. Purpose

This document defines the required frontend directory structure, file responsibilities, module boundaries, naming conventions, and size limits. It is the authoritative source for the frontend source-code layout.

The goal is a small, understandable application whose files are easy for a coding agent or developer to locate, review, test, and change. This is deliberate modularity, not a framework for its own sake.

## 2. Mandatory Architecture Rules

1. Every domain within `src/` and `public/` must be represented by a directory containing single-purpose micro-files, where applicable.
2. Every text-based source or configuration file within `src/` and `public/` must remain **under 150 lines**; the maximum is 149 lines.
3. Binary assets such as images and fonts are not subject to a text-line count, but must remain individually named assets rather than bundled into an opaque catch-all file.
4. No catch-all files such as `actions.js`, `app.js`, `utils.ts`, `helpers.ts`, `common.ts`, or `misc.ts` that collect unrelated responsibilities.
5. No monolithic CSS files. Styles must be split by component, page, or small shared design responsibility.
6. Do not evade the line limit by compressing code onto long lines or by using unreadable one-line formatting.
7. Each file must have one clear reason to change.
8. Split files when they approach the limit, using meaningful responsibilities rather than arbitrary line chunks.
9. Do not create an abstraction or directory for a feature that does not exist in the product requirements.
10. Keep dependencies explicit. Avoid circular imports and hidden cross-domain coupling.
11. Do not put business rules in visual components.
12. Do not access Google Sheets directly from the browser.
13. Do not store secrets, service-account credentials, or privileged backend credentials in frontend files or environment variables exposed to the browser.
14. Any intentional exception must be documented and approved before implementation; the default is no exceptions to the source-file limit.

## 3. Technology and Build Conventions

- React with TypeScript.
- Vite for local development and production builds.
- React Router for page navigation if routing is needed; use the smallest suitable routing setup.
- Native `fetch` behind one API client unless a specific requirement justifies another library.
- Use the existing package manager lockfile consistently; do not mix package managers.
- Use CSS Modules or small, explicitly scoped CSS files. Do not introduce a large styling framework unless the UI specification requires it.
- Use semantic HTML and accessible form controls.
- Use strict TypeScript settings and avoid `any` unless a documented external boundary makes it unavoidable.
- Keep dependencies lean. Do not add global state libraries, form libraries, data-fetching libraries, or component frameworks by default. Add one only when a demonstrated requirement justifies it.

## 4. Required Frontend Directory Structure

The initial structure is intentionally limited to the first-release requirements. Add files when their corresponding feature is implemented, but preserve the domain boundaries and file-size rules.

    frontend/
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── .env.example
    ├── public/
    │   ├── icons/
    │   │   └── app-icon.svg
    │   └── images/
    │       └── .gitkeep
    └── src/
        ├── main.tsx
        ├── app/
        │   ├── App.tsx
        │   ├── AppProviders.tsx
        │   ├── appRoutes.tsx
        │   └── routeAccess.ts
        ├── config/
        │   ├── runtimeConfig.ts
        │   └── publicConfig.ts
        ├── api/
        │   ├── apiClient.ts
        │   ├── apiErrors.ts
        │   ├── apiResponse.ts
        │   └── requestId.ts
        ├── auth/
        │   ├── AuthProvider.tsx
        │   ├── authState.ts
        │   ├── signIn.ts
        │   ├── signOut.ts
        │   ├── identityToken.ts
        │   └── RequireAdmin.tsx
        ├── layout/
        │   ├── AppShell.tsx
        │   ├── Sidebar.tsx
        │   ├── TopBar.tsx
        │   ├── PageHeader.tsx
        │   └── layout.module.css
        ├── components/
        │   ├── buttons/
        │   │   ├── Button.tsx
        │   │   └── Button.module.css
        │   ├── feedback/
        │   │   ├── LoadingState.tsx
        │   │   ├── EmptyState.tsx
        │   │   ├── ErrorState.tsx
        │   │   ├── InlineNotice.tsx
        │   │   └── feedback.module.css
        │   ├── forms/
        │   │   ├── FormField.tsx
        │   │   ├── FormError.tsx
        │   │   └── forms.module.css
        │   ├── tables/
        │   │   ├── DataTable.tsx
        │   │   ├── TablePagination.tsx
        │   │   └── tables.module.css
        │   └── overlays/
        │       ├── ConfirmDialog.tsx
        │       └── confirmDialog.module.css
        ├── domains/
        │   ├── dashboard/
        │   │   ├── DashboardPage.tsx
        │   │   ├── DashboardSummary.tsx
        │   │   ├── dashboardApi.ts
        │   │   └── dashboardTypes.ts
        │   ├── students/
        │   │   ├── StudentsPage.tsx
        │   │   ├── StudentSearch.tsx
        │   │   ├── StudentList.tsx
        │   │   ├── StudentForm.tsx
        │   │   ├── StudentProfilePage.tsx
        │   │   ├── StudentSummary.tsx
        │   │   ├── studentApi.ts
        │   │   ├── studentTypes.ts
        │   │   └── studentValidation.ts
        │   ├── enrollments/
        │   │   ├── EnrollmentList.tsx
        │   │   ├── EnrollmentForm.tsx
        │   │   ├── enrollmentApi.ts
        │   │   └── enrollmentTypes.ts
        │   ├── packages/
        │   │   ├── PackageList.tsx
        │   │   ├── PackageForm.tsx
        │   │   ├── PackageBalance.tsx
        │   │   ├── packageApi.ts
        │   │   └── packageTypes.ts
        │   ├── fees/
        │   │   ├── FeesPage.tsx
        │   │   ├── FeeObligationList.tsx
        │   │   ├── FeeObligationForm.tsx
        │   │   ├── FeeStatus.tsx
        │   │   ├── feeApi.ts
        │   │   └── feeTypes.ts
        │   ├── payments/
        │   │   ├── PaymentList.tsx
        │   │   ├── PaymentForm.tsx
        │   │   ├── PaymentHistory.tsx
        │   │   ├── paymentApi.ts
        │   │   └── paymentTypes.ts
        │   ├── classes/
        │   │   ├── ClassesPage.tsx
        │   │   ├── ClassSchedule.tsx
        │   │   ├── ClassSessionForm.tsx
        │   │   ├── AttendanceControl.tsx
        │   │   ├── MeetingLinkAction.tsx
        │   │   ├── classApi.ts
        │   │   └── classTypes.ts
        │   ├── meeting-links/
        │   │   ├── MeetingLinkList.tsx
        │   │   ├── MeetingLinkForm.tsx
        │   │   ├── MeetingProviderLabel.tsx
        │   │   ├── meetingLinkApi.ts
        │   │   └── meetingLinkTypes.ts
        │   ├── notes/
        │   │   ├── StudentNotes.tsx
        │   │   ├── StudentNoteForm.tsx
        │   │   ├── noteApi.ts
        │   │   └── noteTypes.ts
        │   ├── imports/
        │   │   ├── ImportPage.tsx
        │   │   ├── ImportPreview.tsx
        │   │   ├── ImportResults.tsx
        │   │   ├── importApi.ts
        │   │   └── importTypes.ts
        │   ├── reports/
        │   │   ├── ReportsPage.tsx
        │   │   ├── ReportFilters.tsx
        │   │   ├── ExportAction.tsx
        │   │   ├── reportApi.ts
        │   │   └── reportTypes.ts
        │   └── settings/
        │       ├── SettingsPage.tsx
        │       ├── settingsApi.ts
        │       └── settingsTypes.ts
        ├── hooks/
        │   ├── useAsyncState.ts
        │   ├── useDebouncedValue.ts
        │   └── usePageTitle.ts
        ├── lib/
        │   ├── dateFormat.ts
        │   ├── currencyFormat.ts
        │   ├── urlSafety.ts
        │   └── textFormat.ts
        ├── styles/
        │   ├── tokens.css
        │   ├── reset.css
        │   └── global.css
        └── test/
            ├── setup.ts
            └── testIds.ts

This is a target structure, not an instruction to create empty files for every future possibility on day one. Files must be added as the corresponding feature is implemented. Every created file must have a clear responsibility and remain under the line limit.

## 5. Public Directory Rules

`public/` contains only static assets that Vite copies without processing.

- Use descriptive names for icons, images, and other assets.
- Group assets by purpose, not in a single catch-all directory.
- Do not place source code, API responses, student data, exports, or credentials in `public/`.
- Never put private student information in a public asset.
- Never put environment-specific secrets in static files.
- Keep SVG files small and single-purpose; split unrelated artwork into separate assets.
- Binary assets are exempt from the text line count, but must be individually named and reviewed.
- Do not create public folders for domains that have no assets yet.

The `.gitkeep` placeholder may be removed when a real asset is added. It is not a runtime dependency.

## 6. File Responsibility Rules

### 6.1 Application Entry and Routing

- `main.tsx`: mount the React root and import the minimum required global styles.
- `App.tsx`: compose the top-level application; do not contain domain business logic.
- `AppProviders.tsx`: compose only the providers actually required.
- `appRoutes.tsx`: define route-to-page mapping.
- `routeAccess.ts`: describe client-side route access requirements.
- `RequireAdmin.tsx`: gate the authenticated UI for usability. This is not a substitute for backend authorization.

No file may become a general-purpose container for unrelated routes, services, and business rules.

### 6.2 API Layer

- `apiClient.ts`: centralize transport, base URL use, headers, serialization, and response parsing.
- `apiErrors.ts`: define normalized frontend API errors.
- `apiResponse.ts`: define and validate the common response envelope.
- `requestId.ts`: create or propagate request correlation identifiers where supported.
- Domain `*Api.ts` files: expose named operations for one domain and call the central API client.

Domain API modules must not duplicate authentication, transport, or response-parsing logic.

### 6.3 Authentication

Authentication modules handle the selected identity-provider flow and frontend session state only. They must not decide that a user is authorized based solely on browser state. Every protected backend operation must independently verify identity and authorization.

Token handling must follow Document 03. Tokens must not be placed in URLs, logs, analytics, or error messages. The implementation must validate the chosen Apps Script integration before real student data is used.

### 6.4 Domain Modules

Each domain directory owns its own:
- Page-level UI for that domain.
- Domain-specific components.
- API wrapper functions.
- TypeScript types for domain records and operations.
- Client-side form validation where useful.

Domain modules may import shared UI components and explicitly shared libraries. They must not reach into another domain's private implementation files. Cross-domain workflows should be composed at the page or application-service boundary and remain small.

### 6.5 Shared Components

A shared component is justified only when it is used in more than one domain or represents a genuine application-wide pattern. Avoid creating generic abstractions for a single use case.

Shared components must not contain student-specific business rules, fee calculations, package calculations, or backend authorization logic.

### 6.6 Hooks and Libraries

- `hooks/` contains small reusable React hooks with one responsibility each.
- `lib/` contains small, framework-independent helpers with specific purposes.
- Domain-specific calculations and policies must live in domain modules or be returned by the authoritative backend, not be hidden in generic helpers.
- Do not use `lib/` as a replacement for a properly named domain directory.
- Do not add a helper to `lib/` merely to avoid writing a few clear lines in one component.

### 6.7 Styles

- `tokens.css`: design tokens such as colors, spacing, and typography variables.
- `reset.css`: minimal browser reset rules.
- `global.css`: genuinely global styles only.
- `*.module.css`: styles scoped to the associated component or small component family.

Every CSS file must remain below 150 lines. Split styles by component or visual responsibility when needed. Do not create a single application-wide stylesheet containing all pages and components.

## 7. Naming Conventions

- React components and page components: PascalCase, e.g. `StudentProfilePage.tsx`.
- Hooks: camelCase and start with `use`, e.g. `useDebouncedValue.ts`.
- API modules: domain name plus `Api`, e.g. `studentApi.ts`.
- Type modules: domain name plus `Types`, e.g. `studentTypes.ts`.
- Validation modules: domain name plus `Validation`, e.g. `studentValidation.ts`.
- CSS Modules: component name plus `.module.css`.
- Non-component TypeScript modules: camelCase with a descriptive name.
- Test files: match the subject and use the test runner's conventional suffix.
- Avoid vague names such as `data.ts`, `manager.ts`, `misc.ts`, or `common.ts`.

Use consistent singular/plural naming within a domain. The API operation names and record fields must follow Document 06 and Document 04 rather than inventing frontend-only alternatives.

## 8. Type and Data Boundaries

1. Keep frontend types aligned with the documented API contract.
2. Do not copy spreadsheet row structures directly into UI components.
3. Use explicit API response and domain types.
4. Treat network responses as untrusted input until their structure has been checked.
5. Represent loading, success, empty, and error states explicitly.
6. Do not infer a successful save from a button click or optimistic UI update.
7. Keep display formatting separate from persisted values.
8. Keep currency values numeric in the data model and format them only for display.
9. Keep dates and timestamps distinct; do not silently interpret a calendar date as a UTC timestamp.
10. Do not implement authoritative fee or package balance rules independently in the frontend. The frontend may display backend-calculated values and use lightweight previews only when clearly labeled and reconciled with the backend.

## 9. State Management

Use local React state for local UI interactions by default.

Use a small, explicit provider only for application-wide state that genuinely needs to be shared, such as authentication state.

Do not introduce a global state library for the initial release without a demonstrated need.

- Search input state belongs near the search interface.
- Form draft state belongs to its form.
- Server data must have an explicit loading and refresh strategy.
- Successful mutations must refresh or invalidate affected data.
- Errors must be visible and recoverable.
- Avoid duplicating server data in several unrelated state stores.
- Avoid caching sensitive student data beyond what the active screen needs.

## 10. Forms and Mutations

- Keep each form focused on one record type or one clearly defined workflow.
- Separate reusable field components from domain forms.
- Validate user input for usability, but rely on backend validation for correctness and security.
- Disable or guard repeated submission while a mutation is in progress.
- Use idempotency support from the API when the operation and backend contract provide it.
- Show a clear result after the backend responds.
- Preserve entered values when safe to do so after recoverable validation errors.
- Confirm archiving, voiding, and other significant operations.
- Never silently discard unsaved changes when practical safeguards can prevent it.

## 11. Meeting Link Handling

Meeting-link UI must use the documented meeting-link domain types and API operations.

- Render meeting URLs as links or explicit join controls, not injected HTML.
- Permit only approved URL schemes, normally HTTPS.
- Use the shared URL-safety helper for basic client-side checks.
- Treat client-side URL validation as a usability safeguard, not a security boundary.
- Label Zoom, Google Meet, and other providers clearly.
- Never navigate automatically to an untrusted URL.
- Do not assume that a student's preferred link is always the correct link for every class session.

## 12. Error Handling and User Feedback

- The API client converts transport and response failures into a consistent error form.
- Domain pages decide how to explain errors in their context.
- Shared feedback components handle common visual patterns only.
- Do not display stack traces, internal spreadsheet details, tokens, or sensitive backend diagnostics to the user.
- Distinguish authentication expiry, permission denial, validation failure, conflict, and temporary service failure when the API provides those categories.
- If a mutation result is uncertain because the connection failed, do not claim that it failed or succeeded without checking. Provide a safe retry or refresh path appropriate to the operation.

## 13. Testing Structure

Tests must be colocated with the relevant module or placed in a clear domain-specific test directory. Do not create one enormous test file.

At minimum, cover:
- API response parsing and error normalization.
- Authentication UI states.
- Student search and profile rendering.
- Form validation and mutation feedback.
- Payment and package displays using backend-provided values.
- Meeting URL safety behavior.
- Archive/reactivation user flows.
- Import preview and reconciliation states.
- Accessibility and navigation behavior for critical flows.

The test runner and exact test commands are specified in Document 10 and deployment requirements in Document 11.

## 14. Environment Configuration

Only public frontend configuration may be exposed through Vite's client environment variables.

- `VITE_` variables are public after bundling and must never contain secrets.
- `.env.example` documents required variable names and safe example values.
- Local `.env` files containing environment-specific values must be excluded from version control.
- The Apps Script endpoint and public OAuth client identifier may be configured for the frontend if they are intended to be public identifiers.
- Spreadsheet IDs, private keys, privileged credentials, and admin secrets must not be exposed through frontend variables.
- Validate required configuration at startup and show a safe configuration error when missing.

## 15. Accessibility and Responsive UI

- Use semantic headings, labels, buttons, links, tables, and form controls.
- Ensure visible keyboard focus.
- Do not communicate status by color alone.
- Provide accessible labels for icon-only controls.
- Use confirmation dialogs that can be operated by keyboard.
- Keep important student, payment, and class information usable on smaller screens.
- Avoid horizontal overflow where a responsive layout or controlled table container can solve it.
- Follow the detailed visual and interaction requirements in Document 07.

## 16. File Size Enforcement

Every text-based file in `src/` and `public/` must be checked for a maximum of 149 lines.

The implementation workflow must:
1. Run a line-count check before considering a frontend change complete.
2. Split any file with 150 or more lines.
3. Review whether each file still has one clear responsibility.
4. Avoid splitting a cohesive short component merely to satisfy arbitrary folder counts.
5. Avoid generating files with only boilerplate or empty exports.
6. Include this constraint in coding-agent instructions and acceptance checks.

A simple repository script or CI check may enforce the limit. It must exclude binary assets and should report the exact path and line count for each violation. The check itself must also be maintained as a small, single-purpose file outside `src/` and `public/` if its size or tooling warrants a script.

## 17. Dependency and Abstraction Policy

Before adding a dependency, confirm that it solves a concrete requirement not already handled simply by the existing stack.

Avoid introducing:
- Multiple competing styling systems.
- Multiple API clients.
- Multiple state management approaches.
- Duplicate date or currency libraries without need.
- A component framework solely for a few basic controls.
- An elaborate frontend service layer that only forwards function calls without adding validation or meaning.

Prefer the smallest understandable solution that meets the product requirements and security constraints.

## 18. Definition of Done for a Frontend Change

A frontend change is complete only when:
- It follows the documented domain boundaries.
- Each changed file has one clear responsibility.
- All text source files in `src/` and `public/` remain under 150 lines.
- No catch-all module or monolithic stylesheet has been introduced.
- Types match the API contract.
- Loading, empty, success, and error states are handled where applicable.
- Sensitive data is not exposed through public assets, logs, URLs, or frontend configuration.
- Relevant tests pass.
- Keyboard and responsive behavior remain usable.
- The relevant architecture or UI document is updated if the change alters an agreed contract.

## 19. Prohibited Shortcuts

The implementation agent must not:
- Put the entire application in `App.tsx`.
- Put all API operations in one `actions.ts` or `api.ts` file.
- Put all pages in one component file.
- Put all styling in one stylesheet.
- Use spreadsheet row numbers as record IDs.
- access Google Sheets directly from browser code.
- hard-code production credentials or private IDs into public assets.
- trust frontend-only authorization checks.
- silently add a second backend or database.
- invent undocumented API operations or record fields.
- suppress TypeScript errors to make the build pass.
- compress code to meet the line limit instead of splitting by responsibility.

## 20. Acceptance Criteria

The frontend architecture is accepted when:
- The directory structure is domain-oriented and understandable.
- Every text source file in `src/` and `public/` is below 150 lines.
- Every module has a clear, limited responsibility.
- API transport is centralized and domain API modules are separate.
- Domain UI, types, and API operations are separated appropriately.
- Styles are scoped and no monolithic stylesheet exists.
- Authentication state is distinct from backend authorization.
- No direct browser access to the master spreadsheet exists.
- The structure supports the screens and workflows in Document 07.
- Tests and CI or local checks can identify file-size violations.
- No unnecessary folders, libraries, or architectural layers have been added.

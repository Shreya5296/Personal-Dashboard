# 04 — Frontend State and Data Flow

## 1. Purpose

Define how the React frontend stores temporary UI state, requests server data, submits changes, handles failures, and keeps displayed records consistent with the Google Sheets-backed system.

This document complements the frontend requirements, design system, page/component specification, backend API specification, and security specification. Those documents remain authoritative for their own domains.

## 2. Core Principles

1. The backend is the source of truth for persisted records and business calculations.
2. Frontend state is a view of server data, never a replacement database.
3. Do not duplicate server-derived financial or class-balance calculations in the browser.
4. Keep state close to the component or domain that owns it.
5. Share state only when multiple parts of the UI genuinely need it.
6. Do not introduce a global state library unless implementation evidence shows React state and small domain hooks are insufficient.
7. Do not persist private student or financial records in localStorage or sessionStorage.
8. Never treat client-side state as proof of authentication or authorization.
9. A mutation is successful only after the backend confirms success.
10. Show explicit loading, empty, error, and success states.

## 3. State Categories

### 3.1 Local UI State

Keep transient presentation state inside the relevant page or component:

- Open/closed dialog or drawer
- Current tab within a profile
- Expanded table row
- Unsaved form input
- Field-level validation messages
- Temporary confirmation state
- Local sorting and presentation preferences that do not need persistence

Do not place these values in global state without a demonstrated need.

### 3.2 URL State

Use URL search parameters for navigational state that should survive refresh or be shareable within the private application, where appropriate:

- Student directory search query
- Student directory filters
- Page number or cursor
- Selected student ID when represented as a route

Do not put personal details, payment amounts, meeting URLs, tokens, or other sensitive values in URLs.

### 3.3 Server State

Server state includes records fetched from the API:

- Dashboard metrics
- Student directory results
- Student profile and related records
- Enrollments and packages
- Fee obligations and payment history
- Class sessions and attendance
- Meeting links
- Import status and row-level results
- Reports and configuration

Server state may be held in memory for rendering and navigation, but it must be refreshed or invalidated after relevant mutations. Do not persist it to browser storage.

### 3.4 Authentication State

Keep only the minimum session information required by the approved authentication integration. The backend verifies identity and authorization on every protected operation.

Authentication state must support:

- Initial session resolution
- Authenticated state
- Unauthenticated state
- Session expiry or invalidation
- Sign-out
- Authentication-service failure

Do not store privileged credentials in frontend code or treat a client-side `isAdmin` flag as authorization.

## 4. Recommended State Structure

Use React component state and small, domain-specific hooks. Keep the implementation intentionally lightweight.

Suggested responsibilities:

- `auth`: current authentication status and sign-in/sign-out actions
- `students`: student list query state and profile data access
- `fees`: fee-obligation and payment data access
- `packages`: package data access and display state
- `classes`: schedule, session, and attendance data access
- `meeting-links`: meeting-link data access
- `imports`: import job and reconciliation state
- `shared`: API status and small reusable UI state only when justified

These are conceptual domains. The exact source-file tree is defined by the code-architecture document. Do not create one catch-all state file.

## 5. Data Request Flow

For a page that needs server data:

1. The route renders the page shell.
2. The page invokes its domain hook or data service.
3. The domain service calls the centralized API client.
4. The API client attaches the approved authentication material.
5. The backend authenticates, authorizes, validates, and executes the request.
6. The API client validates the response envelope and normalizes errors.
7. The domain hook exposes loading, data, and error state.
8. The page renders the appropriate state.

The frontend must not call Google Sheets directly or bypass the API client for protected data.

## 6. Loading, Empty, and Error States

Every server-driven view must distinguish:

- Initial loading: no successful result has been loaded yet.
- Loaded with data: records are available.
- Loaded empty: the request succeeded and returned no records.
- Failed: the request did not succeed.
- Refreshing: prior data may remain visible while a refresh runs, if doing so is safe and clearly communicated.

Do not display an empty-state message for an API failure. Do not display zero balances when the balance request failed. Never silently replace failed data with invented defaults.

Errors should be phrased for the administrator and should not expose stack traces, tokens, spreadsheet identifiers, or sensitive backend details.

## 7. Mutation Flow

For create, update, archive, payment, attendance, or other state-changing operations:

1. Validate basic input in the UI for immediate feedback.
2. Disable duplicate submission while the request is pending.
3. Submit the request with a unique request/idempotency identifier where the API contract requires it.
4. Show pending state and prevent accidental repeated activation.
5. Wait for the backend response.
6. On success, use the canonical returned record when available.
7. Invalidate or refresh all affected server data.
8. Show a clear success message.
9. On failure, preserve the user's form input where safe and display the actionable error.
10. Never show success before the backend confirms persistence.

Financial mutations must follow the financial API contract. Do not optimistically change a displayed paid amount or balance before server confirmation.

## 8. Data Refresh and Invalidation

After a successful mutation, refresh every view that depends on the changed data.

Examples:

- Student profile update: refresh profile and any visible directory row using that student.
- Payment recorded or voided: refresh payment history, fee obligation, student financial summary, and dashboard metrics that include the affected amount.
- Package changed: refresh package detail and relevant class-balance summaries.
- Session completed or attendance changed: refresh session history and package balance.
- Meeting link changed: refresh the student's meeting-link list and any affected session detail.
- Student archived or reactivated: refresh directory results, profile status, and relevant dashboard counts.
- Import completed: refresh import results and any directory or summary views affected by imported records.

Keep invalidation explicit and domain-specific. Avoid a full application reload for every mutation unless a specific integration limitation makes it necessary.

## 9. Search, Filters, and Pagination

- Keep search and filter state close to the directory page and synchronize it with the URL when useful.
- Debounce text search if it triggers remote requests frequently.
- Cancel or ignore stale requests when the user changes search terms quickly.
- Do not allow an older response to overwrite results for a newer query.
- Reset pagination when filters make the current page invalid.
- Use backend-supported pagination for larger lists.
- Do not fetch the entire payment or class history merely to render a summary.
- Preserve stable record IDs as UI keys; never use row position as identity.

## 10. Forms and Unsaved Changes

- Keep draft form values local until submitted.
- Separate draft values from persisted server records.
- Validate required fields and formats before submission.
- Show field-specific errors where possible.
- Preserve safe user input when a request fails.
- Reset a form only after successful creation or an explicit cancellation.
- Warn before discarding substantial unsaved edits when appropriate.
- Re-fetch or reconcile a record if the backend reports a conflict or stale update.

The backend remains responsible for final validation and business rules.

## 11. Concurrent Requests and Stale Responses

- Track requests by domain and relevant record or query key.
- Prevent stale responses from replacing newer state.
- Use cancellation when supported; otherwise ignore responses that no longer match the active request.
- Avoid starting duplicate identical requests unnecessarily.
- Do not assume that a request timeout means the mutation definitely failed; where the API supports idempotency or operation lookup, use that contract before retrying a financial mutation.
- Display a clear recovery path when the outcome of a mutation is uncertain.

## 12. Authentication Transitions

When the session is being resolved, show a neutral loading state rather than briefly rendering protected content.

When the user signs out or the session becomes invalid:

1. Clear in-memory protected server data.
2. Stop rendering protected routes.
3. Clear authentication state using the approved provider flow.
4. Return the user to the sign-in screen.
5. Ensure later requests cannot reuse stale client authorization state.

A failed request must not automatically trigger endless login redirects. Handle authentication errors centrally and distinguish them from network and server errors.

## 13. Meeting-Link Actions

Meeting links are fetched from the backend like other protected records.

- Display provider and label alongside each link.
- Validate the URL before making it actionable.
- Open the selected link only after an explicit user action.
- Use safe new-tab behavior when opening an external meeting URL.
- Do not store meeting URLs in analytics, logs, or URL query parameters.
- Refresh links after edits, deactivation, or preference changes.

## 14. Caching and Browser Persistence

Version 1 does not require a persistent client cache.

- In-memory caching may be used to avoid unnecessary repeat requests.
- Every cache must have a defined invalidation rule.
- Financial summaries and class balances must be refreshed after related mutations.
- Do not persist private records in localStorage, sessionStorage, IndexedDB, or service-worker caches.
- Do not cache authenticated API responses in a public or shared cache.
- Any later offline mode requires a separate security and consistency review.

## 15. Observability

Frontend diagnostics may record:

- Operation category
- Request/correlation ID
- Error category
- Duration
- Whether a retry occurred

Do not log authentication tokens, full request payloads, student contact details, payment details, notes, or meeting URLs. No third-party analytics service is required for Version 1.

## 16. Testing Requirements

Tests must cover:

- Initial loading, empty, success, and failure states.
- API response parsing and malformed responses.
- Authentication expiry and sign-out cleanup.
- Duplicate-submit prevention for financial actions.
- Data refresh after every major mutation type.
- Stale search responses arriving out of order.
- Pagination and filter changes.
- Preservation of form input after recoverable errors.
- No false success state when persistence fails.
- No sensitive record persistence in browser storage.
- Correct invalidation of payment, package, class, and dashboard views.

## 17. Acceptance Criteria

The frontend state and data-flow implementation is accepted when:

1. All protected data comes through the centralized API client.
2. The backend remains authoritative for permissions and calculations.
3. Every server-driven view has explicit loading, empty, and error states.
4. Mutations wait for server confirmation before showing success.
5. Related views refresh after successful mutations.
6. Stale requests cannot overwrite newer query results.
7. Authentication transitions clear protected in-memory data.
8. No private student or financial records are persisted in browser storage.
9. Financial actions do not rely on optimistic balance changes.
10. The implementation follows the single-purpose micro-file and under-150-line source-file constraints.

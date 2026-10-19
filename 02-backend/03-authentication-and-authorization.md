# 03 — Authentication and Authorization

## 1. Purpose and Scope

This document defines how the Student Management Dashboard authenticates its single administrator and protects all student, parent, class, meeting-link, and financial data.

Version 1 is a private, single-administrator application. It does not implement student accounts, parent accounts, staff accounts, public access, or multi-tenant authorization.

Authentication establishes who is making a request. Authorization determines whether that verified identity is permitted to perform the requested operation. Both checks are mandatory on the backend.

## 2. Security Principles

1. Deny access by default.
2. Authenticate every protected API request, including reads.
3. Enforce authorization on the server; frontend route guards are usability controls only.
4. Never trust an email address, role, or `isAdmin` flag supplied in an ordinary request payload.
5. Keep the master Google Spreadsheet private.
6. Do not embed privileged credentials or secrets in frontend code, build-time public variables, URLs, or Git history.
7. Fail closed if identity verification or required authorization configuration is unavailable.
8. Do not log access tokens, full authentication headers, or unnecessary personal or financial data.
9. Use HTTPS for all production traffic.
10. Do not introduce an insecure workaround to make cross-origin requests appear to work.

## 3. Supported Identity Model

The only permitted application role in Version 1 is `ADMIN`.

The administrator must sign in using an approved Google identity flow. The backend must verify the identity using a supported, documented Google token-verification mechanism and an explicitly configured OAuth client audience.

The backend must check, as applicable to the selected token type:

- Signature or trusted verification result.
- Issuer.
- Audience / OAuth client ID.
- Expiration time.
- Issued-at time and other relevant temporal claims.
- Verified email status when email is used for allowlisting.
- Exact administrator email against the server-controlled allowlist.

Do not treat decoding a JWT as verification. Do not accept a token merely because its payload contains an expected email address.

The administrator allowlist must be held in protected backend configuration, not in a spreadsheet tab editable through the application. If the allowlist is empty or malformed, protected operations must be denied.

## 4. Authentication Flow

1. The unauthenticated user opens the frontend.
2. The frontend initiates Google sign-in using the configured client ID and approved redirect/origin settings.
3. Google returns identity material according to the selected sign-in flow.
4. The frontend sends the identity token to the backend using the transport validated in the integration proof.
5. The backend verifies the token and its claims with a trusted mechanism.
6. The backend checks the verified identity against the administrator allowlist.
7. If verification succeeds, the backend processes only the requested, explicitly supported operation.
8. If any check fails, the backend returns a generic authentication or authorization error without exposing sensitive verification details.
9. The frontend renders protected data only after a successful authorized API response.

The frontend must not infer access from a successful Google sign-in alone. A valid Google account that is not allowlisted is not an application administrator.

## 5. Authentication Material and Session Handling

The implementation must choose and document one supported token/session strategy before production use. It must not combine incompatible strategies or invent a custom authentication protocol.

Requirements:

- Use short-lived identity tokens where the chosen Google flow supports them.
- Validate tokens on the backend for each protected request, unless a separately specified server-verified session mechanism is implemented.
- Do not place tokens in query strings, URL fragments sent to backend endpoints, logs, analytics, or error reports.
- Do not store Google client secrets in the browser.
- Do not store privileged service credentials in `localStorage` or `sessionStorage`.
- If browser persistence is needed for non-secret UI state, keep it separate from authorization decisions.
- Clear in-memory authentication state and sensitive page data on sign-out.
- Handle expired tokens by requiring a supported re-authentication or refresh flow.
- Never downgrade to anonymous access after a token expires.
- Do not claim that clearing frontend state invalidates an already issued identity token; backend verification and token expiry remain authoritative.

If the selected flow requires a long-lived application session, its issuance, expiry, revocation, storage, and validation rules must be specified and reviewed before implementation. Do not invent a session cookie or bearer-token scheme without defining its security properties.

## 6. Authorization Rules

Every API operation must declare whether it is public or protected. Version 1 should expose no student or operational data publicly. Any public health check must return only non-sensitive service status and must not reveal configuration, spreadsheet IDs, or data counts.

Protected operations include, at minimum:

- Reading dashboard summaries.
- Listing or searching students.
- Reading student profiles and notes.
- Reading enrollments, packages, fee obligations, and payments.
- Reading class sessions, attendance, and meeting links.
- Creating, editing, archiving, or reactivating records.
- Importing or exporting data.
- Reading audit history.
- Reading or changing application settings.

For each request, the backend must:

1. Resolve the operation from an explicit allowlist.
2. Verify the caller's identity.
3. Confirm that the verified identity is the configured administrator.
4. Validate the request schema and identifiers.
5. Apply business rules and record-level relationship checks.
6. Execute the operation only after all required checks pass.

Unknown operations, missing credentials, invalid tokens, unauthorized identities, malformed payloads, and invalid record relationships must be rejected. A frontend-only permission check is never sufficient.

## 7. Google Apps Script Execution and Access

The Apps Script deployment identity and deployment settings must be selected deliberately. The application must not assume that deploying a Web App automatically makes every request authenticated.

Before production, document and verify:

- Who the Apps Script Web App executes as.
- Who is allowed to invoke the Web App at the Google deployment layer.
- How the backend obtains and verifies the end-user identity.
- How the backend accesses the private spreadsheet.
- Whether the chosen deployment mode permits the required identity verification and browser request flow.

If the deployment executes as its owner, spreadsheet permissions may be broader than the caller's permissions. Therefore, backend authorization is mandatory and the Web App endpoint must not be treated as private merely because the spreadsheet itself is private.

Do not assume that `Session.getActiveUser().getEmail()` always returns a usable identity in every deployment context. Verify its behavior for the exact deployment model. If it cannot reliably identify the caller, use the approved token-verification design instead.

## 8. Cross-Origin and Transport Requirements

The frontend is hosted separately from the Apps Script backend. The browser integration must be proven before real student data is used.

The proof must verify:

- HTTPS transport.
- Actual browser behavior from the deployed frontend origin.
- Whether required headers and request methods trigger a preflight request.
- Apps Script redirect behavior and final response readability.
- Token transport and server-side verification.
- Success, error, and expired-token responses.
- That authentication failures never expose protected response data.

Do not disable browser security, use JSONP for private data, place bearer tokens in URLs, or treat a permissive CORS response as authentication.

If the required authenticated browser request cannot be supported reliably by the chosen Apps Script deployment, stop and resolve the architecture before implementation continues. Any alternative must be documented and approved; it must not silently add an insecure proxy or new infrastructure.

## 9. Spreadsheet and Secret Protection

The master spreadsheet must not be published to the web or shared publicly. Its sharing permissions must be limited to explicitly authorized accounts and the backend execution identity that requires access.

The spreadsheet ID is not a password. Its confidentiality is useful but is not an access-control mechanism.

The following must never appear in frontend source, public build variables, or committed files:

- Google OAuth client secrets.
- Private API keys or service credentials.
- Session-signing secrets, if any are introduced by an approved design.
- Production spreadsheet access credentials.
- Tokens or exported authentication headers.

Only configuration values explicitly classified as public may be included in the frontend build. Production and development configuration must be separated.

## 10. Request Validation and Abuse Controls

Authentication does not make input safe. The backend must validate every request independently.

Validate:

- Operation names against an allowlist.
- Required and permitted fields.
- Field types and maximum lengths.
- ID format and existence.
- Dates, timestamps, numeric amounts, and enum values.
- Student-to-enrollment, student-to-package, and student-to-payment relationships.
- Meeting URL scheme and provider expectations.
- State transitions, such as archiving or voiding.
- Import size and supported source structure.

Use reasonable payload-size limits and pagination for list operations. Avoid unbounded full-database responses. Add basic abuse protection appropriate to Apps Script quotas and the expected single-admin workload; do not build a complex rate-limiting subsystem without evidence that it is needed.

## 11. Meeting URL Safety

Meeting URLs are untrusted data until validated.

- Permit HTTPS URLs for normal meeting links.
- Reject dangerous schemes such as `javascript:` and `data:`.
- Do not render stored URLs as raw HTML.
- Validate known Zoom and Google Meet hostnames when a provider is selected.
- If an `OTHER` provider is allowed, require a safe HTTPS URL and make the provider explicit in the UI.
- Do not silently open a malformed or disallowed URL.
- Use safe external-link behavior in the browser.

A valid HTTPS URL is not a guarantee that a meeting is legitimate; the administrator remains responsible for the link's destination.

## 12. Logging and Error Responses

Logs may include a request ID, operation name, timestamp, outcome, error category, and execution duration. Record identifiers only where operationally necessary.

Do not log:

- Identity tokens or authorization headers.
- Passwords or client secrets.
- Complete request bodies by default.
- Unnecessary student or parent contact information.
- Full payment details unless required for a specific, protected audit purpose.

Client-facing errors must be useful but generic enough not to reveal internal configuration. Detailed diagnostic information may be written to restricted server logs without secrets or unnecessary personal data.

Every error response must use the common envelope defined in the API specification. Authentication and authorization failures must have stable error codes, but must not disclose token-validation internals.

## 13. Audit Requirements

Important mutations must generate an audit record, including:

- Student creation, profile updates, archiving, and reactivation.
- Enrollment and package changes.
- Fee obligation creation, changes, and voiding.
- Payment recording, correction, and voiding.
- Class scheduling, rescheduling, cancellation, completion, and attendance changes.
- Meeting-link creation, changes, and deactivation.
- Import execution and row-level outcomes.
- Data exports and privileged configuration changes.

Audit entries must identify the verified actor, action, entity, timestamp, outcome, and a safe change summary. Avoid copying full sensitive records into audit fields.

The implementation must define how audit failures interact with important writes. It must not report a mutation as successful if the required write failed. Where Google Sheets cannot guarantee an atomic write across data and audit tabs, document the recovery and reconciliation behavior.

## 14. Sign-Out and Access Revocation

Sign-out must clear frontend authentication state and protected data held in memory. Subsequent protected requests must require valid authentication again.

To revoke access from the application, remove the identity from the backend administrator allowlist and redeploy or update protected configuration through the documented procedure. Access revocation must not depend on hiding the frontend route.

The implementation must document how quickly a changed allowlist takes effect and whether configuration caching exists. Prefer no cache for the single-admin allowlist unless caching is necessary and has a defined invalidation strategy.

## 15. Security Test Requirements

The test suite must verify at least the following:

1. Anonymous reads of student data are rejected.
2. Anonymous writes are rejected.
3. A valid Google identity not in the allowlist is rejected.
4. A forged email field does not grant access.
5. An unsigned, malformed, expired, or incorrectly targeted token is rejected.
6. Token verification service failure results in denial, not fallback access.
7. Unknown API operations are rejected.
8. Missing or malformed authorization configuration results in denial.
9. The spreadsheet is not publicly accessible.
10. No secret is embedded in the frontend production bundle.
11. Tokens do not appear in URLs or logs.
12. Unsafe meeting URL schemes are rejected.
13. Invalid foreign-key relationships are rejected.
14. Financial mutations preserve required audit history.
15. Browser cross-origin failures do not expose protected data.
16. Sign-out clears protected UI state.
17. An identity removed from the allowlist loses access according to the documented revocation behavior.

## 16. Release Gate

Real student data must not be imported until all of the following are true:

- The chosen Google sign-in flow is implemented and documented.
- Backend token verification has automated or repeatable tests.
- The administrator allowlist is stored in protected configuration.
- Every protected API operation enforces authentication and authorization.
- Spreadsheet sharing and Apps Script deployment settings are reviewed.
- The cross-origin integration proof passes in a real browser.
- Error handling and logs have been reviewed for sensitive-data leakage.
- Security tests pass in the deployed environment.
- Backup and recovery procedures are available.

## 17. Explicit Non-Goals

Version 1 does not implement:

- Student or parent accounts.
- Staff roles or complex role-based access control.
- Multi-tenant isolation.
- Public access to student data.
- A custom password database.
- A home-grown identity provider.
- A complex security analytics platform.

Any future expansion of the user model requires a separate authorization design and must not be implemented by merely adding more frontend routes.

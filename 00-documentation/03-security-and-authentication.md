# 03 — Security and Authentication

**Project:** Student Management Dashboard  
**Document:** `03-security-and-authentication.md`  
**Status:** Architecture specification  
**Version:** 1.0.0  
**Applies to:** React + TypeScript + Vite frontend, Google Apps Script backend, private Google Sheets datastore  
**Primary user model:** One authorized administrator

## 1. Purpose

This document defines the security and authentication requirements for the Student Management Dashboard. The application stores children's personal information, parent or guardian contact details, class schedules, meeting links, and financial records. These records must remain private and must be accessible only to the authorized administrator.

Security is enforced by the backend and the Google account permissions protecting the datastore. Frontend route guards and hidden UI elements improve usability but are not security controls.

## 2. Security Goals

The implementation must:

1. Allow access only to the explicitly authorized administrator.
2. Authenticate and authorize every protected API operation, including reads.
3. Keep the master spreadsheet private and inaccessible directly from the browser.
4. Keep privileged credentials and secrets out of frontend code and source control.
5. Validate all inputs and enforce business rules on the server.
6. Preserve financial and operational history through auditable corrections.
7. Avoid leaking personal information through logs, URLs, errors, or analytics.
8. Fail closed when identity verification or authorization cannot be completed.
9. Provide a documented backup and recovery process.
10. Validate the security of the browser-to-Apps-Script integration before real data is imported.

## 3. Threat Model

The design must account for at least these threats:

- An unauthenticated visitor attempts to call the API directly.
- A signed-in but unauthorized Google account attempts to access records.
- A user modifies frontend JavaScript, browser state, or request payloads.
- A forged email address or administrator flag is sent to the backend.
- An expired, invalid, or incorrectly scoped identity token is reused.
- A malicious or malformed URL is saved as a meeting link.
- A duplicate request records a payment or class completion more than once.
- A spreadsheet is accidentally shared publicly or with an unauthorized account.
- Sensitive information is exposed through logs, error messages, browser URLs, or committed configuration.
- Concurrent requests cause inconsistent payment, package, or class balances.
- A deployment uses the wrong spreadsheet or the wrong administrator allowlist.
- A failed write is displayed as if it succeeded.

This is a single-admin application, not a public multi-tenant service. Controls should be proportionate to this scope, but must not assume that obscurity or a private URL provides protection.

## 4. Identity and Authorization Model

Version 1 supports one administrator identity, configured explicitly.

The application must distinguish:

- **Authentication:** establishing which identity is making a request.
- **Authorization:** deciding whether that verified identity is permitted to perform the requested operation.

A successful Google sign-in alone does not grant application access. The backend must compare the verified identity with the configured administrator identity or allowlist.

The administrator identity must be configured in protected backend configuration. It must not be editable through the normal dashboard or stored as an untrusted client-side setting.

No student, parent, or staff accounts are included in Version 1.

## 5. Zero-GCP Authentication Architecture & Evaluation

By firm project decision, Google Cloud Platform (GCP) and Google Cloud Console setup are explicitly excluded from this project. The project does NOT require a Google Cloud project, OAuth consent screen, or Google OAuth Client ID.

### 5.1 Platform Evaluation: Native Apps Script vs. Cross-Origin SPA

1. **`Session.getActiveUser().getEmail()` Evaluation**:
   - In Google Apps Script, when a Web App is deployed as *Execute as: Me* + *Who has access: Anyone*, Google intentionally does not pass incoming browser Google session cookies to the execution context. In this configuration, `Session.getActiveUser().getEmail()` returns an empty string `""` for cross-origin AJAX requests.
   - When a Web App is deployed as *Execute as: User accessing the web app*, or *Who has access: Only myself*, direct browser navigation requires a Google login prompt. However, cross-origin AJAX `fetch()` from an external Single Page Application (hosted on Vercel or `localhost`) fails with CORS errors or 302 redirects to `accounts.google.com/ServiceLogin` because cross-origin JavaScript cannot complete Google's cookie-based authentication handshake.
   - Conclusion: Native Google session cookies cannot authenticate cross-origin browser API requests without an external Google Cloud Console OAuth 2.0 Web Client ID.

2. **Selected Cryptographic Solution: Server-Side HMAC-SHA256 Session Tokens**:
   - **Administrator Key Configuration**: The owner configures a private, high-entropy `ADMIN_AUTH_KEY` in Apps Script **Script Properties** (`PropertiesService.getScriptProperties().getProperty('ADMIN_AUTH_KEY')`). This key lives solely within Google's protected backend runtime and is never exposed in client code or source control.
   - **Authentication Handshake (`auth.login`)**:
     1. The administrator enters their Admin Access Key into the dashboard login screen.
     2. The frontend sends `auth.login` with the key via `POST` to the Apps Script endpoint.
     3. The backend executes a fixed-length constant-time comparison against `ADMIN_AUTH_KEY` (hashing both the candidate key and configured key with SHA-256 before byte-by-byte comparison) to prevent timing side-channel attacks and key length leakage.
     4. On successful verification, the backend generates an HMAC-SHA256 signed session token using Google Apps Script's native `Utilities.computeHmacSha256Signature()`.
     5. The token embeds the caller identity (`ashreya0502@gmail.com`), issuer (`personal-dashboard-backend`), issue timestamp, expiration (default 8 hours), and a cryptographic nonce.
     6. Format: `payloadBase64.hmacSha256SignatureHex`.
   - **Operation Authorization**:
     1. Every subsequent request transmits the signed session token.
     2. The backend recomputes the HMAC-SHA256 signature using the server's private `ADMIN_AUTH_KEY` and compares in constant time.
     3. The backend verifies that the token is unexpired and that the verified email matches `ADMIN_EMAILS`.
     4. Only requests with a cryptographically valid, unexpired token matching the administrator allowlist are permitted to proceed.

### 5.2 Cryptographic Implementation & Platform Behavior: Tested Facts vs. Platform Limitations

A rigorous security review distinguishes platform limitations from verified application guarantees:

1. **`CacheService` Concurrency & Brute-Force Throttling**:
   - *Implementation*: `AuthService.gs` utilizes `CacheService.getScriptCache()` to track consecutive failed attempts (`auth_fail_count`) and set an `auth_lockout` key for 60 seconds when failed attempts reach 5.
   - *Platform Limitation (Eventual Consistency)*: `CacheService` is an edge cache distributed across Google infrastructure lacking atomic read-and-increment operations. In high-concurrency race conditions, simultaneous failed attempts on different edge nodes can increment against the same cached value, permitting 5–8 attempts before lockout activates.
   - *Platform Limitation (Denial-of-Service Risk)*: Google Apps Script Web Apps deployed with *Who has access: Anyone* do not expose the client IP address in `e` of `doPost(e)`. Consequently, failed attempt tracking is global to the script. An external attacker repeatedly failing 5 login attempts can trigger the 60-second lockout for the legitimate administrator. Mitigating factors: the owner's Apps Script `/exec` URL is private and not published, and legitimate authentication requires zero failed attempts.
   - *No Database Writes*: Failed attempts never read or write to Google Sheets, preserving spreadsheet quota.

2. **Spreadsheet Access Protection (Fail-Closed Architecture)**:
   - *Verified Fact*: In `ApiEntry.gs`, request parsing (Step 1), token verification (Step 3), and admin authorization (Step 4) are strictly executed **before** `_getSpreadsheet()` is ever called.
   - *Verified Fact*: Unauthenticated, expired, or non-admin requests are rejected with `401 UNAUTHORIZED` or `403 FORBIDDEN` immediately. No spreadsheet read or write occurs for rejected requests.
   - *Verified Fact*: The `doGet(e)` handler returns only static service health metadata (`status: 'ok', service: 'Student Management Dashboard API'`) without opening the spreadsheet or reading any data.

3. **Browser Cross-Origin Behavior to Apps Script `/exec`**:
   - *CORS Preflight Prevention*: The frontend API client issues requests with `Content-Type: text/plain;charset=utf-8` carrying JSON payloads. This is a CORS-safelisted content type that prevents the browser from sending an `OPTIONS` preflight request, which Apps Script cannot handle.
   - *Redirect & Header Attachment*: Google Apps Script handles incoming `POST` requests by responding with an `HTTP 302 Found` redirect to a dynamic sandboxed sub-domain (`https://script.googleusercontent.com/macros/echo?...`). The redirect target appends `Access-Control-Allow-Origin: *`.
   - *Browser Transport*: Modern browser `fetch(..., { redirect: 'follow' })` transparently follows this redirect and resolves the response data.
   - *Security Perimeter*: Because Google attaches `Access-Control-Allow-Origin: *` to the echoed response, **CORS is not an access control mechanism**. The application's sole security perimeter is server-side cryptographic HMAC-SHA256 token verification and administrator allowlist validation.

4. **Request-Size Guard**:
   - *Verified Fact*: In `RequestParser.gs`, incoming requests are inspected before JSON parsing: `postLength = e.postData.length || e.postData.contents.length`.
   - *Memory Protection*: Payloads exceeding `MAX_PAYLOAD_BYTES` (2MB = 2,097,152 bytes) are rejected immediately with `PAYLOAD_TOO_LARGE` without parsing JSON. This protects the Apps Script 50MB execution memory quota against out-of-memory crashes from hostile or oversized payloads.

5. **HMAC Byte Representation & Encodings**:
   - *Verified Fact*: `TokenValidation.gs` signs the Base64 ASCII string representation of the JSON payload. Base64 characters (`A-Z`, `a-z`, `0-9`, `+`, `/`, `=`) have identical byte values in ASCII, UTF-8, and ISO-8859-1.
   - *Signature Conversion*: `Utilities.computeHmacSha256Signature(Utilities.MacAlgorithm.HMAC_SHA_256, payloadBase64, key)` yields signed bytes (`int8_t` [-128, 127]). The script converts each byte to unsigned (`byte < 0 ? byte + 256 : byte`) and formats as a 2-digit lowercase hex character, producing a 64-character hex digest bit-for-bit identical to RFC 2104 and standard Node.js `crypto.createHmac('sha256', key).digest('hex')`.

6. **Replay Threat Model & Nonce Reality**:
   - *Verified Fact*: The token contains a random cryptographic nonce (`nonce: 'NONCE-' + ...`). This ensures that tokens generated within the same second have distinct signatures.
   - *Platform Limitation (Stateless Nonce)*: Because the backend is stateless and does not maintain a persistent consumed-nonce revocation table, **the nonce does not prevent token replay if an active token is intercepted**.
   - *Replay Mitigations*:
     a) **Mandatory TLS/HTTPS**: All transport between browser and Google infrastructure is encrypted via HTTPS, protecting tokens from passive network eavesdropping.
     b) **Strict `sessionStorage` Storage**: Tokens are stored solely in memory and tab-isolated `sessionStorage`. They are never written to `localStorage` (protecting against persistent cross-tab extraction) and are wiped immediately upon browser tab closure or explicit sign-out.
     c) **Zero Logging**: Tokens and access keys are never logged in client telemetry, console output, or Apps Script execution logs.
     d) **Short Lifespan**: Tokens expire after 8 hours.

## 6. Token Verification Requirements

The backend must never trust an identity claim supplied as ordinary request data.

It must not authorize a request based only on:
- An unverified request field such as `email` or `userEmail`.
- A client-controlled value such as `isAdmin: true`.
- A user ID stored in browser storage.
- A decoded token payload whose cryptographic signature was not verified on the server.
- An unsigned token, hardcoded shared secret in client code, or mock bypass.
- A frontend route guard or hidden navigation item.

The backend validates tokens using native HMAC-SHA256 cryptographic verification. Verification includes:
- Cryptographic signature check against the server-held `ADMIN_AUTH_KEY`.
- Valid issuer (`personal-dashboard-backend`).
- Expiration timestamp check (`exp > nowSec`).
- Verified identity comparison against the server-configured `ADMIN_EMAILS` allowlist.

If token verification fails or the signature is invalid, the backend fails closed and returns `401 UNAUTHORIZED`. If the identity does not match the allowlist, it returns `403 FORBIDDEN`.

The implementation must not invent its own cryptographic token verification.

## 7. Session and Browser Storage

The browser may retain only the minimum state needed to support the chosen authentication flow.

Requirements:

- Do not store privileged Google credentials in browser storage.
- Do not place identity tokens in URLs, query strings, or fragments.
- Do not log tokens or attach them to analytics events or console output.
- Tokens must be stored exclusively in `sessionStorage` (and memory). Persistence in `localStorage` is completely prohibited to prevent cross-tab persistence and token survival across browser restarts.
- Clear identity tokens and authenticated user data from `sessionStorage` and memory immediately upon explicit sign-out, session expiration, or tab closure.
- Handle expiration, failed renewal, and sign-out explicitly.
- Clear protected data held in frontend memory when the session ends.
- Avoid displaying cached personal data after an authentication failure.
- Do not treat browser storage as proof of authorization; every backend request must cryptographically validate the token.

## 8. Backend Authorization

Every protected operation must authenticate and authorize the caller. This includes read operations and exports.

Protected operations include, but are not limited to:

- Listing or searching students.
- Reading student profiles and notes.
- Reading enrollments, packages, fee obligations, and payments.
- Reading class sessions, attendance, and meeting links.
- Creating, editing, archiving, or reactivating records.
- Recording, correcting, or voiding payments.
- Changing package allocations or class outcomes.
- Importing or exporting records.
- Reading audit records and operational reports.
- Reading or changing application settings.

The backend must reject unknown operation names and unsupported request shapes. No API operation may become public merely because it is considered read-only.

The backend must independently enforce record relationships and business rules even if the frontend has already validated them.

## 9. Google Sheets and Apps Script Permissions

The master spreadsheet must remain private. It must not be published to the web or shared with an unrestricted audience.

Requirements:

- Do not expose the spreadsheet ID as if it were a secret or use it as an access-control mechanism.
- Do not embed privileged Google credentials in frontend JavaScript.
- Do not allow the browser to access the master spreadsheet directly.
- Grant spreadsheet access only to the backend execution identity and explicitly authorized human administrators who need it.
- Review Apps Script deployment execution identity and access settings before production deployment.
- Do not deploy a public, anonymous endpoint that returns protected data.
- Confirm that the deployed Web App cannot be used to bypass application authorization.
- Keep development and production spreadsheet IDs separate.
- Do not use real student data in unapproved preview deployments.

The deployment's execution identity must be chosen deliberately. If Apps Script executes as the script owner, the backend must enforce authorization before every data operation because the script may have access to data the caller cannot access directly.

## 10. Browser, HTTPS, and Cross-Origin Integration

The frontend and backend must use HTTPS in deployed environments.

Because Vercel and Apps Script are separate origins, the implementation must verify the complete browser request/response flow, including:

- Whether the request triggers a CORS preflight.
- Whether the deployed Apps Script endpoint accepts the required request method and headers.
- Whether redirects affect the request or response.
- Whether the browser can read the response.
- Whether authentication material survives the supported transport safely.
- Whether failures can be distinguished from successful responses.
- Whether the same flow works in the intended production browser environment.

The implementation must not disable browser security, expose private data through JSONP, or use an unauthenticated public proxy as a workaround.

If the selected direct integration cannot reliably support the required secure flow, implementation must pause and the architecture must be revised explicitly. The agent must not silently weaken authentication to preserve the chosen stack.

## 11. Input Validation and Output Safety

All inputs must be validated by the backend before a write occurs.

Validation must cover:

- Operation name and payload structure.
- Required fields and supported field names.
- Identifier format and record existence.
- String lengths and allowed values.
- Date and timestamp formats.
- Monetary amount, precision, and permitted range.
- Valid state transitions.
- Relationships between students, enrollments, packages, obligations, payments, sessions, and meeting links.
- Duplicate submission and idempotency requirements for important mutations.
- URL scheme and meeting-provider policy.

The UI must render user-entered text as text, not executable HTML. Do not evaluate strings from Sheets or user input as code.

The backend must return a consistent error shape without exposing stack traces, private configuration, spreadsheet contents, or credentials.

## 12. Meeting Link Controls

Meeting URLs are untrusted input until validated.

Requirements:

- Permit HTTPS URLs for normal meeting links.
- Reject executable schemes such as `javascript:` and `data:`.
- Do not inject URLs into HTML or scripts.
- Identify the provider based on validated host rules where possible.
- If the provider cannot be identified, show a clear warning and require deliberate administrator action.
- Open links only after a direct user action.
- Do not automatically navigate to a link merely because a record was loaded.
- Display whether a link is active, expired, or deactivated.
- Never claim that a meeting URL is valid or available merely because it is stored.

The backend should enforce a documented provider allowlist for Zoom and Google Meet while permitting `OTHER` only through an explicit, validated workflow.

## 13. Privacy and Data Minimization

The application must collect and retain only information needed for student administration.

Requirements:

- Do not send student or parent data to third-party analytics services.
- Do not include personal data in frontend error telemetry by default.
- Avoid copying full payment or contact details into audit records.
- Avoid including full request payloads in application logs.
- Limit exports to the fields and records selected by the administrator.
- Treat student notes as private administrative data.
- Keep preview deployments isolated from production records.
- Ensure downloaded exports are clearly identified as sensitive data.
- Document who can access the master spreadsheet and its backups.

Retention, deletion, and any legally required handling of children's personal data must be reviewed for the business's applicable obligations. This document does not substitute for legal advice.

## 14. Logging and Error Handling

Operational logs may include:

- Request or correlation ID.
- Operation name.
- Outcome and error category.
- Execution duration where practical.
- Non-sensitive record IDs where needed for debugging.

Logs must not include:

- Access tokens or identity credentials.
- Passwords, OAuth secrets, or deployment secrets.
- Full parent phone numbers or email addresses unless strictly necessary and approved.
- Full payment details or student notes.
- Complete request bodies containing personal information.

Errors shown to the administrator should be actionable but must not expose internal stack traces or sensitive backend details.

A failed write must never be reported as successful. If the result of a write is uncertain because of a timeout, the UI must support safe refresh/reconciliation rather than blindly repeating a financial mutation.

## 15. Financial and Operational Audit Trail

Important changes must produce audit records, including:

- Student creation and profile changes.
- Archiving and reactivation.
- Enrollment and package changes.
- Fee obligation creation, amendment, and voiding.
- Payment recording, correction, and voiding.
- Class scheduling, rescheduling, cancellation, and completion.
- Attendance changes.
- Meeting-link creation, preference changes, and deactivation.
- Imports, exports, and relevant configuration changes.

Audit entries should include a stable audit ID, timestamp, verified actor identity, entity type, entity ID, action, outcome, request ID, and a safe change summary. Before/after summaries must omit unnecessary personal data.

Normal application workflows must not silently edit or delete audit entries. Audit records in Google Sheets are not cryptographically tamper-proof; spreadsheet permissions must therefore be restricted and backups retained.

For important mutations, the implementation must define how it handles a business write that succeeds but its audit write fails. The application must not claim stronger atomicity than Google Sheets and Apps Script provide. Use a documented recovery or reconciliation mechanism where a single atomic transaction is unavailable.

## 16. Financial Integrity Controls

The backend must ensure that:

- A payment references an existing student and, when allocated, an obligation belonging to that student.
- Amounts are valid and use the configured currency.
- Duplicate submissions do not silently create duplicate payments.
- Voided payments do not count toward paid balances.
- Corrections preserve the original transaction and an audit trail.
- Outstanding balances are calculated from persisted valid transactions.
- Package balances are derived from session records and explicit adjustments.
- A failed or partially completed operation is detectable and recoverable.

Use a script lock for critical mutations when necessary. Re-read relevant records inside the protected section and release locks in all execution paths. Do not hold locks during unrelated external network calls.

## 17. Secrets and Configuration

Secrets must not be committed to GitHub.

Protected configuration includes, as applicable:

- Production spreadsheet ID.
- Administrator allowlist.
- OAuth client configuration that is intended to remain private.
- Any server-side verification credentials or secrets required by the chosen integration.

Not every OAuth client identifier is a secret; however, client configuration must still be documented and restricted to the intended origins and application use.

Non-secret settings may be stored in the documented AppConfig sheet. Credentials and privileged secrets must not be stored there.

The implementation must provide safe configuration instructions and must not put production secrets into Vite variables that are embedded in the browser bundle.

## 18. Backup and Recovery

A backup process must be documented before production use.

It must cover the master spreadsheet's operational and historical data, including audit and import reconciliation records. Backups must have restricted access and a documented retention policy.

A restoration procedure must specify how to restore a copy without accidentally pointing the production frontend at the restored or test spreadsheet.

A backup is not accepted as reliable until a restoration test has been completed. Frequency, retention, and recovery expectations are finalized in the deployment and operations documentation.

## 19. Security Verification Checklist

The release must pass these checks:

- [ ] Anonymous requests cannot read any protected record.
- [ ] An unauthorized Google account is denied access.
- [ ] Expired or malformed credentials are rejected.
- [ ] Invalid issuer or audience is rejected.
- [ ] A forged email or `isAdmin` field cannot grant access.
- [ ] Every read and write operation performs backend authorization.
- [ ] Unknown operations and malformed payloads are rejected.
- [ ] The master spreadsheet is not publicly accessible.
- [ ] The browser does not connect directly to the master spreadsheet.
- [ ] Secrets and tokens are absent from source control, URLs, and logs.
- [ ] Unsafe meeting URL schemes are rejected.
- [ ] Financial duplicate-submission behavior is tested.
- [ ] Corrections and voids preserve the audit trail.
- [ ] Cross-origin failures do not fall back to public or anonymous access.
- [ ] Development and production data sources are separated.
- [ ] Backup restoration has been tested.

## 20. Release Gate

Real student data must not be imported until all of the following are true:

1. The authentication flow works from the deployed frontend to the deployed backend.
2. Server-side authorization tests pass.
3. Spreadsheet permissions and Apps Script deployment settings have been reviewed.
4. Cross-origin behavior has been verified in the intended browser environment.
5. Errors and logs have been reviewed for data leakage.
6. Financial mutation and duplicate-submission tests pass.
7. Backup and recovery procedures are documented and tested.
8. The administrator has reviewed the production configuration.

If any of these requirements fails, the application may continue to be tested with synthetic data, but must not be used with real student or parent information.

## 21. Related Documents

- `01-product-requirements.md`
- `02-system-architecture.md`
- `04-google-sheets-data-model.md`
- `05-business-rules-and-workflows.md`
- `06-apps-script-api-specification.md`
- `09-data-import-and-migration.md`
- `10-testing-and-acceptance-criteria.md`
- `11-deployment-and-operations.md`
- `12-implementation-agent-instructions.md`

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

## 5. Authentication Flow

The selected Google identity flow must support the separate Vercel-hosted frontend and the Apps Script backend. The implementation must prove this flow in a small integration test before importing real student data.

Required logical flow:

1. The administrator opens the HTTPS frontend.
2. The frontend starts the approved Google sign-in flow using the configured OAuth client.
3. The identity provider returns an identity credential.
4. The frontend sends the credential to the backend using the documented API transport.
5. The backend verifies the credential using a trusted Google verification mechanism.
6. The backend validates the token's signature or trusted verification result, issuer, audience, expiry, and verified identity as applicable to the chosen flow.
7. The backend checks the verified identity against the administrator allowlist.
8. Only after successful verification and authorization may the backend return protected data or perform a mutation.
9. The frontend renders authenticated pages only after receiving a valid backend result.
10. On sign-out or session expiry, the frontend clears protected application state and requires authentication again.

The exact token transport and browser integration must be specified in the implementation and tested in supported browsers. It must not be guessed from a successful local development request.

## 6. Token Verification Requirements

The backend must never trust an identity claim supplied as ordinary request data.

It must not authorize a request based only on:

- A request field such as `email` or `userEmail`.
- A client-controlled value such as `isAdmin: true`.
- A user ID stored in browser storage.
- A decoded token payload whose signature and claims were not verified.
- A token issued for a different OAuth client or audience.
- A frontend route guard or hidden navigation item.

The backend must verify tokens using a documented, supported Google identity verification method. Verification must include the expected audience/client ID, valid issuer, expiration, and verified identity claims required by the selected flow.

If verification requires a remote endpoint, the backend must validate the trusted endpoint response and fail closed when the endpoint is unavailable, malformed, or reports an invalid token.

The implementation must not invent its own cryptographic token verification.

## 7. Session and Browser Storage

The browser may retain only the minimum state needed to support the chosen authentication flow.

Requirements:

- Do not store privileged Google credentials in browser storage.
- Do not place identity tokens in URLs, query strings, or fragments.
- Do not log tokens or attach them to analytics events.
- Do not persist identity tokens in `localStorage` by default.
- Prefer short-lived identity credentials and a supported renewal or re-authentication flow.
- Handle expiration, failed renewal, and sign-out explicitly.
- Clear protected data held in frontend memory when the session ends.
- Avoid displaying cached personal data after an authentication failure.
- Do not treat browser storage as proof of authorization.

If the chosen Google sign-in library maintains its own state, its documented lifecycle and security properties must be followed. Do not build a custom token-storage mechanism without a documented need.

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

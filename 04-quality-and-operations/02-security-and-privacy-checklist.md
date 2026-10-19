# 02 — Security and Privacy Checklist

**Project:** Student Management Dashboard  
**Document status:** Implementation and release checklist  
**Version:** 1.0.0  
**Applies to:** React + TypeScript + Vite frontend, Google Apps Script backend, Google Sheets datastore, GitHub source control, and Vercel hosting  
**Data classification:** Private student, parent/guardian, class, meeting-link, and financial information

## 1. Purpose and Use

Use this checklist during architecture review, development, testing, deployment, and ongoing maintenance. A checked item means there is evidence that the control works; it must not be checked merely because code appears to implement it.

The application is initially a single-administrator tool. Students and parents do not have dashboard accounts. All private data access must be enforced by the backend, not by hiding pages or controls in the frontend.

### Checklist status convention

- `[ ]` Not verified
- `[x]` Verified with evidence
- `N/A` Not applicable, with a written reason
- `BLOCKED` Cannot be verified; release must not proceed if the control is a release gate

Record evidence for critical controls in the release checklist, test report, or deployment notes. Do not put secrets, tokens, or unnecessary personal data in evidence.

## 2. Security Principles

- [ ] The master Google Spreadsheet is the canonical datastore and is not publicly published.
- [ ] The frontend never connects directly to Google Sheets using privileged credentials.
- [ ] All reads and writes involving private records pass through the Apps Script backend.
- [ ] Every protected API operation performs server-side authentication and authorization.
- [ ] The backend validates input and applies business rules before mutation.
- [ ] The browser is treated as untrusted; client-side checks are usability features only.
- [ ] No credentials, tokens, or secrets are embedded in frontend bundles or committed to source control.
- [ ] Development, preview, and production environments are clearly separated.
- [ ] Security failures deny access by default.
- [ ] The application does not claim a write succeeded until the backend confirms it.

## 3. Identity and Authentication

### 3.1 Administrator identity

- [ ] The permitted administrator identity is explicitly configured.
- [ ] The application does not authorize arbitrary Google accounts merely because they can sign in.
- [ ] The backend establishes the actor identity from a verified identity token or another documented, supported authentication mechanism.
- [ ] The backend does not trust an email address, user ID, or `isAdmin` flag supplied as ordinary request data.
- [ ] Token issuer, audience, expiry, and required verified identity claims are validated.
- [ ] Tokens intended for another OAuth client are rejected.
- [ ] Missing, malformed, expired, revoked where verifiable, or unverifiable credentials are rejected.
- [ ] Authentication verification failures do not fall back to anonymous access.
- [ ] Authentication errors do not disclose private record contents.

### 3.2 Session lifecycle

- [ ] The sign-in flow is tested from a fresh browser session.
- [ ] The sign-out control clears application authentication state.
- [ ] Expired credentials trigger a safe re-authentication path.
- [ ] Protected data is not displayed after sign-out or loss of authorization.
- [ ] Authentication tokens are never placed in query strings, URL fragments, or meeting links.
- [ ] Privileged credentials are not stored in `localStorage`.
- [ ] Any browser-held short-lived identity material has a documented reason and lifecycle.
- [ ] Session state is not treated as proof of authorization by the backend.
- [ ] Back-button and restored-tab behavior is tested after sign-out.

### 3.3 Authentication integration gate

- [ ] The chosen Google sign-in mechanism and Apps Script request flow are demonstrated end to end before real student data is imported.
- [ ] The backend can verify the identity token using a documented, supported method.
- [ ] The token audience matches the configured client ID.
- [ ] The integration works from the intended Vercel origin in supported browsers.
- [ ] Redirects and response parsing are tested without weakening browser security.
- [ ] No JSONP or equivalent workaround is used to expose private records.
- [ ] If the required secure cross-origin flow cannot be implemented reliably, the integration design is revised before release.

## 4. Authorization and API Protection

- [ ] Every API operation is explicitly listed in the API specification.
- [ ] Unknown operation names are rejected.
- [ ] Every protected read requires authentication, including dashboard counts, search results, student profiles, fee data, payment history, class history, meeting links, imports, exports, audit logs, and configuration.
- [ ] Every protected write checks authorization before changing data.
- [ ] Authorization is performed on the server for every request; frontend route guards are not considered sufficient.
- [ ] The backend ignores or rejects caller-supplied actor identity and privilege fields.
- [ ] Request payloads cannot select arbitrary spreadsheet IDs, tabs, ranges, or formulas.
- [ ] The API does not expose a general-purpose spreadsheet read/write endpoint to the browser.
- [ ] Error responses do not reveal internal configuration, spreadsheet contents, stack traces, or credentials.
- [ ] Access denial is consistent across all routes and operations.
- [ ] Automated tests prove anonymous and unauthorized requests cannot retrieve or modify records.

## 5. Google Sheets and Google Account Permissions

- [ ] The master spreadsheet is not set to “Anyone with the link.”
- [ ] The spreadsheet is not published to the web.
- [ ] Sharing permissions are limited to the authorized owner and explicitly approved operators.
- [ ] The Apps Script execution identity and its spreadsheet permissions are understood and documented.
- [ ] The deployed Apps Script web app's execution and access settings are reviewed before deployment.
- [ ] The web app is not configured to allow unrestricted anonymous data access.
- [ ] Spreadsheet IDs are stored in protected backend configuration where appropriate and are not treated as passwords.
- [ ] No service-account key or privileged Google credential is included in frontend source, browser storage, or Vercel public environment variables.
- [ ] Test and production spreadsheets are distinct when both environments can write data.
- [ ] Access is reviewed when an administrator account, Google account, or deployment changes.
- [ ] Spreadsheet tabs, hidden columns, and protected ranges are not relied upon as the only API security control.

## 6. Data Minimization and Privacy

- [ ] Only information needed to manage students and classes is collected.
- [ ] Date of birth and other sensitive fields are optional unless a defined business need makes them necessary.
- [ ] Internal notes are limited to relevant operational information.
- [ ] The application does not collect passwords, payment-card credentials, or unnecessary identity documents.
- [ ] Student and parent contact details are not sent to advertising, analytics, or unrelated third-party services.
- [ ] Private data is not placed in public issue trackers, source-control commits, screenshots, or sample fixtures.
- [ ] Demo and automated-test environments use synthetic data.
- [ ] Data exports include only the records and columns required for the selected task.
- [ ] The product owner has defined a retention and deletion policy appropriate to operational and legal requirements.
- [ ] The product owner has reviewed applicable Indian privacy and child-data obligations before production use.
- [ ] The application provides a practical way to correct inaccurate student or guardian details while retaining required history.
- [ ] Historical retention is not used as a reason to keep unnecessary personal information indefinitely.

## 7. Frontend Security

- [ ] All production application traffic uses HTTPS.
- [ ] No privileged credential is bundled into the Vite frontend.
- [ ] Vite variables exposed to browser code are treated as public.
- [ ] React renders user-provided values as text rather than injecting raw HTML.
- [ ] No unsafe HTML rendering is used for student notes, imported values, names, URLs, or error messages unless a separately reviewed sanitization requirement exists.
- [ ] Meeting links are rendered as links and never evaluated as code.
- [ ] External links use safe navigation behavior where applicable.
- [ ] The UI does not show private cached data after logout or authorization failure.
- [ ] Error and loading states do not accidentally reveal stale data from another selected student.
- [ ] Browser console logging does not print tokens, full student records, or payment details.
- [ ] Source maps and production debugging settings are reviewed for unnecessary disclosure.
- [ ] Dependencies are pinned or lockfile-controlled and reviewed for known vulnerabilities.

## 8. Input Validation and Output Handling

- [ ] The backend validates request shape, field types, required fields, lengths, and allowed enum values.
- [ ] Student, enrollment, package, fee, payment, class, and meeting-link IDs are validated and checked for existence.
- [ ] Relationships are checked: related records must belong to the same student and, where applicable, the same enrollment.
- [ ] Dates and timestamps are parsed strictly and invalid calendar dates are rejected.
- [ ] Monetary values are finite numbers with the documented precision and currency.
- [ ] Normal payments must be greater than zero; refunds, credits, and reversals follow explicit models rather than undocumented negative values.
- [ ] Unknown fields are rejected where strict request schemas are specified.
- [ ] Input validation occurs before any spreadsheet mutation.
- [ ] Spreadsheet formulas cannot be injected through untrusted text fields; values beginning with formula-triggering characters are handled safely for the intended storage and export context.
- [ ] API responses use a consistent envelope and do not expose internal exceptions.
- [ ] All API output is treated as untrusted by the frontend.

## 9. Meeting-Link Safety

- [ ] Meeting URLs are validated on the backend before storage.
- [ ] Only permitted URL schemes are accepted; `javascript:`, `data:`, and other executable or unsuitable schemes are rejected.
- [ ] HTTPS is required for normal Zoom and Google Meet links.
- [ ] Provider labels are validated against the supported enum.
- [ ] A URL's hostname is checked against the provider policy; unusual or unsupported hosts require explicit review.
- [ ] The interface clearly identifies the provider and selected link before opening it.
- [ ] Deactivated or expired links are not presented as the default join target.
- [ ] A class session's selected meeting link belongs to the relevant student and is valid for the session, where date constraints are used.
- [ ] Meeting URLs are not written to public logs or analytics.
- [ ] Link changes and deactivation are auditable.

## 10. Financial Data Integrity

- [ ] Fee obligations and payments are separate records.
- [ ] Payment history is not overwritten to represent a new payment.
- [ ] Payment-to-obligation relationships are validated.
- [ ] A payment cannot be allocated to another student's obligation.
- [ ] Paid and outstanding amounts are calculated from valid persisted transactions.
- [ ] Voided payments do not contribute to balances, and their original records remain available for audit.
- [ ] Voiding or correcting a payment requires a reason and creates an audit record.
- [ ] Duplicate submission protection is implemented for payment writes.
- [ ] Overpayment and advance-credit behavior is explicitly defined and tested.
- [ ] Currency and monetary precision are consistent across obligations, payments, and calculations.
- [ ] Financial UI totals are reconciled against backend calculations.
- [ ] Exports preserve dates, amounts, transaction references, and status without silently rounding or omitting records.

## 11. Class and Package Integrity

- [ ] Purchased class quantity is stored separately from calculated remaining classes.
- [ ] Completed sessions are the only sessions that consume package credits unless a documented no-show or other policy explicitly applies.
- [ ] Cancelled and rescheduled sessions do not accidentally consume credits.
- [ ] A reschedule cannot create duplicate class consumption.
- [ ] Attendance and session status transitions are validated by the backend.
- [ ] Package adjustments, if supported, are explicit and auditable.
- [ ] A package or student cannot be hard-deleted through ordinary UI operations when historical sessions reference it.
- [ ] Class-balance calculations have tests for boundary conditions, including zero remaining classes and exhausted packages.

## 12. Audit Logging and Error Handling

- [ ] Important student, enrollment, package, fee, payment, class, attendance, meeting-link, import, and configuration changes are auditable.
- [ ] Audit records identify the verified actor, action, entity, timestamp, outcome, and request correlation ID where available.
- [ ] Audit summaries avoid copying unnecessary sensitive information.
- [ ] Normal application operations cannot edit or delete audit records.
- [ ] Failed operations are not recorded as successful mutations.
- [ ] Logging failure behavior for important mutations is documented.
- [ ] Logs omit authentication tokens, secrets, and full request bodies containing personal data.
- [ ] Error messages are useful to the administrator without exposing stack traces or private backend details.
- [ ] Request IDs allow a failure to be investigated without logging sensitive payloads.

## 13. Concurrency, Idempotency, and Partial Writes

- [ ] Important writes re-check current state before mutation.
- [ ] Apps Script locking is used where concurrent operations could violate data integrity.
- [ ] Locks are released reliably and are not held during unnecessary external network calls.
- [ ] Repeated submissions cannot silently create duplicate payments or duplicate class records where an idempotency key is required.
- [ ] Multi-row operations document what happens if one step fails.
- [ ] The application has a reconciliation or recovery path for partial writes that cannot be rolled back atomically.
- [ ] A retry cannot double-apply a payment, class credit, import row, or other non-idempotent operation.
- [ ] The UI distinguishes a confirmed failure from an uncertain outcome where the request may have completed before a connection failure.

## 14. Import, Export, and Migration Safety

- [ ] Imports are initiated only by the authenticated administrator.
- [ ] Source spreadsheet access is limited to the permissions needed for the import.
- [ ] Source column mappings are explicit and reviewed.
- [ ] Required fields, dates, amounts, enum values, and relationships are validated before records are written.
- [ ] The importer previews results before committing changes where supported by the workflow.
- [ ] Duplicate detection is performed using stable identifiers and documented matching rules.
- [ ] Ambiguous duplicate matches are sent for review rather than merged automatically.
- [ ] Imports are idempotent or safely detect prior imported rows.
- [ ] Row-level outcomes identify imported, skipped, duplicate-review, and failed rows.
- [ ] The source is not deleted or modified by the importer unless a separately approved operation explicitly requires it.
- [ ] Imports do not silently overwrite canonical records.
- [ ] Exports are restricted to the authorized administrator and are not published publicly.
- [ ] Temporary downloaded files containing personal data are stored and removed according to the documented handling policy.

## 15. Secrets and Configuration

- [ ] No secrets are committed to GitHub.
- [ ] No secrets are included in sample `.env` files; examples contain placeholders only.
- [ ] Vercel public environment variables contain no privileged credentials.
- [ ] Apps Script configuration uses the least exposure available for the chosen deployment model.
- [ ] The master spreadsheet ID is configured deliberately and is not confused with an authentication secret.
- [ ] OAuth client IDs, redirect origins, and expected token audiences are documented and environment-specific where required.
- [ ] Production configuration changes are reviewed and recorded.
- [ ] Secret rotation and compromised-account response steps are documented where applicable.
- [ ] Repository history is checked for accidental credential commits before release.

## 16. Hosting and Deployment

- [ ] Vercel project access is limited to authorized maintainers.
- [ ] GitHub repository access is limited to authorized collaborators.
- [ ] Branch and deployment permissions are reviewed.
- [ ] Preview deployments cannot write to production student data by default.
- [ ] Production environment variables are configured through the hosting platform's protected settings.
- [ ] The production frontend points to the intended production Apps Script deployment.
- [ ] The Apps Script deployment uses a reviewed, versioned release.
- [ ] The deployment's execution identity and access policy are re-verified after changes.
- [ ] No test endpoint, debug mode, or temporary bypass is enabled in production.
- [ ] The selected Vercel plan and usage comply with the current plan terms and the project's actual business use.
- [ ] A rollback procedure is documented for frontend and backend releases.

## 17. Backup, Recovery, and Retention

- [ ] A backup frequency is documented based on the value and change rate of the data.
- [ ] Backup access is restricted to authorized users.
- [ ] Backups include the tabs required to restore relationships, financial history, import reconciliation, and audit history.
- [ ] Backup retention and disposal rules are documented.
- [ ] A restoration procedure is written and tested.
- [ ] Restoration is tested in a non-production environment before relying on it.
- [ ] Recovery procedures avoid overwriting newer production data without review.
- [ ] The owner knows how to respond to accidental spreadsheet deletion or corruption.
- [ ] Archive and retention behavior is distinguished from backup behavior; archiving is not a backup.

## 18. Dependency and Application Maintenance

- [ ] Frontend dependencies are reviewed for known vulnerabilities.
- [ ] Dependency updates are tested before production deployment.
- [ ] Apps Script code changes are reviewed before deploying a new version.
- [ ] The codebase contains no unused authentication bypasses, temporary test accounts, or debug routes.
- [ ] Security-sensitive configuration changes are documented.
- [ ] Error and audit logs are reviewed when a security incident is suspected.
- [ ] A process exists to revoke the administrator's access if the account is compromised.

## 19. Required Negative Tests

The following tests must fail safely:

- [ ] Request with no credentials.
- [ ] Request with malformed credentials.
- [ ] Expired identity token.
- [ ] Token with an unexpected audience or issuer.
- [ ] Authenticated but unauthorized identity.
- [ ] Forged `isAdmin` or actor-email field.
- [ ] Unknown API operation.
- [ ] Request for a nonexistent student or related record.
- [ ] Payment allocated to another student's fee obligation.
- [ ] Invalid or negative normal payment amount.
- [ ] Duplicate payment submission.
- [ ] Unsafe meeting URL scheme.
- [ ] Import row with malformed date or amount.
- [ ] Duplicate import submission.
- [ ] Attempt to modify or delete audit history through normal API operations.
- [ ] Spreadsheet schema missing a required tab or column.
- [ ] Backend timeout or malformed response.
- [ ] Cross-origin request failure.
- [ ] Concurrent mutations that would otherwise violate a financial or class invariant.

For each test, verify that unauthorized or invalid operations do not change canonical data.

## 20. Release Gates

### Gate A — Before real data is imported

- [ ] Authentication and authorization pass end-to-end tests.
- [ ] Master spreadsheet permissions are verified.
- [ ] Frontend bundle and repository contain no secrets.
- [ ] Cross-origin request and response behavior is verified.
- [ ] The development environment uses synthetic data.
- [ ] Backup and recovery procedures are documented.

### Gate B — Before production launch

- [ ] All critical security tests pass.
- [ ] Financial and class-balance tests pass.
- [ ] Audit logging is verified for significant changes.
- [ ] Import reconciliation has been tested on a copy of representative data.
- [ ] Production and preview environments are separated.
- [ ] Deployment and rollback procedures are tested.
- [ ] Current hosting-plan terms have been reviewed.
- [ ] Privacy and child-data obligations have been reviewed by the owner.
- [ ] No unresolved critical or high-severity security issue remains.

### Gate C — After production launch

- [ ] Confirm that the deployed frontend reaches the intended backend.
- [ ] Confirm that an unauthorized identity is denied access.
- [ ] Confirm that a test mutation creates the expected audit event.
- [ ] Confirm that the master spreadsheet remains private.
- [ ] Confirm that a backup can be restored in a safe test environment.
- [ ] Remove temporary test records and access grants.

## 21. Incident Response Checklist

If unauthorized access, credential exposure, data loss, or suspected corruption occurs:

- [ ] Stop the affected operation or deployment when safe to do so.
- [ ] Revoke or rotate compromised credentials and access grants.
- [ ] Restrict access to the master spreadsheet and deployment consoles as needed.
- [ ] Preserve relevant non-sensitive logs and timestamps.
- [ ] Determine the affected records and time window.
- [ ] Restore from a verified backup only after assessing the risk of overwriting newer data.
- [ ] Record the incident, impact, remediation, and follow-up controls.
- [ ] Assess notification and other obligations under applicable law and contractual commitments.
- [ ] Do not expose student or parent details in public incident discussions.

## 22. Final Sign-off

Release/environment: ______________________________

Reviewer: ________________________________________

Date: ____________________________________________

Critical test report/reference: _____________________

Backup restoration evidence: _______________________

Open security issues and approved exceptions: _______

Decision: `APPROVED` / `BLOCKED`

Approval means the applicable controls were tested and evidence was reviewed. It does not mean the system is risk-free.

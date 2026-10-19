# 05 — Maintenance and Troubleshooting

## 1. Purpose

This document defines routine maintenance, operational checks, incident handling, and troubleshooting for the Student Management Dashboard.

The system consists of a React + TypeScript + Vite frontend hosted on Vercel, a Google Apps Script Web App backend, and a private Google Sheets master spreadsheet. GitHub is the intended source-control home.

Maintenance must preserve student privacy, financial accuracy, class-history integrity, and recoverability. Keep procedures proportional to a small, single-admin application; do not introduce additional infrastructure without an approved architecture change.

## 2. Operational Principles

1. Treat the master spreadsheet as the canonical datastore.
2. Do not edit production data directly in Sheets for routine work when the dashboard supports the operation.
3. Never troubleshoot by disabling authentication or making the spreadsheet public.
4. Never log or paste identity tokens, secrets, or unnecessary student and parent data into issue reports.
5. Confirm a mutation succeeded before repeating it; retries can create duplicate payments, sessions, or imports unless the operation is idempotent.
6. Preserve historical records. Correct financial or class errors through supported correction workflows, not silent deletion.
7. Test changes against non-production data before deploying them to production.
8. Record material incidents and the resolution in a concise maintenance log that contains no unnecessary personal data.

## 3. Routine Maintenance

### 3.1 Before a release

- Review the code changes and affected requirements.
- Run the automated checks defined in the test strategy.
- Verify that the frontend and Apps Script API contracts remain compatible.
- Validate required configuration names and schema version.
- Test sign-in, protected reads, protected writes, and sign-out.
- Test a student lookup, a payment workflow, a class workflow, and meeting-link opening using test records.
- Confirm no secrets, tokens, production exports, or real student data were committed.
- Confirm the current production deployment and recovery procedure are known.

### 3.2 Weekly or before a significant release

- Review failed import batches and unresolved reconciliation results.
- Review reported API failures and failed financial or class operations.
- Confirm the most recent backup or export completed as expected.
- Check Apps Script executions for repeated errors or quota failures.
- Review Vercel deployment status and build failures.
- Confirm that the master spreadsheet remains private and shared only with approved identities.

These checks may be combined into one short review. Do not create a separate monitoring platform for this application.

### 3.3 Periodically

- Perform a restoration test using a backup copy, not the live spreadsheet.
- Review administrator access and remove access that is no longer needed.
- Review Apps Script and Google identity configuration for outdated settings.
- Check for stale meeting links and obsolete configuration values.
- Re-test the import workflow against representative source sheets.
- Review whether data volume or execution time is approaching documented limits.

The exact backup schedule and retention period are defined in `04-backup-and-recovery.md`.

## 4. Environment Checks

The application has separate development/preview and production environments.

Before diagnosing an issue, establish:

- Which frontend deployment is being used.
- Which Apps Script deployment it calls.
- Which master spreadsheet that backend is configured to access.
- Which administrator identity is signed in.
- Whether the issue affects one record or all records.

Development must not write to production data by accident. Environment-specific IDs and URLs must be configured explicitly and must not be guessed from deployment names.

## 5. Troubleshooting Procedure

Use this order for a new incident:

1. **Describe the symptom.** Record the page or operation, approximate time, environment, and visible error code. Avoid copying personal data into the report.
2. **Determine the scope.** Check whether one user action, one record, one domain, or the whole application is affected.
3. **Check deployment status.** Review the current Vercel deployment and Apps Script execution history.
4. **Check authentication.** Confirm that the expected administrator is signed in and that the identity token is valid for the configured client.
5. **Check API compatibility.** Confirm that the frontend URL and backend deployment correspond to the same release configuration.
6. **Check schema health.** Verify required tab names, headers, and schema version without changing production structure.
7. **Check persisted state.** For a failed mutation, inspect the relevant record and audit entry before retrying.
8. **Apply the smallest safe correction.** Prefer a targeted fix over broad spreadsheet edits.
9. **Verify recovery.** Repeat the failed workflow with a controlled test and verify persisted results.
10. **Record the resolution.** Include the cause, corrective action, and prevention step, omitting unnecessary personal information.

Do not make speculative edits to production rows while diagnosing an issue.

## 6. Common Problems

### 6.1 Frontend does not load

Possible causes:
- Failed Vercel build or deployment.
- Incorrect deployment URL.
- Missing public configuration.
- JavaScript runtime error.
- Browser cache showing an old bundle.

Actions:
- Check the deployment status and build output.
- Open the browser console and identify the first relevant error.
- Verify only the documented public configuration is exposed to the frontend.
- Confirm the deployed assets belong to the expected commit.
- Retry in a private browser window to rule out stale local state.

Do not place backend secrets in Vite environment variables prefixed for public exposure.

### 6.2 Login fails

Possible causes:
- Wrong Google account.
- Identity token expired or not issued for the configured client.
- Administrator allowlist is incorrect.
- Backend deployment has stale configuration.
- Identity verification endpoint or browser sign-in flow failed.

Actions:
- Sign out and sign in with the approved account.
- Check the non-sensitive error category and Apps Script execution result.
- Verify the configured client ID and administrator allowlist in protected configuration.
- Confirm the backend verifies token signature, issuer, audience, and expiry.
- Redeploy only after configuration is confirmed and reviewed.

Never work around a login failure by trusting an email address sent as ordinary request data or by disabling server-side authorization.

### 6.3 API requests fail or return unreadable responses

Possible causes:
- Wrong Apps Script Web App URL.
- Frontend and backend deployments are incompatible.
- Redirect, preflight, or cross-origin behavior changed.
- Backend returned an unexpected response format.
- Request body is malformed or exceeds a supported limit.
- Apps Script execution failed before returning a response.

Actions:
- Verify the exact configured endpoint for the current environment.
- Inspect the browser network panel without copying tokens into logs.
- Check Apps Script execution history for the matching time.
- Confirm the API response envelope and operation name match the documented contract.
- Test the integration using the approved integration test, not an insecure JSONP workaround.

If the browser cannot securely read the API response, stop and fix the integration architecture rather than exposing data through a public endpoint.

### 6.4 Student list is empty or incomplete

Possible causes:
- A filter is active.
- The backend request failed.
- A status value is outside the supported enum.
- Required headers or schema version are incorrect.
- Pagination or query logic omitted records.

Actions:
- Clear filters and search for a known test student.
- Check the API response status and pagination metadata.
- Run the schema health check.
- Verify status values and required headers.
- Compare counts using an authorized, read-only reconciliation process.

Do not rewrite headers or bulk-edit statuses until the cause is known.

### 6.5 Payment appears missing or duplicated

Possible causes:
- The request failed before persistence.
- Persistence succeeded but the response was lost.
- A user retried the operation.
- A payment is voided or allocated to another valid obligation.
- A filter hides the transaction.

Actions:
- Do not immediately submit the payment again.
- Search the payment ledger by student, amount, date, and transaction reference.
- Check the request/idempotency identifier and audit history when available.
- Verify payment status and its fee-obligation relationship.
- Reconcile the calculated balance against valid payment records.
- Use the supported correction or void workflow if a duplicate exists.

Never fix a balance by directly overwriting a calculated paid or outstanding total.

### 6.6 Fee balance is incorrect

Check, in order:
- The fee obligation amount and status.
- All valid payments allocated to that obligation.
- Whether any payment is voided.
- Whether a payment references the correct student and obligation.
- Whether the UI is showing stale cached data.
- Whether rounding or currency handling differs between layers.

The backend calculation is authoritative. If stored records are inconsistent, stop further financial corrections until the discrepancy is understood and audited.

### 6.7 Remaining class count is incorrect

Check:
- Purchased class quantity.
- Sessions associated with the package.
- Which sessions are completed, cancelled, rescheduled, or no-show.
- The configured class-consumption policy.
- Duplicate session records or duplicate completion operations.
- Any supported credit adjustments and their audit history.

Do not manually edit a displayed remaining-class value. Correct the source records through supported operations and verify the recalculated balance.

### 6.8 Meeting link does not open

Possible causes:
- Link is inactive or expired.
- URL was entered incorrectly.
- The provider requires the host or participant to sign in.
- The meeting was deleted or replaced externally.
- Browser popup settings blocked opening the link.

Actions:
- Confirm the active link and provider.
- Verify the URL is HTTPS and correctly formed.
- Open it using the dashboard's explicit link action.
- Ask the administrator to verify the meeting in the provider's own interface if necessary.
- Deactivate obsolete links rather than deleting their history.

The dashboard cannot guarantee that a meeting still exists on Zoom or Google Meet unless a separate supported provider integration is implemented.

### 6.9 Import fails or produces duplicates

Actions:
- Stop the import if its behavior is unclear.
- Open the batch summary and row-level results.
- Identify the source tab, row reference, and validation error.
- Correct source mapping or source data in a controlled copy.
- Preview the import again.
- Reconcile imported, skipped, duplicate-review, and failed counts.
- Retry only when the importer can safely identify previously processed rows.

Never assume that rerunning a failed batch is harmless. Import operations must be idempotent or must clearly prevent unsafe retries.

### 6.10 Apps Script quota or runtime errors

Actions:
- Identify the operation and execution time from Apps Script execution history.
- Check whether the operation reads ranges or writes cells inefficiently.
- Prefer batch reads and writes over per-cell loops.
- Limit response payloads and historical data returned to the UI.
- Avoid holding script locks during slow unrelated work.
- Retry only transient failures and only when duplicate writes are prevented.

Do not add queues, extra services, or caching layers until profiling demonstrates a real need.

### 6.11 Schema mismatch

Actions:
- Stop writes that depend on the affected schema.
- Check required tab names, headers, duplicate headers, and schema version.
- Identify whether a manual edit or deployment introduced the mismatch.
- Restore the expected schema or apply a documented migration.
- Validate the result against a backup copy before resuming writes.

The application must fail clearly rather than silently mapping data to the wrong columns.

## 7. Data Repair Rules

Data repair must follow these safeguards:

- Prefer a documented application workflow.
- Take a verified backup before any necessary direct production repair.
- Record the affected record IDs and reason for repair.
- Change only the fields required to correct the issue.
- Preserve financial and class history.
- Create an audit entry or repair record when application-level auditing cannot capture the repair.
- Recalculate dependent balances after correction.
- Verify related records and foreign-key consistency.
- Record the outcome without copying unnecessary personal data.

Direct edits to the master spreadsheet are an exceptional repair mechanism, not the normal operating procedure.

## 8. Incident Severity and Response

### Severity 1 — Data exposure or integrity risk

Examples:
- Unauthorized access to student or financial data.
- Master spreadsheet accidentally made public.
- Incorrect bulk financial mutation.
- Evidence of compromised credentials.

Response:
- Stop affected operations and deployments.
- Restrict access or disable the affected integration if this can be done safely.
- Preserve relevant non-sensitive diagnostic evidence.
- Revoke or rotate affected credentials where applicable.
- Determine the scope before restoring service.
- Restore from backup only after identifying the data-loss window and recovery point.
- Document the incident and verify security before reopening access.

### Severity 2 — Major operational failure

Examples:
- All protected API operations fail.
- Payments or class records cannot be saved reliably.
- Production data is inconsistent across related records.

Response:
- Avoid repeating uncertain mutations.
- Identify the affected workflow and time window.
- Restore a known-good deployment or configuration when appropriate.
- Reconcile records before resuming financial or class operations.

### Severity 3 — Limited defect

Examples:
- One page fails while other workflows remain available.
- A filter or display is incorrect without evidence of persisted-data corruption.

Response:
- Record the defect.
- Use a safe workaround if one exists.
- Fix and test the affected module.
- Deploy through the standard release procedure.

## 9. Deployment and Rollback

- Keep source changes in version control.
- Deploy the frontend and Apps Script backend using documented procedures.
- Record the commit and backend version associated with each release.
- Test compatibility before deploying changes that affect API contracts.
- Prefer rolling back to a known-good code version over making rushed production edits.
- A code rollback does not automatically reverse spreadsheet mutations.
- If a release changed the data schema, follow the migration recovery plan before rolling back incompatible code.

Never assume that restoring the frontend alone repairs a backend or data problem.

## 10. Operational Health Check

A lightweight administrative health check should report:

- Frontend can reach the configured backend.
- Authentication verification is operational.
- Required spreadsheet tabs and headers are present.
- Schema version is supported.
- Required non-secret configuration is available.
- Recent API operations are not failing systematically.

The health check must not expose tokens, secrets, spreadsheet contents, or personal records. A health-check endpoint must not return protected student data to unauthenticated callers.

## 11. Maintenance Log

For a material incident or production repair, record:

- Date and time.
- Environment.
- Affected workflow.
- Severity.
- Non-sensitive symptom or error code.
- Root cause, when known.
- Corrective action.
- Verification performed.
- Follow-up prevention task, if needed.

Do not store authentication tokens, full request payloads, or unnecessary student and parent details in the log.

## 12. Troubleshooting Acceptance Criteria

The operational documentation is complete when an administrator or developer can:

- Identify the active frontend, backend, and spreadsheet environment.
- Diagnose a login or API connectivity failure without weakening security.
- Investigate missing or duplicate payments without blindly retrying writes.
- Reconcile an incorrect fee or class balance from source records.
- Diagnose an import failure using row-level results.
- Recover from a bad deployment without assuming data changes are rolled back.
- Verify spreadsheet privacy and schema integrity.
- Restore service using the documented backup and recovery procedure.
- Record incidents without unnecessarily exposing personal information.

## 13. Related Documents

- `03-security-and-privacy-checklist.md`
- `03-deployment-and-environment-configuration.md`
- `04-backup-and-recovery.md`
- `01-test-strategy-and-acceptance-criteria.md`
- `02-api-contracts-and-error-handling.md`
- `01-master-spreadsheet-schema.md`

When a related document defines a more specific procedure, follow that document and update this file if the operational guidance becomes inconsistent.

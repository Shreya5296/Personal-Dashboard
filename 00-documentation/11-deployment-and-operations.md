# 11 — Deployment and Operations

## 1. Purpose

This document defines how the Student Management Dashboard is configured,
deployed, verified, monitored, backed up, and maintained.

The application consists of:
- A React + TypeScript + Vite frontend hosted on Vercel.
- A Google Apps Script Web App providing the API.
- One private Google Spreadsheet serving as the canonical datastore.
- A Git repository containing application source and documentation.

Deployment must remain simple enough for one administrator to operate.
No separate database server, paid monitoring service, or unnecessary
infrastructure is required.

## 2. Environments

Use two environments:

### 2.1 Development

Purpose:
- Build and test features.
- Validate the Apps Script integration.
- Test migrations and schema changes.
- Use synthetic or anonymized data.

Requirements:
- A development Apps Script deployment.
- A development spreadsheet separate from production.
- Development configuration and credentials.
- No routine write access to production data.

### 2.2 Production

Purpose:
- Manage real student, parent, class, and financial records.

Requirements:
- A production Apps Script deployment.
- A production spreadsheet with restricted sharing.
- Production-only configuration.
- The approved administrator identity.
- A tested backup and restore process.

Development and production must not share a spreadsheet accidentally.
A deployment must not change production configuration silently.

## 3. Repository and Source Control

The Git repository is the source of truth for application code and
documentation.

Requirements:
- Keep frontend source, Apps Script source, tests, and documentation
  under version control.
- Never commit OAuth secrets, access tokens, private keys, or exported
  real student data.
- Keep environment-specific values out of committed source files.
- Use descriptive commits.
- Review the diff before committing.
- Do not commit generated build output unless explicitly required by
  the chosen repository convention.
- Tag or record the commit used for each production release.

Suggested branch convention:
- `main`: reviewed, releasable work.
- Short-lived feature branches for significant changes.
- Fixes may be committed directly only when that is the agreed project
  workflow and the change is reviewed.

The implementation agent must preserve unrelated work and must not
reset, overwrite, or force-push branches without explicit authorization.

## 4. Configuration

### 4.1 Frontend Configuration

Only public configuration may be included in the frontend build.

Expected values include:
- API deployment URL.
- Google OAuth client ID, if required by the selected sign-in flow.
- Application environment label.

Vite variables prefixed with `VITE_` are bundled into browser code.
They must never contain secrets.

The production API URL must point to the production Apps Script
deployment. Preview builds must not write to production by default.

### 4.2 Backend Configuration

Store privileged configuration in Apps Script project properties or
another supported protected configuration mechanism.

Expected values include:
- Production spreadsheet ID.
- Authorized administrator email or allowlist.
- Expected OAuth audience/client ID.
- Supported schema version.
- Environment identifier.
- Other minimal backend settings required by the implementation.

Do not store secrets in:
- Frontend source code.
- `public/` files.
- Committed `.env` files.
- URL query parameters.
- The public configuration tab in Google Sheets.

The spreadsheet ID is not a password. Spreadsheet permissions and
server-side authorization remain the security boundary.

### 4.3 Configuration Validation

At startup or through a protected health-check operation, validate
that required configuration exists.

If required configuration is missing or invalid:
- Fail closed.
- Do not expose student data.
- Return a safe operational error.
- Log a non-sensitive diagnostic.

Do not silently substitute a development spreadsheet or account.

## 5. Google Spreadsheet Setup

Create one spreadsheet for each environment.

Production setup checklist:
1. Create the production spreadsheet in the intended Google account.
2. Restrict sharing to authorized identities.
3. Do not publish the spreadsheet to the web.
4. Create the exact tabs defined in Document 04.
5. Create the required headers in the specified order.
6. Initialize the schema version and supported settings.
7. Confirm the Apps Script execution identity has the required access.
8. Confirm no unauthorized account can open the spreadsheet.
9. Record the spreadsheet ID in protected backend configuration.
10. Run the schema validation and health checks.

The application must not silently create missing production tabs or
reinterpret missing columns as valid empty data. Schema setup and
migration must be explicit and auditable.

## 6. Apps Script Deployment

### 6.1 Project Setup

The Apps Script source must be stored in the repository using the
project structure defined in Document 08.

Use the agreed synchronization workflow, such as the supported Apps
Script command-line workflow, to keep repository source and the deployed
project consistent.

Do not edit production code in the Apps Script editor without bringing
the change back into version control.

### 6.2 Deployment Procedure

For each backend release:
1. Confirm the working tree and intended commit.
2. Run backend tests and static checks available to the project.
3. Confirm development configuration is not pointing to production
   unintentionally.
4. Deploy the candidate to the development environment.
5. Run authentication and API smoke tests.
6. Verify reads and writes against development data.
7. Verify error responses and invalid-token handling.
8. Review the change for accidental logging of personal information.
9. Create a versioned Apps Script deployment.
10. Configure the Web App access and execution settings to match the
    approved authentication architecture.
11. Record the deployment version and URL in protected operational
    notes.
12. Run production preflight checks before promoting the release.
13. Update production only after the checks pass.

Never select broad or anonymous access merely to make the frontend
integration easier.

The deployed access configuration must be tested independently of the
editor's own permissions.

### 6.3 Deployment Configuration Gate

The Apps Script deployment model, execution identity, identity-token
verification, and browser cross-origin behavior must work together.

Before production deployment, verify:
- The browser can send the required authenticated request.
- The backend can verify the identity token using the documented method.
- The backend checks the approved administrator allowlist.
- Unauthorized callers receive no protected records.
- The response can be consumed by the frontend under normal browser
  security rules.
- Redirects do not cause credentials to be dropped or misdirected.
- Error responses remain safe and understandable.

If this flow cannot be made secure and reliable with the chosen
integration, stop and revise the architecture. Do not use JSONP,
anonymous data access, disabled browser security, or client-only
authorization as a workaround.

## 7. Vercel Deployment

### 7.1 Project Setup

Configure Vercel to build the frontend from the Git repository.

Use the actual frontend root directory established by Document 08.
Do not assume the repository root is the frontend root if the project
uses a monorepo layout.

Typical build settings for a Vite frontend:
- Framework preset: Vite.
- Build command: `npm run build`.
- Output directory: `dist`.
- Install command: the repository's documented package-manager command.

The exact settings must match the committed package scripts and lockfile.

### 7.2 Environment Variables

Configure only the required public frontend variables in Vercel.

For example:
- `VITE_API_BASE_URL`
- `VITE_GOOGLE_CLIENT_ID`, if required by the selected sign-in flow.
- `VITE_APP_ENV`

These names are illustrative and must be reconciled with the final
implementation.

Do not put private credentials in Vercel variables that are bundled
into browser code.

Set preview and production values separately. Preview deployments
must not accidentally point to a writable production API.

### 7.3 Frontend Release Procedure

1. Confirm the intended Git commit.
2. Run linting, type checks, tests, and production build.
3. Review the generated build for accidental secrets.
4. Deploy a preview build.
5. Test login, protected routes, API connectivity, and sign-out.
6. Test key workflows using non-production data.
7. Confirm the preview is using the expected backend environment.
8. Merge or promote the reviewed change according to the repository
   workflow.
9. Verify the production deployment.
10. Record the deployed commit and deployment timestamp.

### 7.4 Hosting Plan and Terms

Before production use, verify that the selected Vercel plan permits the
project's actual use case. Plan terms and eligibility may change.

Do not assume a free hosting plan permits every commercial use.
If the current plan does not permit the intended use, choose a compliant
hosting option before production release.

The architecture should remain portable enough to move the static
frontend to another suitable host without redesigning the backend.

## 8. Custom Domain and HTTPS

A custom domain is optional for Version 1.

If configured:
- Use a domain controlled by the administrator.
- Require HTTPS.
- Configure the approved origin and redirect behavior.
- Do not use an untrusted origin for production sign-in.
- Update the OAuth client configuration as required.
- Verify that authentication still works after domain changes.

The application must not send authentication tokens over HTTP.

## 9. Release Checklist

Before every production release:

### Source and Build
- [ ] Intended commit identified.
- [ ] No unrelated or unreviewed changes included.
- [ ] Formatting, lint, and type checks pass where configured.
- [ ] Automated tests pass.
- [ ] Production frontend build succeeds.
- [ ] No secrets or real student exports are committed.

### Backend and Data
- [ ] Development deployment passes smoke tests.
- [ ] Production spreadsheet schema is compatible.
- [ ] Required configuration is present.
- [ ] Authentication and authorization tests pass.
- [ ] Financial and class-balance calculations pass.
- [ ] Migration requirements are understood.
- [ ] Backup exists before any risky data/schema change.

### Security
- [ ] Spreadsheet remains private.
- [ ] No anonymous access to protected API operations.
- [ ] Token verification checks the expected audience and expiry.
- [ ] Logs do not expose tokens or unnecessary personal information.
- [ ] Cross-origin behavior is verified in a real browser.

### Production Verification
- [ ] Correct frontend deployment is live.
- [ ] Correct Apps Script deployment is active.
- [ ] Login and sign-out work.
- [ ] Student search and profile load.
- [ ] A safe read operation succeeds.
- [ ] A controlled test mutation succeeds when appropriate.
- [ ] Errors are displayed safely.
- [ ] The deployed commit and backend version are recorded.

## 10. Rollback

### 10.1 Frontend Rollback

If a frontend release fails:
1. Stop further promotion.
2. Restore the last known-good Vercel deployment using the supported
   deployment rollback mechanism.
3. Verify the restored deployment uses a compatible backend API.
4. Test login and the main read-only workflows.
5. Record the incident and the failed commit.

### 10.2 Backend Rollback

If a backend release fails:
1. Stop further changes.
2. Identify the last known-good Apps Script version.
3. Restore or repoint the deployment using the supported Apps Script
   deployment procedure.
4. Verify configuration and spreadsheet compatibility.
5. Run authentication and API smoke tests.
6. Record the restored deployment version.

A frontend rollback does not automatically roll back Apps Script, and
an Apps Script rollback does not automatically roll back the frontend.
Compatibility must be checked for both sides.

### 10.3 Schema Changes

Do not roll back a schema migration by merely restoring old code if
the new code has already transformed production data.

Every schema migration must define:
- Preconditions.
- Forward migration steps.
- Validation.
- Recovery or reverse-migration strategy where safe.
- Compatibility between old and new application versions.

If safe reversal is not possible, restore from a verified backup or use
a documented corrective migration.

## 11. Backup Strategy

Google Sheets version history is useful but must not be the only
recovery plan.

The backup process must preserve:
- All required data tabs.
- Relationships between IDs.
- Historical payments and sessions.
- Audit records.
- Schema version and relevant configuration.
- The information required to restore the application.

Backups must be access-restricted and must not be placed in the public
frontend directory or committed to Git.

The backup frequency and retention period must reflect the volume and
importance of changes. At minimum, establish a scheduled backup and
take a verified backup before significant schema or import operations.

The implementation must document:
- Where backups are stored.
- Who can access them.
- How long they are retained.
- How restoration is performed.
- How restoration is tested.

Do not claim that a backup is valid until its contents have been
verified and a restoration test has succeeded.

## 12. Restore Procedure

A restore operation must be deliberate and restricted to the
administrator.

1. Identify the incident and the required recovery point.
2. Stop or limit writes while restoration is performed.
3. Select a known backup and verify its integrity.
4. Restore into a separate recovery spreadsheet first where practical.
5. Validate tabs, headers, schema version, IDs, and record counts.
6. Check payment totals and class balances.
7. Confirm relationships between students and related records.
8. Review audit history and import results.
9. Switch the backend to the restored datastore only after validation.
10. Perform smoke tests.
11. Record the recovery action and its outcome.
12. Resume normal writes only after verification.

A restore can discard changes made after the backup. The operator must
understand and document that risk before switching production.

## 13. Monitoring and Health Checks

Version 1 does not require a paid monitoring service.

Provide a protected health-check operation that can verify:
- Required configuration exists.
- The expected spreadsheet is accessible.
- Required tabs and headers exist.
- The schema version is supported.
- The API can execute a safe read.
- The current environment is identified correctly.

The health check must not return student records or secrets.

Operational monitoring should focus on:
- Failed authentication attempts at an appropriate aggregate level.
- API operation failures.
- Schema validation errors.
- Import failures.
- Spreadsheet access errors.
- Unexpected execution time or quota failures.
- Failed audit writes.

Avoid noisy logs and avoid recording personal data merely for
diagnostic convenience.

## 14. Troubleshooting

### Login fails
- Verify the configured OAuth client ID.
- Verify the allowed administrator identity.
- Check token expiry and audience validation.
- Check the browser console and safe backend error category.
- Confirm the production origin is configured correctly.

### API request fails
- Verify the frontend points to the intended deployment URL.
- Confirm the Apps Script deployment is active.
- Check browser cross-origin errors.
- Confirm the request carries the required authentication material.
- Inspect non-sensitive backend diagnostics.

### Spreadsheet access fails
- Verify the configured spreadsheet ID.
- Confirm the Apps Script execution identity has access.
- Confirm required tabs and headers exist.
- Check whether a schema migration is pending.
- Do not grant public spreadsheet access as a workaround.

### Student or payment data appears inconsistent
- Stop repeated edits that could worsen the inconsistency.
- Inspect the relevant student, obligation, payment, package, and session
  records by their stable IDs.
- Review audit and import results.
- Recalculate derived balances from source records.
- Correct the underlying records through an auditable operation.
- Verify the resulting balances before resuming normal work.

### Import partially fails
- Open the import batch report.
- Identify failed and duplicate-review rows.
- Correct mapping or source data.
- Retry only using the documented idempotent import procedure.
- Reconcile source and target counts after the retry.

## 15. Maintenance

Routine maintenance includes:
- Reviewing failed imports.
- Reviewing authentication and API failures.
- Checking schema health.
- Verifying backups.
- Testing restoration periodically.
- Removing obsolete test deployments when safe.
- Reviewing administrator access.
- Updating dependencies deliberately.
- Testing dependency updates before production.
- Reviewing Apps Script quotas and execution behavior.
- Confirming Vercel and Google platform terms remain suitable.

Dependency updates must not be applied blindly to production.

## 16. Cost and Quota Constraints

The design must avoid unnecessary recurring costs.

Use the selected Google and hosting plans only within their current
terms and quotas.

Before release, review:
- Apps Script execution and service quotas.
- Google Sheets practical performance limits for the expected workload.
- Vercel plan eligibility and usage limits.
- Any OAuth or identity-provider restrictions.
- Backup storage and operational overhead.

Do not add paid monitoring, databases, or third-party APIs unless a
documented requirement justifies the cost and the product owner approves
the change.

## 17. Operational Record

Maintain a short private operational record containing:
- Production frontend URL.
- Production Apps Script deployment reference.
- Repository location.
- Current production commit.
- Current backend deployment version.
- Production spreadsheet identifier.
- Environment configuration location.
- Backup location and last verified backup.
- Recovery instructions.
- Date of the last successful restore test.

Do not put secrets, access tokens, or private student data in this
record.

## 18. Acceptance Criteria

Deployment and operations are acceptable when:

1. Development and production are isolated.
2. The frontend can be built reproducibly from version-controlled source.
3. The Apps Script backend can be deployed and versioned.
4. Production configuration is not embedded in public frontend code.
5. Real student data is protected by server-side authorization.
6. The master spreadsheet remains private.
7. Browser-to-backend authentication and cross-origin behavior pass
   end-to-end tests.
8. A failed frontend deployment can be rolled back.
9. A failed backend deployment can be restored independently.
10. Backups can be verified and restored using documented steps.
11. Health checks reveal operational failures without exposing private data.
12. The administrator can diagnose common failures using the documented
    procedures.
13. No paid service is introduced without explicit approval.
14. Production use complies with the selected hosting and platform terms.

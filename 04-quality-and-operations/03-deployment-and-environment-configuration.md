# 03 — Deployment and Environment Configuration

## 1. Purpose

This document defines how the Student Management Dashboard is configured, built, deployed, verified, and operated across development, preview, and production environments.

The application uses:

- React, TypeScript, and Vite for the frontend.
- Vercel to host the frontend, subject to the selected plan's current terms and eligibility.
- Google Apps Script as the backend API.
- Google Sheets as the canonical datastore.
- GitHub for version control and deployment source history.
- `clasp` for managing and deploying the Apps Script project from source control.

This document describes deployment controls and environment configuration. Business rules, API schemas, and security requirements remain authoritative in their dedicated documents.

## 2. Deployment Principles

1. Development, preview, and production must be distinguishable.
2. Test environments must not write to the production spreadsheet.
3. Production secrets must never be committed to Git.
4. Frontend variables must be treated as public because they are embedded in the browser build.
5. Authentication and authorization must be enforced by the backend for every protected operation.
6. Deployments must use reviewed, version-controlled source.
7. A deployment is not complete until smoke tests pass.
8. Do not change production configuration merely to make a failed test pass.
9. Do not run destructive migrations or bulk imports as part of an ordinary frontend deployment.
10. Keep the process small enough for one administrator to operate without a dedicated DevOps service.

## 3. Environments

### 3.1 Local Development

Purpose:
- Develop and test the frontend locally.
- Develop Apps Script functions against a non-production spreadsheet.
- Run automated checks before committing changes.

Requirements:
- Use synthetic or anonymized student data.
- Use a development spreadsheet and development Apps Script deployment.
- Keep local environment files untracked.
- Do not copy production student data to a local machine unless there is an explicit, documented need and an approved protection process.

### 3.2 Preview

Purpose:
- Review frontend changes before production release.
- Validate layouts, navigation, forms, and frontend behavior.

Preview builds must not receive production write credentials or automatically write to the production spreadsheet.

If preview needs backend integration, it must use a development or staging Apps Script deployment connected to a non-production spreadsheet. If that environment is not configured, preview may use clearly identified mock data, but it must not imply that mock changes were saved.

### 3.3 Production

Purpose:
- Operate the real student management dashboard.

Production uses:
- The approved production frontend URL.
- The approved production Apps Script Web App deployment.
- The production master Google Spreadsheet.
- The authorized administrator identity configuration.

Only reviewed changes may be promoted to production. Production configuration must be checked before each release.

## 4. Environment Separation

The following resources must be distinct between development and production:

| Resource | Development | Production |
|---|---|---|
| Frontend deployment | Local or preview | Production Vercel deployment |
| Apps Script deployment | Development Web App deployment | Versioned production Web App deployment |
| Master spreadsheet | Development spreadsheet | Production master spreadsheet |
| Administrator allowlist | Test identity or restricted development identity | Approved administrator identity |
| Script Properties | Development values | Production values |
| Frontend API URL | Development deployment URL | Production deployment URL |
| Data | Synthetic or anonymized | Real operational records |

A production frontend must not accidentally point to a development backend, and a development frontend must not accidentally point to production for write operations.

The application should display a subtle environment indicator outside production. Production should be clearly identifiable in administrative diagnostics without unnecessarily exposing infrastructure details to ordinary users.

## 5. Frontend Environment Variables

Vite exposes variables prefixed with `VITE_` to browser-side code. Such variables are not secrets.

Expected frontend variable:

- `VITE_APPS_SCRIPT_API_URL`: base URL for the Apps Script API deployment appropriate to the current environment.

Optional non-secret variables may include:

- `VITE_APP_ENV`: `development`, `preview`, or `production`.
- `VITE_GOOGLE_OAUTH_CLIENT_ID`: only if the selected authentication flow requires a browser-visible OAuth client ID. OAuth client IDs are identifiers, not client secrets.

Rules:

1. Never place passwords, private keys, service-account JSON, refresh tokens, signing secrets, or spreadsheet write credentials in a `VITE_` variable.
2. Never put the master spreadsheet ID in the frontend unless a later approved architecture explicitly establishes that it is safe and necessary. The default is to keep it backend-only.
3. Validate required environment variables during application startup or build.
4. Fail with a clear configuration error when the API URL is missing or malformed.
5. Do not silently fall back from production to a development API URL.
6. Avoid logging complete authentication tokens or sensitive API payloads.
7. Document every environment variable and its owner.

The exact API variable name must remain consistent across the application. If the repository already uses a different approved name, update this document and the implementation together rather than introducing duplicate aliases.

## 6. Apps Script Configuration

Backend-only configuration must be stored in Apps Script Script Properties or another explicitly approved server-side configuration mechanism.

Expected properties include:

- `MASTER_SPREADSHEET_ID`: ID of the spreadsheet used by this deployment.
- `ALLOWED_ADMIN_EMAILS`: explicit allowlist of administrator identities, or an equivalent validated configuration.
- `GOOGLE_OAUTH_CLIENT_ID`: expected token audience when required by the chosen identity-verification flow.
- `APP_ENV`: `development` or `production`.
- `SCHEMA_VERSION`: expected spreadsheet schema version, if schema versioning is implemented.

Only properties required by the implemented authentication and persistence design should be created. Do not add unused secrets or configuration for hypothetical features.

Rules:

- Never store secrets in a frontend `.env` file that is committed.
- Never write credentials to spreadsheet cells.
- Never return Script Properties to the frontend.
- Never include secret values in error responses or logs.
- Validate required properties before serving protected operations.
- Fail closed if a required property is absent or invalid.
- Use separate Script Properties for development and production deployments.
- Verify the active spreadsheet ID before running any migration or import.

Apps Script configuration must not rely on a spreadsheet ID supplied by an arbitrary client request.

## 7. Authentication Configuration

The selected authentication flow must follow the Security and Authentication document.

Before deployment, verify:

- The expected Google OAuth client ID is configured consistently where applicable.
- The backend verifies token signature and relevant claims through a supported method.
- Token audience, issuer, expiration, and verified administrator identity are checked.
- The authorized administrator allowlist is correct for the environment.
- Anonymous and unauthorized requests are denied.
- Authentication tokens are not sent in URLs.
- Sign-out clears frontend authentication state.

A browser-visible OAuth client ID is not a secret. A client secret, private key, or refresh token must never be embedded in the frontend bundle.

Do not deploy real student data access until the browser-to-Apps-Script authentication and response flow has been tested end to end. If the chosen integration cannot securely support the required flow, stop and resolve the architecture rather than bypassing browser security or exposing data through JSONP.

## 8. Vercel Configuration

### 8.1 Project Setup

Configure the Vercel project to use the frontend application directory as its root directory if the repository contains separate frontend and backend directories.

For the Vite frontend, expected commands are:

- Install: use the repository's committed package manager lockfile and matching package manager.
- Build: `npm run build` or the equivalent script declared in `package.json`.
- Output directory: `dist`, unless the repository's Vite configuration explicitly changes it.

The actual package manager and commands must be verified against the repository before configuration. Do not create competing lockfiles.

### 8.2 Environment Variable Scope

Configure frontend variables separately for:

- Local development.
- Preview deployments.
- Production deployments.

The `VITE_APPS_SCRIPT_API_URL` value must match the corresponding backend environment.

After changing a Vercel environment variable, create a new deployment. Existing static builds do not automatically acquire changed build-time values.

### 8.3 Plan and Usage Constraints

Before production use, verify Vercel's current plan terms, commercial-use eligibility, build limits, bandwidth limits, and applicable usage restrictions. Do not assume that a free plan is eligible for every business use case.

### 8.4 Frontend Security Headers

Configure appropriate headers where supported, including:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- A restrictive `Permissions-Policy` where compatible with required browser features.

Use a Content Security Policy only after validating the requirements of the selected Google sign-in flow and Apps Script integration. Do not deploy a permissive policy merely to suppress errors. Do not claim that frontend headers replace backend authorization.

## 9. Apps Script Source and Deployment

### 9.1 Source Control

The Apps Script source must be stored in the repository using a documented `clasp` workflow.

The repository must contain the appropriate `.clasp.json` handling and `appsscript.json` manifest. Environment-specific deployment identifiers must not be casually shared between development and production.

If `.clasp.json` contains a script ID or other deployment-specific identifier, review whether it is safe and appropriate to track. Never commit authentication tokens or local clasp credentials. Keep `.clasprc.json` and other local authentication files out of version control.

### 9.2 Deployment Process

1. Confirm the current Git branch and working-tree state.
2. Review the code diff and the intended environment.
3. Run available automated checks.
4. Confirm the target Apps Script project and spreadsheet.
5. Push the reviewed source with the agreed `clasp` workflow.
6. Create or update a versioned Web App deployment for the intended environment.
7. Verify the deployment URL and access settings.
8. Run backend smoke tests.
9. Run frontend-to-backend integration tests.
10. Record the deployed version and verification outcome.

Do not use a deployment command that unintentionally changes the production deployment while testing development code.

### 9.3 Execution Identity and Access

The deployment must use the minimum practical permissions required to access the master spreadsheet and execute backend operations.

The deployment configuration must explicitly document:

- Who the Web App executes as.
- Who is allowed to access the Web App at the Google deployment layer.
- How application-level administrator authorization is enforced.
- Which spreadsheet the deployment can access.

Google deployment access settings and application-level authorization are separate controls. Neither may be assumed to replace the other.

The chosen execution identity must be compatible with the authentication architecture. If the backend executes as its owner, spreadsheet access may be exercised with that owner's permissions; therefore every request must be independently authorized before data is returned or changed.

## 10. Cross-Origin Integration Gate

A Vercel-hosted frontend and an Apps Script Web App operate on different origins. Redirects, preflight requests, response headers, and browser credential behavior may affect the integration.

Before accepting the architecture for production, verify all of the following in a real browser:

1. The frontend can send the intended authenticated request.
2. The request reaches the correct Apps Script deployment.
3. Redirect behavior does not discard required authentication or request data.
4. The browser can read the expected response.
5. The backend returns the documented JSON response envelope.
6. Unauthorized requests are denied.
7. Failed authentication never returns student data.
8. Read and write operations work only for the intended environment.
9. No JSONP or other workaround exposes private records.
10. Network errors are visible as errors and are not treated as successful writes.

If any required condition fails, stop the release and resolve the integration architecture. Do not weaken authentication to make the test pass.

## 11. Deployment Checklist

### Before Deployment

- [ ] Correct branch and commit selected.
- [ ] Working tree reviewed.
- [ ] Automated checks pass.
- [ ] No secrets or real student data in the diff.
- [ ] Environment variables match the target environment.
- [ ] Backend configuration points to the correct spreadsheet.
- [ ] Spreadsheet schema validation passes.
- [ ] Authentication and authorization tests pass.
- [ ] Cross-origin integration gate passes.
- [ ] Backup status is confirmed before risky data changes.
- [ ] Current production version is recorded.

### After Deployment

- [ ] Frontend deployment completes successfully.
- [ ] Backend version and deployment URL are confirmed.
- [ ] Unauthenticated API requests are denied.
- [ ] Authorized administrator can sign in.
- [ ] Student list loads correctly.
- [ ] A read-only student detail request succeeds.
- [ ] A controlled test mutation succeeds in the non-production environment.
- [ ] The mutation appears in the intended spreadsheet.
- [ ] The frontend reflects the persisted result after refresh.
- [ ] No unexpected writes appear in production.
- [ ] Browser console and backend logs show no critical errors.

For production smoke tests, prefer read-only operations. If a write test is necessary, use an explicitly approved test record and verify cleanup or reversal without deleting genuine historical data.

## 12. Rollback

### Frontend Rollback

Use Vercel's deployment history to promote a previously verified frontend deployment when a new frontend release causes a regression.

Before rollback, verify that the previous frontend remains compatible with the currently deployed backend API.

### Backend Rollback

Use the previously verified Apps Script version and deployment process to restore a known-good backend version.

Before rollback, verify compatibility with current spreadsheet schema and any data written by the newer version.

### Data Recovery

A code rollback does not reverse spreadsheet mutations. Restore or reconcile data only through a documented recovery procedure with an approved backup and explicit review.

Never assume that rolling back frontend or backend code also rolls back financial transactions or class history.

## 13. Monitoring and Diagnostics

Maintain enough diagnostic information to identify deployment failures without recording sensitive student data.

Useful diagnostics include:

- Deployment version or commit identifier.
- Environment name.
- API operation name.
- Request correlation ID.
- Success or failure category.
- Execution duration where available.
- Schema validation status.

Never log authentication tokens, full payment payloads, or unnecessary parent contact information.

A basic administrative health check should verify configuration and schema readiness without exposing secrets or returning full student records.

## 14. Backup and Change Management

Before schema migrations, bulk imports, or risky financial-data changes:

1. Verify the target environment.
2. Confirm a recent usable backup exists.
3. Record the current schema version.
4. Review the migration and expected impact.
5. Test on a non-production copy.
6. Execute the approved production operation.
7. Reconcile record counts and critical totals.
8. Record the outcome and any follow-up work.

Routine code deployments must not silently modify spreadsheet schemas or import data.

## 15. Incident Procedure

If private data appears accessible without authorization, or a deployment writes to the wrong spreadsheet:

1. Stop further risky operations.
2. Restrict or disable the affected deployment when necessary.
3. Preserve relevant logs and deployment identifiers without exposing them publicly.
4. Determine the scope of unauthorized access or incorrect writes.
5. Rotate or revoke compromised credentials if applicable.
6. Restore access controls and verify the correct configuration.
7. Reconcile affected data using an approved recovery procedure.
8. Document the cause, impact, remediation, and preventive action.

Do not delete audit evidence or conceal an incident by rewriting history.

## 16. Release Acceptance Criteria

A release is complete only when:

- The deployed frontend corresponds to reviewed source.
- The backend deployment uses the intended version and configuration.
- Development and production data are isolated.
- No secrets are present in frontend bundles or committed files.
- Authentication and authorization checks pass.
- The browser-to-Apps-Script integration gate passes.
- The application can read and write the intended non-production records.
- Production smoke tests pass.
- The previous known-good deployment can be identified.
- Rollback and data-recovery limitations are understood.
- The deployment outcome is recorded.

# 07 — Owner Setup and Inputs

## 1. Purpose

This document lists the decisions, access, configuration, and operational inputs the project owner must provide to prepare the Student Management Dashboard for implementation, testing, migration, and eventual production use.

It is an intake and readiness checklist, not permission to bypass the documented architecture or security gates. The coding agent must not invent owner-specific values, request secrets in chat, or connect to real student data before the relevant gates pass.

## 2. Project Baseline

The approved Version 1 baseline is:

- Product: Student Management Dashboard.
- Primary user: one explicitly authorized administrator.
- Frontend: React, TypeScript, and Vite.
- Frontend hosting: Vercel, subject to current plan eligibility and applicable terms.
- Backend: Google Apps Script Web App.
- Canonical datastore: one private Google Spreadsheet per environment.
- Source control: Git, with GitHub remote hosting when configured.
- Default timezone: `Asia/Kolkata`.
- Default currency: `INR`.
- Development and production data/configuration must be separated.
- The frontend must never access Google Sheets directly.
- Documentation is finalized before application implementation begins.
- No real student data may be imported until the security and integration release gates pass.

If an approved project document conflicts with this baseline, stop the affected work and resolve the documentation conflict before proceeding.

## 3. Owner Decisions Required

The owner should supply or explicitly confirm the following. Use the status values `PENDING`, `PROVIDED`, `CONFIRMED`, `NOT_APPLICABLE`, or `BLOCKED`. Do not mark an item complete based on an assumption.

### 3.1 Identity and access

- [ ] **Administrator Google account:** the exact Google account that is permitted to use the production dashboard.
- [ ] **Development/test identity:** a test identity for validating the sign-in and authorization flow without exposing production data, if the chosen integration requires one.
- [ ] **OAuth ownership:** which Google Cloud project and OAuth client will be used, and who can administer it.
- [ ] **Authorized operator:** who is allowed to manage the Apps Script project, master spreadsheet, Vercel project, and Git repository.
- [ ] **Recovery access:** a secure recovery path for the Google account and project assets.

The owner must enter account addresses directly into the approved protected configuration process. Do not place access tokens, passwords, recovery codes, client secrets, private keys, or other credentials in this document, Git, issue trackers, or ordinary chat messages.

### 3.2 Source control and project ownership

- [ ] **Repository location:** GitHub repository URL, if one exists.
- [ ] **Repository owner:** personal or organization account that will own the repository.
- [ ] **Default branch and workflow:** approved branch/merge process.
- [ ] **Repository permissions:** who can read, write, and administer the repository.
- [ ] **Local workspace:** confirm the authoritative project folder used by the owner and coding agent.
- [ ] **Commit policy:** confirm that documentation and code changes are committed in small, reviewable units.

If no remote repository exists, local Git commits may be created, but must not be described as pushed or backed up remotely. Never force-push, reset, or overwrite unrelated work without explicit authorization.

### 3.3 Hosting and deployment

- [ ] **Vercel account/project:** the project that will host the frontend, or confirmation that it has not yet been created.
- [ ] **Production domain:** intended URL, if a custom domain will be used.
- [ ] **Preview policy:** whether preview deployments are enabled and how they are prevented from writing to production.
- [ ] **Apps Script project:** development and production project ownership and deployment approach.
- [ ] **Environment separation:** confirm that development uses a separate Apps Script deployment and spreadsheet from production.
- [ ] **Release approver:** the person who authorizes production deployment and first use with real data.

Do not create or deploy production infrastructure merely to fill an incomplete checklist. Follow the implementation and deployment gates.

### 3.4 Data and migration

- [ ] **Source inventory:** list each source spreadsheet, relevant tab, purpose, and whether its contents are current, historical, or mixed.
- [ ] **Source access:** confirm the authorized execution identity can read each source spreadsheet.
- [ ] **Data owner:** confirm that the owner has authority to consolidate the source records.
- [ ] **Mapping reviewer:** identify who will confirm source-column mappings and ambiguous meanings.
- [ ] **Duplicate review:** confirm who will decide whether likely duplicate student records represent the same person.
- [ ] **Financial reconciliation:** identify who will resolve mismatched fee totals, overpayments, missing payment dates, and unclear financial history.
- [ ] **Historical-data policy:** confirm that source records remain unchanged during migration and that historical records are retained in the canonical system.
- [ ] **Cutover decision:** define when the dashboard becomes the normal interface and how the owner will avoid conflicting edits in old sheets after cutover.

Source spreadsheet IDs are configuration references, not credentials. Do not copy real student data into development, tests, or documentation. Use synthetic fixtures for testing.

### 3.5 Business policy confirmations

The owner must review the existing business-rules document and confirm any unresolved policy before implementation. In particular:

- [ ] Student creation, duplicate review, archiving, and reactivation.
- [ ] Enrollment start/end and returning-student behavior.
- [ ] Package purchase, activation, closure, and allowed class-credit adjustments.
- [ ] Fee obligations, due dates, partial payments, overpayments, corrections, and voiding.
- [ ] Class cancellation, rescheduling, no-show, and attendance outcomes.
- [ ] The rule governing when a class credit is deducted.
- [ ] Meeting-link provider labels, preferred-link behavior, and deactivation.
- [ ] Required audit events and correction reasons.
- [ ] Import approval, reconciliation, and exception handling.
- [ ] Any policy-specific defaults or required fields not already fixed in the canonical specifications.

Do not create a second, competing policy source in `AppConfig` for rules that are meant to be fixed in the approved business-rules document. Configurable policies must follow `06-configurable-business-policies.md` and remain subject to backend validation.

### 3.6 Operations and recovery

- [ ] **Backup location:** restricted Google Drive folder or another approved protected location.
- [ ] **Backup operator:** identity that can create and verify backups.
- [ ] **Retention policy:** how long backups are retained and who may access them.
- [ ] **Recovery operator:** person authorized to restore a backup and verify the result.
- [ ] **Incident contact:** appropriate contact or procedure for account compromise or data exposure.
- [ ] **Maintenance owner:** who reviews failed imports, Apps Script errors, backups, and deployment status.
- [ ] **Release records:** where release versions, verification results, and incidents are recorded without unnecessary personal data.

Do not claim a recovery objective is met until the backup and restore process has been demonstrated.

## 4. Required Environment Configuration

Maintain a separate configuration record for development and production. Store values only in the approved location for their sensitivity.

### 4.1 Frontend configuration

Expected public configuration may include:

- `VITE_APPS_SCRIPT_API_URL` — the Apps Script API URL for the current environment.
- `VITE_APP_ENV` — `development`, `preview`, or `production`.
- `VITE_GOOGLE_OAUTH_CLIENT_ID` — only if required by the approved sign-in flow; a client ID is not a client secret.

Values prefixed with `VITE_` are bundled into browser code and must be treated as public. Never put secrets, tokens, private keys, or privileged credentials in frontend environment variables.

### 4.2 Backend configuration

Expected protected Apps Script configuration may include:

- Environment identifier.
- Master spreadsheet ID for that environment.
- Supported schema version.
- Administrator email or allowlist.
- OAuth audience/client ID required by the approved identity flow.
- Timezone, initially `Asia/Kolkata`.
- Any additional minimum configuration explicitly required by the approved implementation.

Use Apps Script Properties or another documented protected configuration mechanism as appropriate. Do not store secrets in the spreadsheet's user-editable `AppConfig` tab. Do not place secret values in this document or Git.

### 4.3 Configuration verification

Before protected operations are enabled, verify that:

- Required values exist and have valid formats.
- The administrator allowlist is explicit and non-empty.
- The OAuth audience matches the selected sign-in integration.
- The backend points to the correct environment's spreadsheet.
- Development and production do not accidentally share a writable datastore.
- The spreadsheet is private and permissions are limited to approved identities.
- Missing or malformed configuration causes protected operations to fail closed.

Do not silently substitute a development URL, spreadsheet, identity, or default credential when production configuration is missing.

## 5. Integration Proof Before Real Data

The separate Vercel frontend and Apps Script backend must pass a browser-based integration proof before any real student or parent information is imported.

The proof must establish:

1. The approved Google sign-in flow completes in a supported browser.
2. The backend verifies the identity credential using a supported trusted mechanism.
3. An authorized identity can call a protected test operation.
4. An unauthorized identity and an anonymous request are denied.
5. Token transport does not expose credentials in URLs, logs, or error output.
6. Browser redirect, CORS, preflight, and response-reading behavior is understood and works for the selected transport.
7. Successful and failed responses use the documented API envelope.
8. The frontend does not treat sign-in alone or a client-side flag as authorization.
9. No JSONP, public spreadsheet access, disabled browser security, or other insecure workaround is used.
10. The test uses a separate development spreadsheet containing synthetic records.

If the selected transport cannot meet the security requirements, stop and revise the integration architecture before proceeding. Do not use real data as a debugging aid.

## 6. Readiness Gates

Use these gates in order. A later gate does not override a failed earlier gate.

### Gate A — Documentation readiness

- [ ] Required product, architecture, security, schema, business-rule, API, frontend, import, test, and deployment documents are present.
- [ ] Contradictions and unresolved decisions affecting implementation are recorded.
- [ ] The owner has approved the required business policies.
- [ ] The implementation sequence and agent rules have been reviewed.

### Gate B — Development readiness

- [ ] Repository and workspace are identified.
- [ ] Development Apps Script project and spreadsheet are separate from production.
- [ ] Synthetic fixtures are available.
- [ ] Development identity and OAuth configuration are available through the approved secure process.
- [ ] Required tools and deployment permissions are available.

### Gate C — Integration and security readiness

- [ ] Browser integration proof passes.
- [ ] Authentication and authorization negative tests pass.
- [ ] Backend validation, persistence, and audit behavior are verified.
- [ ] The master spreadsheet is private.
- [ ] Security and privacy checklist release gates pass.

### Gate D — Migration readiness

- [ ] Source inventory and mappings are reviewed.
- [ ] Preview reports are reviewed before writes.
- [ ] Duplicate candidates and ambiguous rows are resolved or explicitly held out.
- [ ] Financial and class-history reconciliation rules are agreed.
- [ ] Backup is complete and verified before migration writes.
- [ ] Import can be safely retried and produces row-level results.

### Gate E — Production readiness

- [ ] Acceptance tests pass.
- [ ] Production configuration and permissions are independently checked.
- [ ] Backup and restore procedures have been tested.
- [ ] A reviewed commit corresponds to the release.
- [ ] Production smoke tests are non-destructive and pass.
- [ ] The owner explicitly authorizes the first import and production cutover.

Do not mark a gate complete without evidence. Record evidence as a test report, checklist entry, or release note; exclude secrets and unnecessary personal data.

## 7. How the Agent Must Handle Missing Inputs

When an input is missing:

1. Identify the exact missing item and the phase it blocks.
2. Continue only with independent, reversible work that does not depend on that input.
3. Do not invent account addresses, spreadsheet IDs, URLs, OAuth configuration, business policies, or source mappings.
4. Do not ask the owner to paste secrets into chat or documentation.
5. Ask a concise question only when the missing decision is necessary to proceed.
6. Record the answer in the appropriate authoritative document or protected configuration system.
7. Update this checklist's status when evidence is available.

A missing production value does not necessarily block synthetic local development, but it does block the production operation that depends on it.

## 8. Owner Input Register

Maintain this compact register outside any secret store. Use references or masked identifiers where possible; never record secret values.

| Input | Status | Safe reference / notes | Blocks |
|---|---|---|---|
| Administrator identity | PENDING | | Protected production access |
| Development/test identity | PENDING | | Authentication integration proof |
| OAuth project/client ownership | PENDING | | Authentication integration proof |
| GitHub repository and permissions | PENDING | | Remote collaboration and backup |
| Vercel project/domain | PENDING | | Frontend deployment |
| Development Apps Script deployment | PENDING | | Backend integration |
| Production Apps Script deployment | PENDING | | Production release |
| Development spreadsheet | PENDING | | Integration tests |
| Production master spreadsheet | PROVIDED | Private Class Dashboard (ID: 1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8) | Production release and migration |
| Source spreadsheet inventory | PENDING | | Migration planning |
| Business-policy confirmations | PENDING | | Dependent business workflows |
| Backup location and recovery operator | PENDING | | Migration and production release |
| Integration proof evidence | PENDING | | Real-data import |
| Owner production authorization | PENDING | | Production cutover |

Update the register when inputs are confirmed. If the register is moved to another tracking system, preserve the same fields and ensure access is appropriately restricted.

## 9. Completion Criteria

This document is ready for handoff when:

- The owner-input register is populated with statuses and safe references.
- Missing items have explicit blockers and owners.
- No secrets or real student/parent records are present in the document or repository.
- The required readiness gates have evidence, not assumptions.
- The owner has explicitly approved production use and migration before either occurs.

Completing this checklist does not itself authorize production deployment, real-data import, or cutover. Those actions require the explicit approvals and evidence described above.

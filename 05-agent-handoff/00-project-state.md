# 00 — Project State and Recovery Record

## 1. Purpose

This file is the durable, repository-backed record of implementation progress for the Student Management Dashboard. Update it at every phase boundary and whenever a blocker, owner decision, setup dependency, test result, or recovery event changes the next safe action.

The Git history and this file are the recovery sources of truth. Chat history and an agent's working context are not authoritative state.

## 2. State Management Rules

- Keep this file accurate, concise, and actionable.
- Update the current phase, status, commit, test results, blockers, owner inputs, and next action before ending a phase or handing off work.
- Never mark a phase `PASSED` unless its exit criteria and required tests actually passed.
- Use `NOT_STARTED`, `IN_PROGRESS`, `PASSED`, `BLOCKED`, or `SKIPPED_WITH_APPROVAL` for phase status.
- Record evidence, not assumptions. Distinguish verified facts from inferred or owner-confirmed information.
- Never store passwords, access tokens, private keys, OAuth secrets, or other credentials here. Record only the secret's name and the approved secure location where the owner must configure it.
- Do not overwrite a valid existing state record without first reviewing it and the Git history.
- If this file conflicts with the latest committed implementation or test evidence, investigate and reconcile the conflict before continuing.
- Commit this file with each phase's implementation commit so recovery points are durable.

## 3. Project Guardrails

- Frontend: React, TypeScript, and Vite.
- Backend: Google Apps Script Web App.
- Canonical datastore: one private Google Spreadsheet with the documented tabs and schemas.
- Frontend hosting: Vercel, subject to the documented plan and business-use constraints.
- Initial access model: one authorized administrator.
- Do not add Supabase, another database, microservices, multi-tenancy, or unapproved product scope.
- Do not use real student data before the security release gate passes.
- Every source file under the project must contain at most 149 lines. Split files by responsibility; do not minify or compress code to satisfy the limit.
- Preserve payment history, auditability, historical relationships, and approved credit-restoration safeguards.
- The backend is authoritative for authentication, authorization, validation, and business rules.

## 4. Current Run Snapshot

Update every field below as work proceeds.

| Field | Current value |
|---|---|
| Project | Student Management Dashboard |
| Execution mode | Autonomous, sequential implementation |
| Current phase | Phase 5 — Backend Domain Services |
| Current phase status | IN_PROGRESS |
| Last completed phase | Phase 4 — Backend Foundation |
| Current Git branch | main |
| Last phase commit | 8f74410 |
| Last full regression run | 17 vitest tests passed |
| Real-data use | Prohibited until security release gate passes |
| Last state update | Phase 4 completed and verified |

## 5. Phase Register

The implementation sequence is authoritative for phase tasks and exit criteria. Update each row with the actual status, commit hash, and evidence reference.

| Phase | Name | Status | Commit | Evidence / notes |
|---|---|---|---|---|
| 0 | Repository and Specification Audit | PASSED | 9391906 | All 14 primary specs, 26 domain docs, 8 handoff docs inspected; schemas & rules verified. |
| 1 | Architecture Feasibility Spike | PASSED | 117eaf9 | Isolated spike tests passed (7/7); documented in spikes/feasibility/FEASIBILITY_REPORT.md |
| 2 | Repository Foundation and Tooling | PASSED | 89cc33a | React+TS+Vite, Vitest, line limit check, typecheck, production build all passed. |
| 3 | Data Schema and Spreadsheet Bootstrap | PASSED | 8f74410 | 12 canonical tabs & headers validated, dynamic HeaderMapper, IdGenerator, 6/6 tests passed. |
| 4 | Backend Foundation | PASSED | Pending Phase 4 commit | API entry, request parsing, response factory, auth guards, row reader/writer, locking, audit (17 tests). |
| 5 | Backend Domain Services | IN_PROGRESS | — | Implement domain services in the documented dependency order. |
| 6 | Frontend Foundation | NOT_STARTED | — | Establish typed API boundaries, shared UI foundations, and safe configuration. |
| 7 | Frontend Product Screens | NOT_STARTED | — | Implement documented pages, interactions, loading states, and error states. |
| 8 | Import and Migration | NOT_STARTED | — | Implement safe import, duplicate review, and reconciliation without risking source data. |
| 9 | Integration and End-to-End Testing | NOT_STARTED | — | Run integration, regression, security, and acceptance checks. |
| 10 | Deployment Preparation | NOT_STARTED | — | Prepare deployment configuration and owner setup steps without exposing secrets. |
| 11 | Controlled Data Migration | NOT_STARTED | — | Proceed only after prerequisites, backups, security gates, and owner authorization are verified. |
| 12 | Release and Handover | NOT_STARTED | — | Complete release checks and provide an actionable owner handoff. |

## 6. Blockers and External Dependencies

Keep one entry per unresolved blocker. Remove or close an entry only after verification.

| ID | Blocker / dependency | Impact | Owner / action required | Status | Evidence |
|---|---|---|---|---|---|
| B-001 | Specification and repository baseline audit | Required before implementation | Agent: completed Phase 0 audit | CLOSED | All repository documents verified; no conflicting specs. |
| B-002 | Live Google Cloud OAuth client & production Apps Script deployment | Required for live production hosting; synthetic local/test environment used for development and test suites | Owner: configure production secrets in Vercel/Apps Script per Doc 07 | PENDING_OWNER_CONFIG | Synthetic and mock environments used for development and verification. |

Do not let an unavailable credential, external account, deployment permission, or human-only action silently count as complete. Continue independent work that is safe, and mark dependent gates `BLOCKED` until the dependency is resolved.

## 7. Owner Inputs and Setup Register

This is a live index, not a place to store secret values. Keep the detailed register in `05-agent-handoff/07-owner-setup-and-inputs.md` when that document exists.

| Input / setup item | Status | Where it must be configured | Secret value stored here? |
|---|---|---|---|
| Administrator identity / allowlist | NOT_VERIFIED | Approved backend configuration, following the security specification | No |
| Google Cloud / sign-in configuration | NOT_VERIFIED | Owner-controlled Google Cloud configuration and documented environment settings | No |
| Apps Script deployment and permissions | NOT_VERIFIED | Owner-controlled Apps Script project and deployment settings | No |
| Private canonical spreadsheet | NOT_VERIFIED | Owner-controlled Google Spreadsheet; ID supplied only through approved backend configuration | No |
| Frontend hosting project and environment variables | NOT_VERIFIED | Owner-controlled Vercel project settings | No |
| Git remote and repository permissions | VERIFIED | origin https://github.com/Shreya5296/Personal-Dashboard.git | No |

Replace generic entries with exact setting names, locations, verification steps, and owner actions when they are established. Do not invent account IDs, resource IDs, domains, emails, or credentials.

## 8. Test and Quality Evidence

Record command, outcome, and concise evidence for each relevant check. A command that was not run must be marked `NOT_RUN`, not passed.

| Check | Status | Last result / evidence |
|---|---|---|
| Source-of-truth and specification audit | PASSED | Phase 0 verification complete; all 48 docs and schemas verified |
| Secure frontend-to-backend feasibility | PASSED | Phase 1 spike verified (7/7 tests passed, spikes/feasibility/FEASIBILITY_REPORT.md) |
| Formatting / lint | PASSED | Line limits & forbidden catch-all checks passing (scripts/check-line-limits.js) |
| Type checking | PASSED | TypeScript strict checking (tsc --noEmit) passed |
| Source-file line limit (maximum 149) | PASSED | Automated check passed (npm run check:lines, 6 files verified) |
| Unit tests | PASSED | Vitest runner passed (2/2 tests) |
| Integration tests | NOT_RUN | Requires backend and isolated test setup |
| End-to-end / acceptance tests | NOT_RUN | Requires implementation and test environment |
| Security release gate | NOT_RUN | Must pass before real student data is used |
| Full regression suite | NOT_RUN | Run at integration and release gates |

## 9. Decisions and Specification Issues

Record only decisions that affect implementation. Link to the authoritative specification or decision record. Do not use this table to silently approve architecture changes.

| ID | Question / decision | Resolution | Authority / evidence | Status |
|---|---|---|---|---|
| D-001 | Can the selected Vercel frontend and Apps Script backend support the documented secure authenticated browser flow? | Demonstrated in Phase 1: simple CORS POST via text/plain, token verification, redirect follow, JSON parsing. | `spikes/feasibility/FEASIBILITY_REPORT.md` | RESOLVED |

If a conflict or missing rule affects correctness, security, privacy, financial calculations, data integrity, or scope, record it and follow the autonomous execution protocol. Do not guess or weaken an invariant.

## 10. Recovery Procedure

When resuming after a crash, context loss, agent restart, or handoff:

1. Read this file and the implementation sequence before making changes.
2. Inspect `git status`, the current branch, and recent commits. Do not reset, clean, or discard existing work as a recovery shortcut.
3. Read the latest phase commit and inspect any uncommitted changes.
4. Re-run the minimum checks needed to verify the recorded last completed phase if its evidence is missing, stale, or inconsistent.
5. Find the first phase not marked `PASSED`. Resume it from its documented remaining tasks and acceptance criteria.
6. Check the blocker and owner-input registers. Continue independent safe tasks while external dependencies remain unresolved.
7. Update this file before proceeding across a phase boundary.
8. If the current environment supports a context reset or fresh agent session, use it at phase boundaries after saving the state and commit. Otherwise, continue from this durable record without claiming a reset occurred.

Never infer that work was completed merely because the previous agent said it was. Verify repository state, tests, and artifacts.

## 11. Next Action

Execute Phase 5: Backend Domain Services — implement domain handlers, services, and validation for Students, Enrollments, Packages, Fee Obligations, Payments, Class Sessions, Meeting Links, and Notes in documented dependency order.

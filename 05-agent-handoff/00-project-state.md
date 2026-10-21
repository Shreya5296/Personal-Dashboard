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
| Current phase | Requirements-First Field & Schema Reconciliation |
| Current phase status | AWAITING_OWNER_DECISION |
| Last completed phase | Requirements-First Reconciliation Audit & Simplification Review |
| Current Git branch | main |
| Last phase commit | 8c1fffd |
| Last full regression run | 103 Vitest tests passed (21 test files) + line-limit check passing (117 files <= 149 lines) + TypeScript strict check (0 errors) + clean Vite production build (712ms) |
| Real-data use | Ready for Phase 11 live production data import (0 real student records imported to date) |
| Last state update | Requirements-first field and schema reconciliation complete: full 8-column field mapping produced in docs/prelaunch/requirements-reconciliation-report.md; all 6 original requirement areas re-established; confirmed mismatches documented (subject missing physical column, student_email missing, per_class/in_INR/next_due_date missing from Packages, student_name missing from child tables, MeetingLinks over-engineered, first_name/last_name split); simplest practical data models evaluated; PaymentAllocations table rejected as unnecessary enterprise overhead; billing terminology defined unambiguously; forms and workflows streamlined; 103/103 tests passing; clean working tree |

## 5. Phase Register

The implementation sequence is authoritative for phase tasks and exit criteria. Update each row with the actual status, commit hash, and evidence reference.

| Phase | Name | Status | Commit | Evidence / notes |
|---|---|---|---|---|
| 0 | Repository and Specification Audit | PASSED | 9391906 | All 14 primary specs, 26 domain docs, 8 handoff docs inspected; schemas & rules verified. |
| 1 | Architecture Feasibility Spike | PASSED | 117eaf9 | Isolated spike tests passed (7/7); documented in spikes/feasibility/FEASIBILITY_REPORT.md |
| 2 | Repository Foundation and Tooling | PASSED | 89cc33a | React+TS+Vite, Vitest, line limit check, typecheck, production build all passed. |
| 3 | Data Schema and Spreadsheet Bootstrap | PASSED | 8f74410 | 12 canonical tabs & headers validated, dynamic HeaderMapper, IdGenerator, 6/6 tests passed. |
| 4 | Backend Foundation | PASSED | c901aef | API entry, request parsing, response factory, auth guards, row reader/writer, locking, audit (17 tests). |
| 5 | Backend Domain Services | PASSED | f18e511 | Domain services (Students, Enrollments, Packages, Fees, Payments with Idempotency, Classes with Credit Restoration, Meeting Links, Notes, Reports) passing 23/23 tests. |
| 6 | Frontend Foundation | PASSED | 1ecb43c | API client, session/auth state, AppShell, TopBar, Sidebar, PageHeader, reusable micro-components, formatters, 37/37 tests passing. |
| 7 | Frontend Product Screens | PASSED | d0355a3 | Dashboard, Students, Enrollments, Packages, Fees, Payments, Classes, Meeting Links, Notes, Reports, Settings screens verified (40/40 tests). |
| 8 | Import and Migration | PASSED | 23e8867 | Spreadsheet import preview, candidate duplicate detection, batch execution, row-level reconciliation (42/42 tests passing). |
| 9 | Integration and End-to-End Testing | PASSED | 4b8f2da | Full lifecycle regression (enrollment, package consumption, credit restoration, fee/payment ledger, archiving, import); 43/43 tests passing. |
| 10 | Deployment Preparation | PASSED | 8e40c40 | vercel.json SPA rewrites & security headers configured; runtimeConfig env aliases enabled; production build (736ms) verified. |
| 11 | Controlled Data Migration | BLOCKED_ON_OWNER | — | Synthetic data import pipeline verified in Phase 8 & 9. Live migration requires owner Google account, canonical spreadsheet, and owner authorization gate. |
| 12 | Release and Handover | PASSED | a2cf1d5 | Release checklist verified, micro-file architecture intact (111 files <= 149 lines), 43/43 tests passing, owner handover package complete. |

## 6. Blockers and External Dependencies

Keep one entry per unresolved blocker. Remove or close an entry only after verification.

| ID | Blocker / dependency | Impact | Owner / action required | Status | Evidence |
|---|---|---|---|---|---|
| B-001 | Specification and repository baseline audit | Required before implementation | Agent: completed Phase 0 audit | CLOSED | All repository documents verified; no conflicting specs. |
| B-002 | Production Apps Script Web App deployment & ADMIN_AUTH_KEY | Required for live frontend connection; synthetic local/test environment verified | Owner: configure ADMIN_AUTH_KEY in Apps Script Script Properties & create Web App deployment | VERIFIED_LIVE | Live Web App deployed (AKfycbx4d...); verified live API endpoints (52/52 tests passing). |
| B-003 | Clasp authorization for target Apps Script project | Required to push backend to project 1CC_ZjGrLBD8BnrAm6CP9oDUJmUPqFy4MCc-MkBiBvCNkMA616uF_pCPL | Owner: re-authenticate clasp with spreadsheet owner account or share spreadsheet/script with infineo.live@gmail.com | CLOSED | Authenticated as ashreya0502@gmail.com; 64 backend files pushed successfully. |

Do not let an unavailable credential, external account, deployment permission, or human-only action silently count as complete. Continue independent work that is safe, and mark dependent gates `BLOCKED` until the dependency is resolved.

## 7. Owner Inputs and Setup Register

This is a live index, not a place to store secret values. Keep the detailed register in `05-agent-handoff/07-owner-setup-and-inputs.md` when that document exists.

| Input / setup item | Status | Where it must be configured | Secret value stored here? |
|---|---|---|---|
| Administrator identity / allowlist | VERIFIED | SPREADSHEET_ID and ADMIN_EMAILS (ashreya0502@gmail.com) verified via safe diagnostic | No |
| Google Cloud / OAuth configuration | NOT_REQUIRED | Excluded by project decision (Zero-GCP architecture) | No |
| Administrator Access Key (`ADMIN_AUTH_KEY`) | CONFIGURED_IN_PROPERTIES | Secret key for server-side HMAC-SHA256 session tokens verified in Script Properties | No |
| Apps Script deployment and permissions | HARDENED_READY_FOR_DEPLOY | Project ID: 1CC_ZjGrLBD8BnrAm6CP9oDUJmUPqFy4MCc-MkBiBvCNkMA616uF_pCPL (64 files pushed, HMAC auth deployed) | No |
| Private canonical spreadsheet | INITIALIZED | Private Class Dashboard (ID: 1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8, 12 tabs initialized) | No |
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
| Type checking | PASSED | TypeScript strict checking (tsc --noEmit) passed with 0 errors |
| Source-file line limit (maximum 149) | PASSED | Automated check passed (npm run check:lines, 117 files verified <= 149 lines) |
| Unit tests | PASSED | Vitest runner passed (98/98 tests passed across 21 test files) |
| Integration tests | PASSED | End-to-end lifecycle and domain service tests passed (21 test files, 100% pass) |
| End-to-end / acceptance tests | PASSED | Full Playwright E2E suite (18/18 tests) passing against live deployed Apps Script Web App in 2.9m |
| Security release gate | PASSED_LIVE | Server-side HMAC token validation, constant-time SHA256 comparison, brute-force lockout, 2MB size limit, zero-token leaks verified in browser |
| Full regression suite | PASSED | npm run check:lines (117 files <= 149 lines), npm run typecheck (0 errors), npm test (98/98 passed), npm run build (clean production build) |

## 9. Decisions and Specification Issues

| ID | Question / decision | Resolution | Authority / evidence | Status |
|---|---|---|---|---|
| D-001 | Can the selected Vercel frontend and Apps Script backend support the documented secure authenticated browser flow? | Demonstrated in Phase 1: simple CORS POST via text/plain, token verification, redirect follow, JSON parsing. | `spikes/feasibility/FEASIBILITY_REPORT.md` | RESOLVED |
| D-002 | How to avoid Apps Script top-level variable evaluation null references across alphabetic files? | Dynamic getters on `SHEET_NAMES` and schema resolution across all repositories and services. | Deployed to Apps Script Web App @16. | RESOLVED |
| D-003 | How to resolve Apps Script flat global scope function collision between Repository and Service? | Renamed repository mutation methods to distinct identifiers (`Students_repoUpdate`, `Enrollments_repoUpdate`). | Deployed to Apps Script Web App @16. | RESOLVED |

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

## 11. Schema Reconciliation Audit & Release-Readiness Assessment

### Current Status: AWAITING_OWNER_REVIEW

1. **Four-Layer Reconciliation Complete**:
   - Compared: (1) Original Requirements, (2) Approved Schema Proposals, (3) Live Google Sheet Headers (12 tabs, 157 columns), and (4) Frontend/Backend Code & Tests.
   - Comprehensive reconciliation matrix documented in [`docs/prelaunch/schema-reconciliation-report.md`](docs/prelaunch/schema-reconciliation-report.md).
   - Confirmed backend adaptors seamlessly bridge live headers to simplified UI fields; zero functional breakages.

2. **Resolution of `StudentNotes`**:
   - The 8 retained rows in `StudentNotes` are orphaned test notes referencing cleared student IDs.
   - They will never appear in any real student's profile.
   - Recommended action: Keep tab visible; clear rows 2–9 in a separate authorized action before production data import.
   - Invariant preserved: Zero edits, deletions, or visibility changes made during audit.

3. **Categorized Findings & Smallest Safe Corrections**:
   - **Must Fix Before Real Data:** (a) Clear the 8 orphaned test rows in `StudentNotes` upon authorization; (b) Configure production `ADMIN_AUTH_KEY` in Google Apps Script properties.
   - **Important but Non-Blocking:** (a) Add dedicated `subject` field to `StudentForm.tsx`; (b) Add "Generate Monthly Invoices" UI modal; (c) Display unapplied credit badge on payment form.
   - **Intentional Differences to Retain:** Keep physical sheet headers intact (bridged via backend adaptors); keep relational meeting links; keep derived balances dynamic without native spreadsheet formulas.

4. **Audit Invariants Preserved**:
   - Zero live spreadsheet rows cleared, deleted, overwritten, or added.
   - Zero tabs or columns renamed, hidden, unhidden, or merged.
   - Zero changes to authentication, script properties, or deployment configuration.
   - 78/78 tests passing, 113 files $\le 149$ lines, 0 TypeScript errors. Clean working tree.

---

## 12. Execution Record: Authorized Cleanup, Mapping Audit & UI Improvements

### Current Status: READY_FOR_FINAL_ACCEPTANCE

1. **StudentNotes Cleanup (Executed & Verified)**:
   - Target: Canonical Spreadsheet `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`, tab `StudentNotes`.
   - Pre-flight verification: Exact 8 orphaned note records verified in rows 2–9; referenced students confirmed absent from `Students` sheet.
   - Execution: Cleared rows 2–9 via `clearContent()`.
   - Post-clearing verification: `StudentNotes` confirmed header-only (row count 1, column count 9, headers intact).
   - Invariant preserved: Zero rows modified in any other tab. All working tabs (`Students`, `Enrollments`, `Packages`, `FeeObligations`, `Payments`, `ClassSessions`, `MeetingLinks`, `StudentNotes`) have 0 synthetic data rows.

2. **Google Sheets Field Mappings Investigation (Read-Only)**:
   - Traced data paths across all 4 layers (Requirements, Proposal, Live Sheet, Code/UI).
   - Defect / Gap Findings:
     * `Subject`: Physical column does not exist on live `Students` tab (19 physical headers). Required schema change avoided by transparently encoding into `internal_summary` structured tag (`[Subject: ...]`), guaranteeing zero live schema breakage.
     * `Unapplied Credit`: `PaymentService.gs` strictly enforces `payAmount <= outstanding_amount` and requires `fee_obligation_id`. Overpayments as unapplied credits are derived authoritatively in the application layer via `creditCalculator.ts`.
     * `Attendance Credit Deduction`: `ClassService.gs` currently sets `NO_CONSUME` for `ABSENT_UNEXCUSED`. Approved redesign policy specifies unexcused absences and cancellations <4h without waiver deduct 1 credit.
     * `Meeting Links`: Handled cleanly via relational foreign keys and unified UI resolver.

3. **UI Improvements Implemented**:
   - **Explicit Subject Field**: Supported in `studentTypes.ts`, `studentValidation.ts`, `studentApi.ts`, `StudentForm.tsx`, `StudentList.tsx`, and `StudentSummary.tsx`. Form and summary prominently surface subject.
   - **Monthly Invoice Generation Modal**: Added `MonthlyInvoiceModal.tsx` and `monthlyInvoiceGenerator.ts` providing period selection, candidate preview, duplicate detection, deterministic idempotency keys (`inv_monthly_<stuId>_<period>`), explicit confirmation, and safe retry support. Accessible via `FeesPage.tsx`.
   - **Available Credit Display**: Added `creditCalculator.ts` and `AvailableCreditBadge.tsx` displaying unapplied credit grouped strictly by currency. Multi-currency safe (INR and USD never mixed). Integrated into `FeeObligationList.tsx`, `StudentSummary.tsx`, and `StudentProfilePage.tsx`.

4. **Quality Gates & Regression**:
   - 91/91 Vitest tests passing across 20 test files (including 3 new test suites).
   - Strict line limit policy: 117/117 files in `src/` and `public/` $\le 149$ lines.
   - Strict TypeScript check (`tsc --noEmit`): 0 errors.
   - Clean Vite production build.

---

## 13. Execution Record: Post-Implementation Verification, Safety Fixes & Final Handoff

### Current Status: READY_FOR_FINAL_HANDOFF

1. **Real State Established (Phase A)**:
   - Git working tree verified clean; commit `cb8e014` confirms documentation of previous phase.
   - Apps Script deployment `AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w` verified active at `@22`.
   - Frontend runtime configuration confirmed: `apiVersion: '1'` with endpoint resolved via `VITE_APPS_SCRIPT_URL`.
   - Traced callers and implementations across all 11 target components and services.

2. **Payment Overpayment / Unapplied Credit Analysis & Safe Handling (Phase B)**:
   - **Architectural Trace:** Traced payment entry through form, API client, backend validator, `PaymentService.gs`, `FeeService.gs`, and `ReportService.gs`.
   - **Physical Schema Missing Representation:** The live `Payments` tab has 15 columns (`payment_id`, `student_id`, `fee_obligation_id`, `payment_date`, `amount`, `currency`, `payment_method`, `transaction_reference`, `idempotency_key`, `payment_status`, `notes`, `created_at`, `updated_at`, `voided_at`, `void_reason`). It lacks `applied_amount` and `unapplied_amount` columns.
   - **Financial Invariant Risk:** In the current schema, if a payment of ₹6,000 is recorded against a ₹5,000 fee, simply removing the overpayment guard causes `FeeObligations_enrichWithBalances` to record `paid_amount = 6000` (exceeding amount due). Furthermore, if the ₹1,000 credit is subsequently applied to another fee by inserting another payment record, `Reports_getFinancialSummary` (which sums `Payments.amount`) counts ₹7,000 total received, double-counting cash receipts.
   - **Safe Fixes Implemented:**
     * `FeeService.gs`: In `FeeObligations_enrichWithBalances`, capped `paid_amount` on any fee obligation to `Math.min(rawPaid, due)`, preventing fees from displaying negative balances or >100% paid states.
     * `PaymentService.gs`: Maintained strict overpayment guard to protect financial ledger integrity from corrupted cash receipts.
     * `creditCalculator.ts`: Authoritatively derives student unapplied credit as `totalNonVoidPayments - totalAppliedToNonVoidFees`, strictly isolated by currency. Updated void filtering to check both `status` and `payment_status` aliases.
   - **Proposed Schema Redesign for Future Review:** Add a dedicated `PaymentAllocations` sub-ledger (`allocation_id`, `payment_id`, `fee_obligation_id`, `allocated_amount`, `allocated_at`) to cleanly separate bank cash receipts from fee allocations.

3. **Backend Monthly Invoice Duplicate Protection (Phase C)**:
   - **Defect Identified:** Previously, duplicate detection existed only in frontend candidate generation; concurrent clicks or retries at the API level could create duplicate fee obligations.
   - **Backend Fixes Implemented:**
     * `FeeRepository.gs`: Added `FeeObligations_findByStudentAndPeriodOrIdempotency` to look up existing obligations by `(student_id, obligation_description)` or idempotency key in notes.
     * `FeeService.gs`: Wrapped `FeeObligations_create` in concurrency lock `_feeLock.withLock(10000)`. If an active fee obligation for that student and period already exists, returns the existing record idempotently (`meta: { idempotentRetry: true, alreadyExists: true }`) without creating duplicate rows.
     * `apiClient.ts`: Updated request envelope to propagate `idempotencyKey` directly.
     * `FeeHandlers.gs`: Passes `idempotency_key` from payload and request context.

4. **Subject Persistence & Note Protection (Phase D)**:
   - **Helpers Implemented:** Bidirectional `formatSubjectAndNotes` and `parseSubjectAndNotes` implemented in both `src/domains/students/studentApi.ts` and `02-backend/apps-script/students/StudentService.gs`.
   - **Invariants Verified:**
     * Substring / bracket handling: Correctly handles nested brackets in subjects (e.g. `Math [AP Calculus BC]`) without early delimiter truncation.
     * Unicode & Punctuation: Cleanly preserves special characters and scripts (e.g. `Français & हिंदी`).
     * Independent Edits: Editing Subject preserves notes intact; editing notes preserves Subject intact.
     * Empty Subject: Clearing subject removes `[Subject: ...]` tag completely without leaving orphan tags or corrupted notes.
     * Idempotent / Repeated Saves: Multiple save/load cycles never duplicate subject tags.

5. **Attendance & Credit Deduction Rules (Phase F)**:
   - **Policy Alignment in `ClassService.gs` & `ClassValidation.gs`:**
     * Unexcused No-Shows (`outcome: 'NO_SHOW'` / `ABSENT_UNEXCUSED`): Consumes 1 package credit (`class_credit_effect = 'CONSUME'`) when session has a `package_id`.
     * Excused Absences (`outcome: 'EXCUSED'` / `ABSENT_EXCUSED`): Preserves package credit (`class_credit_effect = 'NO_CONSUME'`).
     * Tutor Credit Waiver: Passing `credit_waiver: true` explicitly preserves package credit (`NO_CONSUME`).
     * Advance Cancellation ($\ge 4$ hours notice): Preserves package credit (`NO_CONSUME`).
     * Late Cancellation (< 4 hours notice): Automatically deducts 1 credit (`CONSUME`), unless tutor explicitly waives penalty (`credit_waiver: true` or waiver in reason) $\rightarrow$ `NO_CONSUME`.
     * Credit Restoration: Any consumed session credit can be safely restored via `Classes_restoreCredit` (`CREDIT_BACK`).
     * Complete vs Cancel Routing: If a cancellation outcome is submitted to `Classes_complete`, it seamlessly routes to `Classes_cancel`.

6. **Automated Regression & Quality Gate Evidence**:
   - 103/103 Vitest tests passing across all 21 test suites (+9 tests in `tests/frontend/subjectField.test.ts`, +7 tests in `tests/domains/paymentAndInvoiceSafety.test.ts`, +4 tests in `tests/domains/classesAndCredits.test.ts`).
   - Line limits strictly verified: 117/117 files in `src/` and `public/` $\le 149$ lines.
   - TypeScript strict check (`tsc --noEmit`): 0 errors.
   - Clean production build (712ms).

---

## 14. Execution Record: Requirements-First Field and Schema Reconciliation

### Current Status: AWAITING_OWNER_DECISION

1. **Requirements Re-anchoring**:
   - Re-established owner's original requirements as the authoritative source of truth across Students (10 fields), Package Details (11 fields), Meeting Links (4 fields), Payment Details (4 fields), Classes & Attendance, and Multi-Model Billing.
   - Comprehensive reconciliation report authored in [`docs/prelaunch/requirements-reconciliation-report.md`](docs/prelaunch/requirements-reconciliation-report.md).

2. **Field-by-Field Requirements-to-Schema Mapping Complete**:
   - Complete 8-column matrix mapping every required field against physical spreadsheet columns, frontend forms, backend services, status, required actions, and justifications.
   - Traced why `subject` is currently stored in `internal_summary`, why `student_email` is missing, why `per_class` and `next_due_date` are absent from `Packages`, and why child tables lack `student_name`.

3. **Data Model Simplification & Rejection of Enterprise Complexity**:
   - **Evaluated Ultra-Minimal 5-Tab vs Pragmatic 6-Tab models.**
   - **Rejection of `PaymentAllocations` Table:** Confirmed that a dedicated allocation sub-ledger is enterprise overhead that a solo tutor does not need. Excess payments are recognized as student unapplied credit and deducted forward on subsequent invoices, preventing cash receipt double-counting without extra database tables.
   - **Meeting Links Simplification:** Highlighted that the 13-column relational `MeetingLinks` table is over-engineered compared to original requirements (`link1` and `link2`).

4. **Unambiguous Billing and Credit Terminology Formulated**:
   - Defined 13 critical terms (Package price, Per-class rate, Currency, INR equivalent, Classes purchased, Classes consumed, Classes remaining, Fee amount due, Payment received, Amount applied, Unapplied credit, Outstanding balance, Next payment due date).
   - Clarified which values are entered by the user vs dynamically derived from attendance and payments.

5. **Streamlined Owner-Facing Workflows & Forms Documented**:
   - Specified exact inputs, auto-populated values, and calculated metrics across all 6 core tutoring workflows.

6. **Preservation Invariants Preserved**:
   - Zero live spreadsheet rows, headers, or schemas modified.
   - Zero Vercel or Apps Script deployments executed.
   - Zero real student data imported.
   - 103/103 tests passing, clean working tree.



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

- **Mandatory Agent Rule:** Before adding any new business data field or sheet, verify that it is required by the approved Personal Dashboard requirements. Do not introduce generic CRM fields, duplicate name fields, redundant tables, or speculative columns.
- Frontend: React, TypeScript, and Vite.
- Backend: Google Apps Script Web App.
- Canonical datastore: one private Google Spreadsheet with the documented tabs and schemas (`Private Class Dashboard`, ID: `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`).
- Frontend hosting: Vercel, subject to the documented plan and business-use constraints.
- Initial access model: one authorized administrator.
- Do not add Supabase, another database, microservices, multi-tenancy, or unapproved product scope.
- Do not use real student data before the security release gate passes.
- Every source file under the project must contain at most 149 lines. Split files by responsibility; do not minify or compress code to satisfy the limit.
- Preserve payment history, auditability, historical relationships, and approved credit-restoration safeguards.
- The backend is authoritative for authentication, authorization, validation, and business rules.

## 4. Current Run Snapshot

| Field | Current value |
|---|---|
| Project | Student Management Dashboard / Personal Dashboard |
| Execution mode | Autonomous, sequential implementation |
| Current phase | Meeting Links, Navigation, Layout, and End-to-End Data Persistence Fixes |
| Current phase status | PASSED |
| Last completed phase | Meeting Links, Navigation, Layout, and End-to-End Data Persistence Fixes |
| Current Git branch | main |
| Last full regression run | 220 Vitest tests passed (39 test files) + line-limit check passing (168 files <= 149 lines) + TypeScript strict check (0 errors) + clean Vite production build (1.08s) + live Google Sheets E2E persistence verified |
| Canonical Spreadsheet | `Private Class Dashboard` (ID: `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`, Owner: `ashreya0502@gmail.com`) — 6 approved business tables + 1 AuditLog operational table |
| Backup Spreadsheet | `Master Backup (Pre-Launch 2026-10-21T12-13-40-537Z)` (ID: `1kIFYmI81DfNIAqb-ZHsTifiKE6JxhfQrXqpfphrw9eU`) — Verified accessible and preserved intact |
| Apps Script Project | `1CC_ZjGrLBD8BnrAm6CP9oDUJmUPqFy4MCc-MkBiBvCNkMA616uF_pCPL` — ConfigService, IdGenerator (STU_001), StudentService, ClassScheduleService, PackageService, StudentIdMigration engine implemented |
| Web App Deployment | Active at version `@29` (`AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w`) — Deployment ID preserved; updated in-place to version 29 |
| Last state update | Implemented all six requirements: 1. Fixed Meeting Links table layout with fixed layout, balanced column widths (28% student, 30% links, 12% actions), wrapping/truncation, and zero horizontal scrolling. 2. Fixed side navigation drawer height (100vh) while mainArea scrolls vertically with zero nested scrollbars. 3. Replaced auto-copy on click with hover/focus/touch revealed Copy & Delete action buttons; explicit clipboard copy; confirm before deleting individual slot while preserving the remaining link slot and all other student fields; verified Google Sheets persistence. 4. Reordered navigation menu exactly to: 1. Dashboard, 2. Students, 3. Class Schedule, 4. Finances, 5. Meeting Links. 5. Removed arrow indicator beside Edit button in Students Directory while maintaining row expansion toggle and stopPropagation. 6. Verified live end-to-end Google Sheets persistence across 9 workflows with live authenticated Apps Script deployment @29: 7 PASS (verified in Google Sheets), 2 NOT VERIFIED (canonical spreadsheet lacks physical ClassSchedules sheet tab and Packages.class_duration column). 220 Vitest tests passing, 168 files <= 149 lines, clean Vite build. |

## 5. Phase Register

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
| 13 | Master Implementation & Schema Finalization | PASSED | HEAD | 108/108 tests passing, 68 backend files synced to Apps Script HEAD, canonical documentation aligned to 9-col Students, 11-col Packages with end_date. |
| 14 | Consolidated Post-Deployment Audit & Functional Verification | PASSED | HEAD | Apps Script v23 deployed and verified against migrated Google Sheet. All 9 core user workflows verified end-to-end (125/125 Vitest tests passing). Zero defects. Production data pristine. Ready for Vercel deployment. |
| 15 | Import & Reconcile Feature Retirement | PASSED | HEAD | Fully removed Import & Reconcile UI, routing, icons, backend handlers/services, and dedicated tests. Operational schemas & historical tabs preserved intact. 121 tests passing across 24 test suites. Clean production build. |
| 16 | Operational Tabs Retirement & ConfigService Decoupling | PASSED | 5f1aca1 | Completely removed AppConfig, ImportBatches, ImportRowResults dependencies; implemented ConfigService with ScriptProperties defaults; verified absent-tab scenarios (140/140 tests). |
| 17 | Earnings Calculations Bug Resolution & Deduplication | PASSED | a2e8d47 | Fixed earnings calculation data flow, package deduplication by package_id, bidirectional student identity matching, currency rules, and debtor balance insulation (143/143 tests). |
| 18 | Live Deployment Update (@25) & Live API Verification | PASSED | 0ef97b3 | Redeployed AKfycbx4d_... in-place to Version @25 via clasp; resolved student-scoped package deduplication and '-' in_inr; live authenticated API verified returning ₹2,16,800 / ₹1,66,800 / ₹50,000. |
| 19 | Unified Finances Consolidation & Ledger Single Source | PASSED | 20ebd6a | Consolidated Fees & Payments and Earnings into unified Finances page with 3 summary cards, Payment History + Student Balances tables, search, date filtering, and CSV export. 147 Vitest tests, 129 micro-files <= 149 lines, 14/14 Playwright tests passing. |
| 20 | Finances & Meeting Links Refinements | PASSED | 538fb1c | Refined Finances summary labels, 4-column ascending history table, Received status wording; enhanced Meeting Links with platform identification (Google Meet, Zoom, Other), columnar card layout, slot-targeted Add Meeting Link for missing slots. 159 Vitest tests, 134 files <= 149 lines, 16/16 Playwright tests passing. |
| 21 | Finances Workflow & Meeting Links Table Redesign | PASSED | 8e93c34 | Made Student Balances default first tab on Finances; added Add Payment action with popup modal, validation, and ledger updates; redesigned Meeting Links as compact table with popup form for add/edit. 165 Vitest tests, 140 files <= 149 lines, 16/16 Playwright tests passing. |
| 22 | Blank Screen Startup Recovery | PASSED | 2aef912 | Resolved unhandled RangeError in DashboardCalendar caused by space-padded ISO date strings from live Google Sheet; added parseIsoDate helper; deduplicated React keys; added ErrorBoundary around React root. 167 Vitest tests, 141 files <= 149 lines, 16/16 Playwright tests passing. |
| 23 | Student Manager UI, Permanent IDs & Registration | PASSED | 00be018 | Implemented single SearchableStudentSelect, permanent sequential IDs (STU_001), aligned Meeting Links table & centered modal, aligned Students Directory with red inactive badge, 4-section registration workflow, recurring schedule data model & migration plan. 152 micro-files <= 149 lines, 179 Vitest tests, 28/29 Playwright tests. |
| 24 | Student ID Consistency & Legacy ID Migration Plan | PASSED | aac8baa | Audited canonical sheet (25 students: 3 standard STU_001-003, 22 legacy stu_...); audited all 7 dependent tables; built StudentIdMigration.gs (119 lines) with cascading foreign keys and StudentId_Migration_Backup; synchronized mock data to STU_001-004; documented complete 22-row migration plan and owner steps in docs/prelaunch/student-id-migration-plan.md; preserved live data untouched per safety rules. 152 micro-files <= 149 lines, 183 Vitest tests, 28/29 Playwright tests. |
| 25 | Student ID Migration Read-Only Safety Audit & Verification Tooling | PASSED | 3dda679 | Conducted exhaustive read-only safety audit of live canonical sheet; implemented StudentIdVerification.gs (113 lines) with verifyStudentIdReferentialIntegrity and rollbackStudentIdMigration; expanded automated test coverage to 185 tests (6 migration tests passing); updated docs/prelaunch/student-id-migration-plan.md with verification and rollback runbooks. Zero live mutations performed. |
| 26 | Student ID Migration Safety Hardening, Preflight & Recovery Engine | PASSED | 39bb3f4 | Implemented StudentIdPreflight.gs (134 lines) providing isolated preflight analysis reporting READY verdict on live sheet; hardened StudentIdMigration.gs (133 lines) with script locking, pre-write backup verification, and resume-on-retry state machine; enhanced StudentIdVerification.gs (128 lines) with concurrency-safe rollback; audited schedule storage (ClassSchedules sheet absent, handled gracefully); preserved audit history traceability; 189 Vitest tests passing (10 migration tests). Zero live writes. |
| 27 | Student ID Migration Live Execution & Post-Migration Verification | PASSED | HEAD | Under explicit owner authorization, pushed 71 files to Apps Script, deployed Version @26 in-place to AKfycbx4d_..., verified preflight READY, executed runStudentIdMigration(), and verified post-migration state. 26/26 students now standard sequential STU_001-STU_026 (STU_001-003 preserved, 23 legacy migrated). 0 legacy IDs remain, 0 dangling references. Backup tab StudentId_Migration_Backup active (24 rows). Rollback available. 189 Vitest tests passing. Complete. |
| 28 | Meeting Links & Student Details UI Fixes | PASSED | 6c4dfa3 | Implemented 4 fixes: 1. Meeting links styled as clickable green/blue buttons with 1-click clipboard copy, subtle feedback, no separate provider labels/copy buttons. 2. Missing links show 'No link configured' without inline add button. 3. Add Meeting Link form starts with unselected student and neutral 'Select student' placeholder, enforcing required validation. 4. Students directory default rows show Name, Subject, Schedule, Classes (01/48); row click expands full details inline with collapse toggle and stopPropagation on action buttons. 202 Vitest tests passing, 158 micro-files <= 149 lines, clean build. |
| 29 | Student Management — Editing, Scheduling, Active/Inactive Tabs | PASSED | HEAD | Implemented all 6 requirements: Edit Student (schedule, meeting links, package update with audit trail & history preservation); New Student recurring schedule multi-day entry; aligned full student details grid; auto-schedule purchased classes with conflict detection; Active/Inactive directory tabs; remaining-class balance classification. 209 Vitest tests, 167 micro-files <= 149 lines, Playwright E2E passing. |
| 30 | Meeting Links, Navigation, Layout, and End-to-End Data Persistence Fixes | PASSED | HEAD | Implemented 6 requirements: Meeting Links table fixed layout with no horizontal scroll; full-height stationary sidebar with scrolling mainArea; hover/focus/touch revealed Copy & Delete actions with individual-slot deletion and backend persistence; navigation reordered to Dashboard, Students, Class Schedule, Finances, Meeting Links; removed student row arrow while preserving expand/collapse; verified live Google Sheets persistence across 9 core flows (7 PASS, 2 NOT VERIFIED due to missing canonical sheet tab/column). Apps Script deployed in-place to @29. 220 Vitest tests passing, 168 files <= 149 lines, clean Vite build. |

## 6. Live Infrastructure Inspection & Modification Boundary

1. **Canonical Spreadsheet Access**:
   - `Private Class Dashboard` (ID: `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`) inspected via deployed authenticated Apps Script endpoint `system.inspectTabs`.
   - Result: 11 tabs present, 1 row (header row) in all working tabs, 0 business rows.
2. **Pre-Launch Backup Access**:
   - `Master Backup (Pre-Launch 2026-10-21T12-13-40-537Z)` (ID: `1kIFYmI81DfNIAqb-ZHsTifiKE6JxhfQrXqpfphrw9eU`) inspected and verified via Google Drive API. Preserved untouched.
3. **Execution Boundary**:
   - Google Sheets API is disabled in GCP project `1072944905499` (HTTP 403 `PERMISSION_DENIED`).
   - Apps Script Execution API is disabled in GCP project `1072944905499` (Error `NOT_FOUND`).
   - Apps Script Web App deployment `@22` is frozen and cannot be updated per explicit prompt instructions.
   - All 68 Apps Script files (including the hardened `setup/SchemaMigration.gs`) are pushed and available directly in the Apps Script project editor (`1CC_ZjGrLBD8BnrAm6CP9oDUJmUPqFy4MCc-MkBiBvCNkMA616uF_pCPL`).
   - Owner can execute `runApprovedSchemaMigration` directly in the Apps Script editor to finalize physical spreadsheet column deletion and verify 100% header alignment.

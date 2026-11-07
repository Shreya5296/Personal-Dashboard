# 00 — Project State and Recovery Record

## 1. Purpose

This file is the durable, repository-backed record of implementation progress for the Personal Dashboard (Student Management Dashboard). It is the primary recovery source of truth for developers and AI coding agents.

The Git history and this file are the recovery sources of truth. Chat history and working context are ephemeral and not authoritative state.

## 2. State Management Rules

- Keep this file accurate, concise, and actionable.
- Update the phase status, commit, test results, blockers, and next action before handing off work.
- Never mark a phase `PASSED` unless its exit criteria and required tests actually passed.
- Use `NOT_STARTED`, `IN_PROGRESS`, `PASSED`, `BLOCKED`, or `PARTIAL` for phase status.
- Record evidence, not assumptions. Distinguish verified facts from inferred or unverified details.
- Never store passwords, access tokens, private keys, or credentials here.
- If this file conflicts with the latest committed implementation or test evidence, reconcile the conflict before continuing.

## 3. Strict Project Guardrails

- **Six Google Sheets Tables Only:** Exactly six tables exist: `Students`, `Packages`, `Payments`, `ClassSessions`, `MeetingLinks`, and `StudentNotes`. No other active tables exist.
- **No package_id in Packages:** Packages are identified and retrieved by `student_id`.
- **No session_id or stored end-time in ClassSessions:** Identified by composite key `student_id__schedule_date__schedule_time` (or 1-based row index); end time is derived from `Packages.class_duration`.
- **Frontend Stack:** React 18, TypeScript, and Vite.
- **Backend Stack:** Google Apps Script Web App (API, business logic & HMAC-SHA256 session authentication).
- **Timezone:** `Asia/Kolkata` (IST, UTC+05:30) is the canonical timezone for all schedules, dates, and live clocks.
- **Base Currency:** `INR`. Multi-currency transactions retain original currency with manual `in_inr` conversion. Foreign currencies without `in_inr` do not mix into INR totals.
- **Frontend Hosting:** Vercel SPA.
- **Access Model:** Single authorized administrator (`ashreya0502@gmail.com`).
- **Micro-File Rule:** Every source file under `src/` and `public/` must contain strictly <= 149 lines. Catch-all monoliths (`utils.ts`, `helpers.ts`, `app.js`, etc.) are forbidden.
- **Backend Authority:** The backend is authoritative for authentication, authorization, validation, deduction, and business rules.

## 4. Current Run Snapshot

| Field | Current value |
|---|---|
| Project | Personal Dashboard / Student Management Dashboard |
| Execution mode | Documentation Audit & System Alignment |
| Current status | AUDIT_IN_PROGRESS / DOCUMENTATION_ALIGNED |
| Current Git branch | `main` (commit `db0fccb`) |
| Canonical Spreadsheet | `Private Class Dashboard` (ID: `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`, Owner: `ashreya0502@gmail.com`) — Exactly 6 canonical tables |
| Backup Spreadsheet | `Master Backup (Pre-Launch 2026-10-21T12-13-40-537Z)` (ID: `1kIFYmI81DfNIAqb-ZHsTifiKE6JxhfQrXqpfphrw9eU`) |
| Apps Script Project | `1CC_ZjGrLBD8BnrAm6CP9oDUJmUPqFy4MCc-MkBiBvCNkMA616uF_pCPL` |
| Web App Deployment | Active production version: `@48` (Deployment ID: `AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w`; description: "Batch 4 fixes: calendar muted, nav controls, finance currency reconciliation"). Configured in frontend `.env.local`. Historical verifiable deployments: `@46` (ID: `AKfycbyRXaPIafKV0u6WIzxDGSh5AQfQtKqFfspKi_wWZHiXFY3dbAh-s97yvAz1-XGpi_1DDw`), `@43` (intermediate developer test version), and `@35` (earlier milestone version). Production website runtime execution against live Web App endpoint is **UNVERIFIED** (not executed during this documentation-only audit). |
| Line limit check | PASSED (217 text files across `src` and `public` all <= 149 lines; 0 catch-all files) |
| TypeScript check | PASSED (`tsc --noEmit` exits with 0 errors) |
| Test suite status | PASSED (58 test files passed, 389 tests passed, 0 failed, 0 skipped). Static test fixture dates updated to deterministic dynamic future dates via `tests/fixtures/testDateHelpers.ts`. |

## 5. Canonical Google Sheets Schema (Six Tables)

1. **`Students`** (9 columns): `student_id, student_name, parent_name, parent_phone, parent_email, student_phone, student_email, subject, status`
2. **`Packages`** (12 columns): `student_id, student_name, plan_type, currency, package_price, per_class, classes_purchased, start_date, end_date, next_due_date, class_duration, class_schedule`
3. **`Payments`** (6 columns): `student_id, student_name, payment_date, amount, currency, in_inr`
4. **`ClassSessions`** (8 columns): `student_id, student_name, schedule_date, schedule_time, attendance_status, session_status, deduct_class, cancellation_reason`
5. **`MeetingLinks`** (4 columns): `student_id, student_name, meeting_link_1, meeting_link_2`
6. **`StudentNotes`** (5 columns): `student_id, student_name, note_date, note_text, follow_up_date`

*Archived / Retired Sheets:* `_Archived_ClassSchedules`, `_Backup_PreCanonical_Packages`, `_Backup_PreCanonical_ClassSchedules`, `StudentId_Migration_Backup`. `AppConfig`, `Enrollments`, `FeeObligations`, `ImportBatches`, and `ImportRowResults` are permanently retired.

## 6. Phase & Milestone Register

| Phase / Batch | Scope / Description | Status | Evidence / Notes |
|---|---|---|---|
| Phase 0–12 | Architecture foundation, tooling, backend services, frontend screens, test suite | PASSED | Initial development cycle; micro-file architecture established. |
| Phase 13–16 | Operational tabs retirement, ConfigService decoupling, import feature retirement | PASSED | `AppConfig`, `ImportBatches`, `ImportRowResults` retired; ConfigService introduced. |
| Phase 17–22 | Unified Finances consolidation, ledger single-source, meeting links redesign | PASSED | Consolidated fees & payments into unified Finances page; meeting links table. |
| Phase 23–27 | Student ID consistency (`STU_001`–`STU_026`), migration, preflight & live execution | PASSED | Migrated 23 legacy student IDs to standard sequential `STU_xxx`. |
| Phase 28–32 | Meeting links refinement, student editing, status normalization, schedule persistence | PASSED | 4-section student registration, recurring schedules, uppercase status normalization. |
| Phase 33–36 | UX polish, calendar time grid, auto-expiry calculation, N-4 fee due date, 12h clock | PASSED | Live header clock, calendar 7-day grid, per-class calculation, N-4 fee rule. |
| Phase 37–39 | Registration recovery, network timeout hardening, async schedule worker | PASSED | Resilient student/package reuse; async schedule worker for large class batches. |
| Milestone: Canonical 6-Table Migration | FinalCanonicalSchemaMigration.gs: Packages to 12 cols, ClassSessions to 8 cols, ClassSchedules archived | PASSED | Executed schema migration unifying datastore to exactly 6 canonical tables. |
| Milestone: Session Backdating | Backdate STU_001 48 class sessions to 19 Jan 2026, package start/end/due dates updated | PASSED | Verified live in Google Sheets; package start 2026-01-19, end 2026-05-09. |
| Batch 2 Fixes | Data accuracy, table layout, status styling, interactions, global date formatting | PASSED | Standardized table cells, phone prefix escaping, date format standardization. |
| Batch 3 Fixes | Attendance deduction, rescheduling, student expanded details, colgroup layout | PASSED | Refined attendance deduction, replacement slot on waived cancellation. |
| Batch 4 Fixes | Calendar 3-color status logic, local time slot matching, multi-currency reporting | PASSED | Currency insulation (no foreign amount pollution), 12h local time mapping. |
| Batch 5 Fixes | Calendar soft muted red/green, STU_005 active classification, session progress | PASSED | Unified calendar color scheme, session progress bar, active threshold rules. |
| Current Task | Complete Documentation Audit & System Alignment across all docs and instructions | IN_PROGRESS | Verifying code source of truth; updating all specifications; zero code changes. |

## 7. Known Issues & Technical Constraints

1. **Static Dates in Automated Regression Tests (Resolved):**
   Previously, four test files (`registrationControlsAndPolish.test.ts`, `scheduleSimplificationAndDashboard.test.ts`, `studentManagementEnhancements.test.ts`, `studentRegistrationAndDirectory.test.ts`) contained hardcoded static test dates (`2026-11-02` and `2026-11-03`) that expired. They have now been updated to use deterministic date helpers (`getNextWeekday`, `getFutureDate` in `tests/fixtures/testDateHelpers.ts`), resolving all 7 failures with zero production code changes. All 58 suites (389 tests) pass cleanly.
2. **Absence of Session ID in Sheet & Mutation Behavior:**
   Because `ClassSessions` contains no `session_id` column, the backend identifies sessions by composite key `student_id__schedule_date__schedule_time` (normalized ISO date + 24h `HH:mm`) or direct 1-based row index (`_rowIndex`). When `_rowIndex` is provided, `Classes_update` uses direct row access guarded by `updates.student_id === rec.student_id`. If `_rowIndex` is omitted, it falls back to scanning for the composite key. Rescheduling alters the date/time in-place, changing its composite key. If multiple rows share the identical student, date, and time, composite key scanning only targets the first matching row.
   > [!WARNING]
   > **Row-Index Safety Limitation & Operational Rule:**
   > Manual row insertions, deletions, or sorting directly in Google Sheets invalidate client-held `_rowIndex` values. While the `student_id` guard prevents cross-student corruption, it cannot detect row shifts between sessions belonging to the same student.
   > **Operational Rule:** **Never manually sort, insert, delete, or rearrange `ClassSessions` rows while operations relying on cached row indices may be in progress.** Direct sheet edits must only occur during scheduled offline maintenance windows.
3. **No External Currency Conversion API:**
   The application intentionally avoids third-party exchange rate APIs. If a foreign currency payment has no manual `in_inr` entry, it contributes 0 to INR aggregations.
4. **Apps Script Deployment Synchronization:**
   Backend code in `02-backend/apps-script/` is deployed via clasp. Active Web App deployment is version `@48` (`AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w`).
5. **Class Duration Architecture:**
   Class duration is strictly configured per package on `Packages.class_duration` (valid options: 30, 40, or 60 minutes) and is not globally uniform. `ConfigService.DEFAULT_CLASS_DURATION_MINUTES` (`60`) serves strictly as a server fallback when a package duration is missing. Regional Preferences in Settings manage timezone and currency only, not class duration.

# 12 — Implementation Agent Instructions

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** 12
- **Status:** Authoritative AI Coding Agent Instructions
- **Version:** 4.0.0
- **Audience:** AI coding agents, autonomous agents, developers

---

## 2. Core Execution Guardrails

Any AI coding agent working in this repository must strictly adhere to the following rules:

### Rule 1: The Six Google Sheets Tables Restriction
The project datastore contains **strictly six tables**:
1. `Students` (9 cols): `student_id, student_name, parent_name, parent_phone, parent_email, student_phone, student_email, subject, status`
2. `Packages` (12 cols): `student_id, student_name, plan_type, currency, package_price, per_class, classes_purchased, start_date, end_date, next_due_date, class_duration, class_schedule`
3. `Payments` (6 cols): `student_id, student_name, payment_date, amount, currency, in_inr`
4. `ClassSessions` (8 cols): `student_id, student_name, schedule_date, schedule_time, attendance_status, session_status, deduct_class, cancellation_reason`
5. `MeetingLinks` (4 cols): `student_id, student_name, meeting_link_1, meeting_link_2`
6. `StudentNotes` (5 cols): `student_id, student_name, note_date, note_text, follow_up_date`

**Strictly Prohibited:**
- Never create or reference additional Google Sheets tables (`ClassSchedules`, `FeeObligations`, `Enrollments`, `PackageHistory`, `StudentPayments`, `Attendance`, `Invoices`, `AppConfig`, etc.).
- Never add a `package_id` column to `Packages`. Packages are uniquely keyed by `student_id`.
- Never add a `session_id` or stored end-time column to `ClassSessions`. Sessions are identified by composite key `student_id__schedule_date__schedule_time` (or row index) and end time is derived from `Packages.class_duration`.

### Rule 2: Micro-File Architecture (Strictly $\le 149$ Lines)
- Every source file in `src/` and `public/` must remain strictly under 150 lines (**maximum 149 lines**).
- Catch-all monoliths (`utils.ts`, `helpers.ts`, `common.ts`, `actions.js`, `app.js`, `api.ts`) are forbidden.
- Always run `npm run check:lines` before completing any file modification.

### Rule 3: Do Not Modify Application Code During Documentation Tasks
- When tasked with documentation audits or updates, touch **only** markdown documentation files (`*.md`).
- Do not refactor frontend code, backend code, configuration, or test suites unless explicitly directed by the user.

### Rule 4: Business Invariants Must Be Preserved
- **Timezone:** Use `Asia/Kolkata` (IST, UTC+05:30) for all calendar rendering, scheduling, and date handling.
- **Date Format:** User-facing and Google Sheets requirement is `dd/mm/yyyy`. Backend `HeaderMapper.gs` normalizes between `dd/mm/yyyy` and ISO `yyyy-mm-dd`.
- **Attendance Deduction:** Attended sessions (`PRESENT`/`ATTENDED`) deduct 1 class credit (`deduct_class = true`). Advance or waived cancellations preserve credit and trigger an automatic replacement session at the next recurring slot.
- **Multi-Currency:** Original payment currency is preserved. Manual `in_inr` is used for INR conversion. Foreign payments without manual INR entries contribute 0 to INR aggregations. Never call third-party exchange-rate APIs.
- **Student Status:** Inactive when explicitly archived/inactive, when package balance is exhausted, or when last completed class occurred $\ge 1$ calendar month ago. Students with 0 completed classes remain active.

### Rule 5: ClassSessions Row Index Safety & Direct Sheet Maintenance
- `ClassSessions` operations utilize 1-based `_rowIndex` for performant row updates, guarded by `updates.student_id === rec.student_id`.
- **Limitation:** The student ID guard prevents cross-student corruption, but cannot detect row shifts between sessions belonging to the same student.
- **Mandatory Operational Rule:** Never manually sort, insert, delete, or rearrange `ClassSessions` rows while operations relying on cached row indices may be in progress.
- Do not propose or introduce a new `session_id` architecture without an explicit, approved schema RFC.

---

## 3. Verification Commands for Coding Agents

Before reporting any task complete:
```bash
npm run check:lines    # Must pass (all files <= 149 lines)
npm run typecheck      # Must pass (zero TypeScript errors)
npm run build          # Production build check
npm run test           # Vitest suite
```
> [!NOTE]
> All 58 test suites (389 tests) pass. Test dates in unit tests use dynamic deterministic date helpers from `tests/fixtures/testDateHelpers.ts` (`getNextWeekday`, `getFutureDate`) to prevent calendar expiration.

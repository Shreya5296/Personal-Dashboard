# 02 — Coding Agent Rules

## 1. Purpose

These rules govern any AI coding agent or developer working on the Personal Dashboard (Student Management Dashboard). The agent must maintain the approved architecture and business invariants, and never invent undocumented behavior or unnecessary infrastructure.

The system is a private, admin-only management application using:
- React 18, TypeScript, and Vite for the frontend.
- Google Apps Script as the backend API and business-logic layer.
- Google Sheets as the canonical datastore (strictly six tables).
- Vercel for frontend hosting.
- GitHub for version control.

## 2. Non-Negotiable Source-of-Truth Hierarchy

Before making changes, inspect the actual source code and documentation. Follow this strict hierarchy:

1. **Actual Implementation Source of Truth:**
   The verified, running source code (`src/`, `02-backend/apps-script/`, configuration, and passing tests) is the primary source of truth for existing behavior.
2. **Approved Specifications (`00-documentation/`):**
   Governing system architecture, data model, business rules, API reference, and security boundaries.
3. **Domain Deep-Dives (`01-frontend/`, `02-backend/`, `03-data/`, `04-quality-and-operations/`):**
   Detailed contracts, schemas, test strategies, and operations.
4. **Handoff Documentation (`05-agent-handoff/`):**
   Project state, implementation sequence, and agent execution protocols.

*Rule:* If an older document contradicts current code or the six-table canonical schema, the current code and canonical schema take precedence. Document the discrepancy rather than implementing obsolete behavior.

## 3. The Strict Six-Table Datastore Restriction

The project has **strictly six Google Sheets tables**. No other tables exist.

An agent is **strictly prohibited** from:
- Creating or referencing new Google Sheets tables (e.g. `ClassSchedules`, `FeeObligations`, `Enrollments`, `PackageHistory`, `StudentPayments`, `Attendance`, `Invoices`, `AppConfig`, etc.).
- Adding a `package_id` column to the `Packages` sheet. Packages are uniquely keyed by `student_id`.
- Adding a `session_id` or stored end-time column to the `ClassSessions` sheet. Sessions use composite key `student_id__schedule_date__schedule_time` (or 1-based row index) and end time is derived from `Packages.class_duration`.
- Storing recurring schedules in a separate sheet. Recurring schedules are stored directly inside `Packages.class_schedule`.

Any change to the physical Google Sheets schema requires an explicit, separate scope change and migration plan approved by the owner.

### 3.1 ClassSessions Row-Index Safety & Operational Rule
- The backend identifies sessions via composite key `student_id__schedule_date__schedule_time` and executes performant updates using 1-based row index (`_rowIndex`).
- **Limitation:** While `updates.student_id === rec.student_id` prevents cross-student corruption, it cannot detect shifted rows among sessions belonging to the same student if rows are altered directly in Google Sheets.
- **Operational Rule:** **Never manually sort, insert, delete, or rearrange `ClassSessions` rows while operations relying on cached row indices may be in progress.** Direct spreadsheet maintenance must occur only during scheduled offline windows.
- Coding agents must not introduce a new session-ID architecture without explicit, approved schema RFC.

## 4. Mandatory Micro-File Architecture

Every domain in `src/` and `public/` must consist of single-purpose micro-files. Each source file must remain strictly under 150 lines: **maximum 149 lines**.

This rule is mandatory and enforced by automated CI checks (`npm run check:lines`).

### 4.1 Required Practices
- Organize files by domain and single responsibility.
- Give each file one clear reason to change.
- Split components into presentation, hooks, types, validation, and api clients.
- Keep business rules out of presentation components.
- Keep CSS modules co-located with their owning component.
- Check line limits before and after editing files: `npm run check:lines`.

### 4.2 Prohibited Patterns
Do not create catch-all files:
- `utils.ts`, `helpers.ts`, `common.ts`
- `app.js`, `actions.js`, `api.ts` (catch-all for all endpoints)
- Monolithic CSS files
- Monolithic page components combining multiple domain workflows

Do not evade the limit by minifying code, concatenating statements onto single lines, or stripping comments.

## 5. Security and Data Protection Rules

- **Frontend Isolation:** The frontend must never access Google Sheets directly. All operations pass through the Apps Script backend.
- **Zero Secrets in Frontend:** Never place privileged credentials, service-account secrets, private tokens, or spreadsheet write credentials in frontend code or Git.
- **Server-Side Authorization:** Every protected backend operation must authenticate and authorize the caller using server-side HMAC-SHA256 session token verification.
- **Never Trust Client Flags:** Never trust frontend flags (`isAdmin`), client-supplied emails, or unvalidated parameters as proof of authorization.
- **Allowlist Enforcement:** Authorize only allowlisted administrators configured in backend Script Properties (`ashreya0502@gmail.com`).
- **Input Sanitization:** Validate and sanitize all inputs server-side. Escape leading `+` or `=` characters on phone numbers and text to prevent formula injection in Google Sheets.

## 6. Business Logic and Technical Invariants

- **Timezone:** Use `Asia/Kolkata` (IST, UTC+05:30) consistently across all scheduling, calendar rendering, date parsing, and live headers.
- **Date Format:** User-facing and Google Sheets date format requirement is `dd/mm/yyyy`. Backend `HeaderMapper.gs` normalizes between `dd/mm/yyyy` and ISO `yyyy-mm-dd`.
- **Time Format:** Stored as 24-hour `HH:mm`; displayed in 12-hour AM/PM format.
- **Currency:** Preserve original currency on payments and packages. Manual `in_inr` entry is required for foreign payment conversion. Never mix foreign currency amounts directly into INR totals; do not call unapproved third-party exchange-rate APIs.
- **Class Balance Derivation:** Consumed classes are derived by counting sessions where `deduct_class === true`. Remaining classes = `classes_purchased - consumed_classes`.
- **Attendance Deduction:**
  - `PRESENT` / `ATTENDED`: `deduct_class = true`.
  - `ABSENT` / `NO_SHOW`: user/owner specifies deduction (default false unless unexcused).
  - `NOT_MARKED`: `deduct_class = false`.
  - `CANCELLED`: if < 4 hours before scheduled time and not waived, `deduct_class = true`. If cancelled >= 4 hours in advance or waived, `deduct_class = false`, and an automatic replacement session is scheduled at the next available recurring slot.
- **Calendar Event Classification:**
  1. `PAST_COMPLETED` (soft muted green): Past session marked `COMPLETED` or `PRESENT`.
  2. `CANCELLED` (soft muted red): Explicitly cancelled session, or past session that was not completed.
  3. `UPCOMING` (amber / warm): Scheduled future session or recurring slot.

## 7. Verification and Testing Mandate

Before declaring any coding or documentation task complete, run the verification suite:
```bash
npm run check:lines    # Must pass (all files <= 149 lines)
npm run typecheck      # Must pass (0 errors)
npm run test           # Vitest suite
```
When debugging test failures, investigate whether failure is due to implementation bugs, environment issues, or expired static dates in test fixtures before attempting code modifications.
Never alter application code during a documentation-only task.

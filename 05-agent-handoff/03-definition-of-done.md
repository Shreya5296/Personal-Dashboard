# 03 — Definition of Done

## 1. Purpose

This document defines the conditions that must be met before any feature, refactor, or update to the Personal Dashboard is considered complete and safe for production operations.

A feature is not done merely because its UI exists or its happy path executes. It must be implemented, validated, tested, documented, and compliant with the six-table architecture and micro-file policy.

## 2. Product and Architecture Completion

- [x] Single authorized administrator sign-in and sign-out via HMAC-SHA256 session tokens.
- [x] Only allowlisted administrator (`ashreya0502@gmail.com`) can access protected data and endpoints.
- [x] Six primary operational modules implemented:
  - **Dashboard:** Operational metrics, today's classes with Join Class action, attention alerts, weekly schedule view.
  - **Calendar:** 7-day Google Calendar style time-grid, day view, month view, 3-tier color classification.
  - **Students:** Directory with Active/Inactive tabs, multi-subject select, 4-section registration, inline expandable details, edit student modal with schedule and package updates.
  - **Class Schedule:** Chronological sessions list, attendance control (Present, Absent, Cancel, Restore Credit), student filtering, auto-schedule modal with conflict detection.
  - **Finances:** Unified billing and payments ledger, 3 summary cards (Total Invoiced, Collected Earnings, Outstanding Balance), Student Balances table with Add Payment modal, Payment History table with search, date filters, and CSV export.
  - **Meeting Links:** Compact student meeting links table, clickable launch buttons, one-click copy with feedback, add/edit modal supporting primary and backup links.
  - **Settings / Account:** Regional preferences, live header time in Asia/Kolkata, session logout.
- [x] All legacy routes (`fees`, `reports`) redirect cleanly to consolidated `Finances`.
- [x] Bulk import feature permanently retired and removed from active navigation.

## 3. Data Integrity and Google Sheets Schema

- [x] The Google Spreadsheet contains **strictly the six canonical tables**:
  1. `Students` (9 cols)
  2. `Packages` (12 cols)
  3. `Payments` (6 cols)
  4. `ClassSessions` (8 cols)
  5. `MeetingLinks` (4 cols)
  6. `StudentNotes` (5 cols)
- [x] No `package_id` in `Packages`; keyed by `student_id`.
- [x] No `session_id` or stored end-time in `ClassSessions`; keyed by `student_id__schedule_date__schedule_time` (or row index); duration loaded from `Packages.class_duration`.
- [x] Dynamic header mapping via `HeaderMapper.gs` avoids reliance on hardcoded column letters.
- [x] Dates normalized between Sheets `dd/mm/yyyy` and ISO `yyyy-mm-dd`. Leading `+` or `=` escaped.
- [x] Class balances derived dynamically from sessions where `deduct_class === true`.
- [x] Non-deducted cancellations trigger automatic replacement session scheduling at the next recurring slot.
- [x] Currency values preserved in original transaction currency; manual `in_inr` entry for INR conversions. Unconverted foreign payments do not mix into INR totals.

## 4. Code Quality and File Architecture

- [x] Every text file in `src/` and `public/` is strictly <= 149 lines (`npm run check:lines` passes).
- [x] Zero catch-all files (`utils.ts`, `helpers.ts`, `app.js`, etc.).
- [x] Strict TypeScript check passes with zero errors (`npm run typecheck`).
- [x] Automated test suite passes (`npm run test`).
- [x] Clean production build completes (`npm run build`).

## 5. Security and Operations

- [x] Frontend never connects directly to Google Sheets API.
- [x] Zero credentials or private keys in client bundle or Git.
- [x] Backend scripts run under administrator execution context with server-side authorization.
- [x] ScriptProperties used for runtime configuration (`ADMIN_AUTH_KEY`, `ADMIN_EMAILS`, etc.).
- [x] Google Apps Script deployment synchronized and deployed in-place.

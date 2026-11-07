# Personal Dashboard (Student Management Dashboard)

Private, admin-only management dashboard for managing online tutoring students, packages, payments, class scheduling, attendance, meeting links, and student notes.

## Architecture

- **Frontend:** React 18 + TypeScript + Vite (hosted on Vercel)
- **Backend:** Google Apps Script Web App (API, business logic & HMAC-SHA256 session authentication)
- **Canonical Datastore:** Exactly six Google Sheets tables in one private Google Spreadsheet
- **Primary Timezone:** `Asia/Kolkata` (IST, UTC+05:30)
- **Base Currency:** `INR` (with multi-currency support and manual `in_inr` conversion)

## The Six Canonical Google Sheets Tables

The canonical datastore contains **strictly six tables**. No other tables exist.

1. **`Students`** (9 columns): `student_id, student_name, parent_name, parent_phone, parent_email, student_phone, student_email, subject, status`
2. **`Packages`** (12 columns): `student_id, student_name, plan_type, currency, package_price, per_class, classes_purchased, start_date, end_date, next_due_date, class_duration, class_schedule`
   *(No `package_id` column; packages are linked by `student_id`)*
3. **`Payments`** (6 columns): `student_id, student_name, payment_date, amount, currency, in_inr`
4. **`ClassSessions`** (8 columns): `student_id, student_name, schedule_date, schedule_time, attendance_status, session_status, deduct_class, cancellation_reason`
   *(No `session_id` column and no stored end-time column; sessions use composite key `student_id__schedule_date__schedule_time` and end time is derived from `Packages.class_duration`)*
5. **`MeetingLinks`** (4 columns): `student_id, student_name, meeting_link_1, meeting_link_2`
6. **`StudentNotes`** (5 columns): `student_id, student_name, note_date, note_text, follow_up_date`

## Micro-File Rule

Every source file under `src/` and `public/` must remain strictly under 150 lines (maximum 149 lines). Catch-all files (e.g. `utils.ts`, `helpers.ts`, `app.js`, `actions.js`, `api.ts`) are strictly forbidden. Split by single responsibility.

## Development & Testing Commands

```bash
# Install dependencies
npm install

# Run automated line-limit policy check (strictly <= 149 lines)
npm run check:lines

# Run TypeScript strict typecheck (zero errors)
npm run typecheck

# Run Vitest automated unit and domain regression suite
npm run test

# Run full quality check (lines + typecheck + tests)
npm run check

# Start local development server (Vite)
npm run dev

# Build production bundle (tsc && vite build)
npm run build

# Run Playwright E2E integration tests
npm run test:e2e
```

## Documentation Reference

Authoritative documentation is maintained across the numbered specification directories:
- `00-documentation/`: Authoritative system specifications (Architecture, Data Model, Business Rules, API, Security, Testing, Deployment)
- `01-frontend/`: Frontend architecture, page interactions, design system, and state management
- `02-backend/`: Google Apps Script backend architecture, handlers, services, and Google Sheets access
- `03-data/`: Canonical 6-table spreadsheet schema, data dictionary, financial calculations, and migration history
- `04-quality-and-operations/`: Quality assurance, test strategy, deployment runbook, backup, and troubleshooting
- `05-agent-handoff/`: Durable project state, implementation sequence, and AI coding agent rules

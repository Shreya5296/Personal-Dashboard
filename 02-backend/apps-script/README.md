# Google Apps Script Backend

Backend API and business services for the Student Management Dashboard.

## Architecture
- Executed on Google Apps Script (V8 runtime).
- Deployed as a Web App (`doPost` / `doGet`).
- Canonical datastore: private master Google Spreadsheet (12 tabs).
- Timezone: `Asia/Kolkata`.

## Logical Structure
- `api/`: API entry point, request parsing, router, response envelope.
- `auth/`: Identity verification, token validation, admin authorization.
- `sheets/`: Spreadsheet provider, header mapping, row reading/writing, locking.
- Domain folders: `students/`, `enrollments/`, `packages/`, `fees/`, `payments/`, `classes/`, `meeting-links/`, `notes/`, `imports/`, `audit/`.
- `shared/`: ID generation, date/time formatting, money rounding, error codes.
- `config/`: Runtime configuration (Script Properties).

## Micro-File Limit
Every `.gs` module must remain under 150 lines (<= 149 lines). Catch-all files are prohibited.

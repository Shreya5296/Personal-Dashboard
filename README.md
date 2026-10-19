# Student Management Dashboard

Admin-only management dashboard for students, enrollments, packages, fee obligations, payments, class scheduling, and meeting links.

## Architecture
- **Frontend:** React + TypeScript + Vite (hosted on Vercel)
- **Backend:** Google Apps Script Web App (API & server-side authorization)
- **Canonical Datastore:** Private Google Spreadsheet (12 tabs)
- **Timezone:** `Asia/Kolkata`
- **Currency:** `INR`

## Micro-File Rule
Every text source file under `src/` and `public/` must remain strictly under 150 lines (maximum 149 lines). Catch-all files (e.g. `utils.ts`, `helpers.ts`, `app.js`, `actions.js`, `api.ts`) are strictly forbidden.

## Commands

```bash
# Install dependencies
npm install

# Run automated line-limit and architectural policy checks
npm run check:lines

# Run type checking
npm run typecheck

# Run automated tests
npm run test

# Run full validation suite
npm run check

# Start local development server
npm run dev

# Build production bundle
npm run build
```

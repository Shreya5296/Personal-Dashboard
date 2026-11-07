# 01 — Frontend Requirements

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** Frontend-01
- **Status:** Authoritative Frontend Requirements Specification
- **Version:** 4.0.0
- **Audience:** Frontend developers, UI/UX engineers, AI coding agents

---

## 2. Product Context & Technical Scope

The Personal Dashboard frontend is a responsive single-page web application (SPA) built with React 18, TypeScript, and Vite.
It communicates exclusively with the Google Apps Script Web App backend via HTTP POST requests and never connects directly to Google Sheets.

### 2.1 Supported Browsers & Devices
- Desktop (Chrome, Edge, Firefox, Safari) is the primary target environment.
- Responsive design accommodates tablets and mobile devices with collapsible navigation and scrollable table containers.

### 2.2 Navigation Architecture (`Sidebar.tsx`, `appRoutes.tsx`)
The authenticated application shell provides unified navigation across six primary operational sections and a user settings area:
1. 📊 **Dashboard (`dashboard`):** Operational metrics, today's scheduled classes with 1-click Join Class action, attention alerts, and weekly schedule overview.
2. 📅 **Calendar (`calendar`):** 7-day Google Calendar style time grid (06:00 to 23:00) with Day, Week, and Month views, unified 3-color status logic, and slot conflict prevention.
3. 🎓 **Students (`students`):** Complete student directory with Active/Inactive status tabs, multi-subject select, 4-section registration modal, inline row details expansion, and edit student modal.
4. ⏱️ **Class Schedule (`classes`):** Chronological class sessions ledger, student filter, attendance actions (Present, Absent, Cancel, Restore Credit), and auto-scheduling modal.
5. 💰 **Finances (`finances`):** Consolidated financial ledger replacing legacy separate fees/reports screens. Contains summary metric cards (Total Invoice, Collected Earnings, Outstanding Debt), Student Balances table with Add Payment modal, and Payment History table with search, date filters, and CSV export.
6. 🔗 **Meeting Links (`meeting-links`):** Student virtual room links table with automatic platform detection (Google Meet, Zoom, Other), clickable join buttons, and 1-click copy buttons.
7. ⚙️ **Settings (`settings`):** Accessible via top-right AccountDropdown; displays regional preferences (Asia/Kolkata timezone, INR base currency, 60-min default duration).

*Legacy Route Compatibility:*
- Legacy routes for `fees` and `reports` are preserved in `appRoutes.tsx` and automatically render `FinancesPage`.
- Legacy `imports` feature is permanently retired.

---

## 3. Micro-File Architecture Constraint

Every source file in `src/` and `public/` must strictly contain **at most 149 lines**. Monolithic catch-all files (`utils.ts`, `helpers.ts`, `app.js`, `api.ts`, monolithic CSS) are strictly prohibited and enforced via `npm run check:lines`.

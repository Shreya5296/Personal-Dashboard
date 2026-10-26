# Archived Migration, Sync & Verification Scripts

This directory contains one-time setup, live synchronization, and backend verification scripts that are preserved for audit and historical record, but are no longer part of active test suites or runtime builds.

### 1. `live-sync-stu004.js`
- **Purpose**: Seeded and synchronized student record `STU_004` (Sudarshini) to Google Sheets, including package (32 classes, Per Class, INR 12,500), payment, and recurring Saturday/Sunday classes.
- **Status**: Completed and archived. Not part of CI/CD or automated test suites.

### 2. `live-sync-stu005.js`
- **Purpose**: Seeded and synchronized student record `STU_005` (Krishnavi) to Google Sheets, including package (30 classes, Per Class, GBP 150), payment, confirmed Saturday 6:00 PM schedule, and rescheduling audit notes.
- **Status**: Completed and archived. Not part of CI/CD or automated test suites.

### 3. `live-verify-backdated-sessions.js`
- **Purpose**: Verified backdated sessions (19 January 2026) for `STU_001` against the live Google Sheets backend.
- **Status**: Completed and archived.

### 4. `live-verify-date-formats.js`
- **Purpose**: Verified Google Sheets date standardization operation (`system.standardizeDateFormats`).
- **Status**: Completed and archived.

### 5. `live-e2e-schedule-verification.js`
- **Purpose**: Verified recurring schedule saving and persistence on the live Apps Script Web App.
- **Status**: Completed and archived.

### 6. `live-e2e-sheets-verification.js`
- **Purpose**: Verified Google Sheets persistence across student, package, class session, and payment tables.
- **Status**: Completed and archived.

### 7. `live-e2e-status-and-calendar-verification.js`
- **Purpose**: Verified student status normalization and calendar synchronization against live deployment.
- **Status**: Completed and archived.

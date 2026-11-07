# 10 — Testing and Acceptance Criteria

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** 10
- **Status:** Authoritative Quality Assurance Specification
- **Version:** 4.0.0
- **Audience:** QA engineers, developers, AI coding agents

---

## 2. Test Strategy & Architecture

Testing enforces data integrity, security boundaries, business invariants, and the single-purpose micro-file rule.
All automated tests execute against synthetic mock environments and **never run destructive operations against the live production Google Sheet**.

```text
Test Layers:
1. Static Policy Checks: scripts/check-line-limits.js (Strictly <= 149 lines, 0 catch-alls)
2. Static Type Checks: TypeScript compiler (tsc --noEmit, strict mode)
3. Unit & Domain Tests: Vitest (MockSpreadsheet in-memory datastore)
4. Integration & Regression Suites: Vitest (Multi-domain lifecycles, Batch 2–5 regressions)
5. End-to-End Tests: Playwright (Browser-driven UI and API verification)
```

---

## 3. Automated Test Organization

```text
tests/
├── mocks/
│   └── MockSpreadsheet.ts             # In-memory mock implementing Apps Script SpreadsheetApp
├── fixtures/
│   └── syntheticData.ts               # Synthetic students, packages, sessions, payments
├── domains/                           # Domain business logic tests
│   ├── classesAndCredits.test.ts      # Class deduction & balance calculation
│   ├── earningsCalculations.test.ts   # Multi-currency financial aggregations
│   ├── packageCalculations.test.ts    # Package expiry & N-4 due date derivation
│   ├── yearlyPackageCalculations.test.ts # Yearly occurrence generation
│   ├── studentIdIntegrity.test.ts     # Sequential STU_001 ID integrity
│   ├── inactivityAndAttention.test.ts # Active/Inactive status classification
│   └── registrationFailureAndRecovery.test.ts # Idempotent registration retry
├── frontend/                          # Frontend component & helper tests
│   ├── apiClient.test.ts              # HTTP text/plain transport & error handling
│   ├── calendarViews.test.ts          # Day/Week/Month calendar views & event positioning
│   ├── formatters.test.ts             # Currency, date, and 12h time formatters
│   ├── studentRegistrationAndDirectory.test.ts # 4-section form validation
│   ├── financesConsolidation.test.ts  # Consolidated finances page & summary cards
│   └── meetingLinksRefinements.test.ts# Platform badges & link copy behavior
├── backend/                           # Apps Script backend tests
│   ├── apiEntry.test.ts               # doPost parsing & response envelope
│   ├── operationAdapters.test.ts      # OperationRouter handler mappings
│   ├── securityHardening.test.ts      # HMAC-SHA256 signature verification & allowlist
│   └── classSchedulePersistence.test.ts # Recurring schedule string serialization
├── schema/                            # Schema migration & integrity tests
│   ├── schemaValidation.test.ts       # 6 canonical tables header validation
│   └── absentOperationalTabsRegression.test.ts # Verifies system functions without legacy tabs
├── integration/                       # Multi-batch regression suites
│   ├── batch2FixesRegression.test.ts  # Status badges, phone prefix escaping
│   ├── batch3FixesRegression.test.ts  # Attendance deduction & rescheduling
│   ├── batch4FixesRegression.test.ts  # Currency insulation & 12h local time mapping
│   ├── batch5FixesRegression.test.ts  # Soft muted calendar styling, STU_005 active classification
│   └── calendarFinalFixRegression.test.ts # Unified 3-color status logic
└── e2e/                               # Playwright browser end-to-end tests
    ├── auth.spec.ts                   # Login, session persistence, logout
    ├── students.spec.ts               # Student registration, search, and directory
    ├── classes.spec.ts                # Session attendance marking & cancellation
    └── meetingLinksAndFinancesRefinements.spec.ts # Finances modal & meeting links table
```

---

## 4. Test & Verification Commands

```bash
# 1. Automated line-limit and catch-all policy check
npm run check:lines

# 2. Strict TypeScript type check
npm run typecheck

# 3. Unit and integration regression suite
npm run test

# 4. Full pre-commit check (lines + typecheck + tests)
npm run check

# 5. Playwright E2E browser tests
npm run test:e2e
```

---

## 5. Current Test Suite Status

### Observed Test State: PASSED (58 suites passed, 389 tests passed)
The automated regression suite is fully healthy:
- **Test Suites:** 58 passed, 0 failed (58 total)
- **Tests:** 389 passed, 0 failed, 0 skipped (389 total)

### Deterministic Test Date Helpers (`tests/fixtures/testDateHelpers.ts`):
Four unit test files (`registrationControlsAndPolish.test.ts`, `scheduleSimplificationAndDashboard.test.ts`, `studentManagementEnhancements.test.ts`, and `studentRegistrationAndDirectory.test.ts`) previously used expired static dates (`2026-11-02`). They have been updated to use deterministic date helpers:
- `getNextWeekday(dayName, offsetWeeks)`: Computes the next occurrence of a weekday strictly in the future relative to UTC today.
- `getFutureDate(daysAhead)`: Computes a future date string `YYYY-MM-DD` offset from UTC today.

This preserves production validation invariants while ensuring tests remain deterministic and immune to future calendar expiration. Zero production code was altered.

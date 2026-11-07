# 08 — Frontend File and Code Architecture

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** 08
- **Status:** Authoritative Frontend Code Architecture Specification
- **Version:** 4.0.0
- **Audience:** Developers, frontend engineers, AI coding agents

---

## 2. Core Architectural Invariants

1. **Mandatory Micro-File Limit:**
   Every source file under `src/` and `public/` must strictly contain **at most 149 lines**. This is validated by CI check:
   ```bash
   npm run check:lines
   ```
2. **Zero Catch-All Monoliths:**
   No generic catch-all files are permitted (e.g. `utils.ts`, `helpers.ts`, `actions.js`, `app.js`, `api.ts`).
3. **Single Responsibility per File:**
   Large components must be split into sub-components, custom hooks, type definitions, validation schemas, and CSS modules.
4. **CSS Modules & Design Tokens:**
   Styles are co-located with components as CSS Modules (`[Component].module.css`) and reference global tokens in `tokens.css`.

---

## 3. Directory Layout & Module Responsibilities

```text
src/
├── main.tsx                    # Application bootstrap & React root rendering
├── vite-env.d.ts               # Vite client types definition
├── styles/
│   ├── tokens.css              # Design tokens (colors, spacing, typography, shadows, borders)
│   ├── reset.css               # Box-sizing & browser element reset
│   └── global.css              # Typography base, body defaults, utility styles
├── config/
│   ├── publicConfig.ts         # Public build constants (APP_NAME, APP_TITLE)
│   └── runtimeConfig.ts        # Environment variable resolver (appsScriptUrl, useMockData)
├── api/
│   ├── apiClient.ts            # Central HTTP POST transport (text/plain, redirect: follow)
│   ├── apiErrors.ts            # ApiClientError & ApiNetworkError classes
│   ├── apiResponse.ts          # Generic ApiResponse<T> interface
│   ├── requestId.ts            # Unique request ID generator
│   ├── mockDataStore.ts        # In-memory mock API handler for local testing
│   ├── mockDataInitial.ts      # Initial mock seed records
│   └── mockClassOperations.ts  # Mock class scheduling helpers
├── auth/
│   ├── AuthProvider.tsx        # React Context provider for authenticated session
│   ├── RequireAdmin.tsx        # Route authorization guard
│   ├── authState.ts            # AuthUser & AuthContext types
│   ├── identityToken.ts        # Session token storage & retrieval (sessionStorage)
│   ├── signIn.ts               # Token decoding & session initialization
│   ├── signOut.ts              # Session cleanup & logout handler
│   └── userProfileStorage.ts   # Display name resolver & profile storage
├── layout/
│   ├── AppShell.tsx            # Main two-panel layout container
│   ├── TopBar.tsx              # Top navigation bar, greeting, live time
│   ├── Sidebar.tsx             # Left navigation menu & user profile footer
│   ├── PageHeader.tsx          # Reusable page title and subtitle header
│   ├── AccountDropdown.tsx     # User avatar, settings link, sign out dropdown
│   └── useLiveHeaderTime.ts    # Live updating 12h time in Asia/Kolkata
├── components/
│   ├── buttons/                # Button component with variants (primary, secondary, danger)
│   ├── forms/                  # FormField, FormError, input wrappers
│   ├── tables/                 # DataTable, TablePagination, colgroup helpers
│   ├── overlays/               # ConfirmDialog, modal backdrops
│   ├── feedback/               # LoadingState, ErrorState, EmptyState, ErrorBoundary, InlineNotice
│   └── icons/                  # SVG NavIcons and ActionIcons
├── hooks/
│   ├── useAsyncState.ts        # Generic async state management hook (data, loading, error)
│   ├── useDebouncedValue.ts    # Value debouncer for search inputs
│   └── usePageTitle.ts         # Browser document.title updater
├── lib/
│   ├── balanceFormat.ts        # Class balance badge formatters
│   ├── currencyFormat.ts       # Currency formatters with INR & symbol support
│   ├── dateFormat.ts           # Timezone-safe date formatting (dd/mm/yyyy & YYYY-MM-DD)
│   ├── textFormat.ts           # Text truncation & capitalization helpers
│   ├── time12Format.ts         # 12-hour AM/PM time formatting in Asia/Kolkata
│   ├── urlSafety.ts            # URL scheme validator (https only)
│   └── userPreferences.ts      # Local preference persistence
├── app/
│   ├── App.tsx                 # Root component wrapped with ErrorBoundary & Providers
│   ├── AppProviders.tsx        # AuthProvider & Theme context nesting
│   ├── appRoutes.tsx           # Navigation section router (Dashboard, Calendar, Students, etc.)
│   └── routeAccess.ts          # Route access definitions
└── domains/                    # Domain-specific pages, hooks, forms, tables, and APIs
    ├── dashboard/              # DashboardPage, TodayClassesSection, DashboardSummary, ThingsThatNeedAttention
    ├── calendar/               # CalendarPage, DayCalendarView, WeeklyTimeGrid, MonthCalendarView, classification
    ├── students/               # StudentsPage, StudentList, AddStudentModal, EditStudentModal, registration, status
    ├── classes/                # ClassesPage, ClassSchedule, AttendanceControl, AutoScheduleModal, session calculations
    ├── finances/               # FinancesPage, FinanceSummaryCards, StudentBalanceTable, FinancialHistoryTable, AddPayment
    ├── meeting-links/          # MeetingLinksPage, MeetingLinkTable, MeetingLinkModal, platform detector
    ├── packages/               # PackageList, PackageForm, PackageBalance, yearly calculations
    ├── payments/               # PaymentList, PaymentForm, paymentApi
    ├── notes/                  # StudentNotes, StudentNoteForm, noteApi
    ├── fees/                   # Legacy domain routes cleanly redirecting to Finances
    ├── enrollments/            # Legacy enrollment types
    ├── reports/                # Report API client (financialSummary)
    └── settings/               # SettingsPage, RegionalPreferencesCard
```

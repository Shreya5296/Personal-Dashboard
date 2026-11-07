# 06 — Configurable Business Policies

## 1. Purpose

This document defines which operational policies and parameters are configurable, where they are stored, how they are validated, and which business rules remain strictly fixed in application code.

Configuration supports legitimate operational preferences without requiring code changes. It must not bypass authorization, weaken data integrity, or alter historical calculations silently.

## 2. Configuration Storage Architecture

The obsolete on-sheet `AppConfig` tab was **permanently retired** in Phase 16.

All runtime configuration is managed through **`ConfigService.gs`**, which reads from **Apps Script `ScriptProperties`** with safe in-code defaults:

```text
Configuration Hierarchy:
1. Fixed Security & Data Invariants (Code & Schemas)
2. Apps Script ScriptProperties (Server-side environment configuration)
3. In-Code Default Constants (APP_DEFAULTS in ConfigService.gs)
4. Frontend Public Environment Variables (Vite public config)
```

### 2.1 Backend Script Properties (Authoritative)

| Property Key | Type | Description | Default |
|---|---|---|---|
| `ADMIN_AUTH_KEY` | String (Secret) | HMAC-SHA256 secret key for signing session tokens | Required for auth |
| `ADMIN_EMAILS` | Comma-delimited | Allowlist of authorized administrator emails | `ashreya0502@gmail.com` |
| `SCHEMA_VERSION` | String | Current canonical schema version | `2.0.0` |
| `DEFAULT_TIMEZONE` | String (IANA) | System time zone for scheduling & calendar | `Asia/Kolkata` |
| `DEFAULT_CURRENCY` | String (ISO) | Default billing currency | `INR` |
| `DEFAULT_CLASS_DURATION_MINUTES` | Integer string | Default session duration in minutes | `60` |

### 2.2 Frontend Runtime & Environment Variables

| Variable | Environment | Description |
|---|---|---|
| `VITE_APPS_SCRIPT_URL` | Public (Build/Env) | Published Web App URL (`https://script.google.com/macros/s/.../exec`) |
| `VITE_USE_MOCK_DATA` | Local Dev / Test | Set to `true` to run against local in-memory mock store |
| `VITE_APP_TITLE` | Public (Build/Env) | Application title in header |

*Security Rule:* No private API keys, service account credentials, or database secrets are ever stored in frontend environment variables.

## 3. Fixed Business Invariants (Non-Configurable)

The following rules are structural and cannot be overridden by configuration:
1. **The Six-Table Datastore:** Only `Students`, `Packages`, `Payments`, `ClassSessions`, `MeetingLinks`, and `StudentNotes` exist.
2. **Package Identity:** Packages are linked by `student_id`. No `package_id` exists in the Google Sheet.
3. **Session Identity:** Sessions are keyed by composite `student_id__schedule_date__schedule_time` (or row index). No `session_id` exists in the Google Sheet.
4. **Attendance Deduction:** Attended sessions (`PRESENT`/`ATTENDED`) deduct 1 class credit. Non-deducted cancellations preserve the credit and auto-schedule a replacement.
5. **Currency Handling:** Original currency is preserved. Non-INR foreign payments without manual `in_inr` contribute 0 to INR financial summaries. No unapproved third-party exchange rate API is called.
6. **Micro-File Limit:** All frontend source files strictly <= 149 lines.

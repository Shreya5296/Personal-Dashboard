# 03 — Security and Authentication

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** 03
- **Status:** Authoritative Security Specification
- **Version:** 4.0.0
- **Audience:** Developers, security auditors, AI coding agents

## 2. Security Architecture Principles

1. **Server-Side Authorization Authority:**
   All permissions and access checks are enforced server-side inside Google Apps Script. The React frontend is an untrusted presentation layer.
2. **Zero-GCP Dependency:**
   Authentication requires no Google Cloud Platform (GCP) project, OAuth consent screen, or external OAuth service. Session tokens are generated and verified cryptographically using HMAC-SHA256 signatures with secrets stored in Apps Script `ScriptProperties`.
3. **Private Datastore:**
   The canonical Google Spreadsheet is private to the owner (`ashreya0502@gmail.com`) and is never published to the web or shared publicly.
4. **No Secrets in Frontend:**
   The frontend build contains zero API secrets, database passwords, or private signing keys.

## 3. Authentication & Session Management

### 3.1 Token Format and Signing
Session tokens are structured compact tokens consisting of base64-encoded JSON payload and a cryptographic HMAC-SHA256 signature:
```text
[base64UrlPayload].[base64UrlSignature]
```
The payload contains:
- `email`: Authenticated administrator email.
- `iat`: Issued-at epoch timestamp (seconds).
- `exp`: Expiry epoch timestamp (seconds).
- `iss`: Issuer identifier (`personal-dashboard-backend`).

### 3.2 Verification Flow (`IdentityVerifier.gs`)
Every protected operation received by `doPost(e)` must pass through `verifyIdentityToken(token)`:
1. **Presence Check:** Ensures `token` is non-empty.
2. **Mock Token Guard:** In production runtime (`UrlFetchApp` present), synthetic mock tokens (e.g. `mock_token_for_...`) are rejected unconditionally.
3. **Secret Key Retrieval:** Reads secret key `ADMIN_AUTH_KEY` from Apps Script `ScriptProperties`.
4. **Signature Validation:** Computes `Utilities.computeHmacSha256Signature(payloadStr, secretKey)` using Apps Script `Utilities` service and performs constant-time comparison against the token signature.
5. **Expiry Verification:** Checks that current server time does not exceed `exp`.
6. **Administrator Allowlist:** Checks that the verified email matches `getAdminAllowlist()` (`AdminAuthorization.gs`).

### 3.3 Admin Allowlist (`AdminAuthorization.gs`)
- Configured via Script Property `ADMIN_EMAILS` (comma-separated string).
- Primary administrator: `ashreya0502@gmail.com`.
- Requests from unlisted emails return HTTP 200 with `{ ok: false, error: { code: 'ACCESS_DENIED', message: 'Forbidden' } }`.

## 4. Input Validation & Data Safety

### 4.1 Spreadsheet Formula Injection Protection
When user input begins with `=`, `+`, `-`, or `@`, Google Sheets may interpret the cell as an executable formula.
- In `HeaderMapper.gs`, any text field starting with `+` or `=` (such as international phone numbers `+91 ...`) is prepended with a single quote (`'`) before writing to the sheet:
  ```javascript
  if (typeof val === 'string' && (val.charAt(0) === '+' || val.charAt(0) === '=')) {
    row[i] = "'" + val;
  }
  ```
- On reading, `HeaderMapper.gs` strips any leading `'` to restore the clean user text:
  ```javascript
  if (typeof val === 'string' && val.charAt(0) === "'") {
    val = val.substring(1);
  }
  ```

### 4.2 URL Scheme Safety
Meeting links entered by the administrator are validated to ensure only safe schemes are accepted:
- Permitted schemes: `https://` (e.g. `https://meet.google.com/...`, `https://zoom.us/j/...`).
- Unsafe schemes (`javascript:`, `data:`, `file:`) are strictly rejected.

### 4.3 Concurrency & Locking
To prevent race conditions when updating student class credits or generating batch sessions:
- `LockManager.gs` wraps sensitive persistence operations in `LockService.getScriptLock()`.
- Maximum lock timeout: 10,000–15,000 milliseconds.

## 5. Audit Logging (`AuditLog`)

Operationally and financially significant administrative actions (student creation, package creation, payment recording, session scheduling, session completion, and cancellation) record an audit event.
- Stored internally with actor identity, timestamp, entity type, entity ID, action, request ID, and sanitized before/after summaries.
- Secrets and tokens are never logged.

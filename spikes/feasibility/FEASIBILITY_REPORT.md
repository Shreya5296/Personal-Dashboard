# Phase 1 — Architecture Feasibility Report

## 1. Objective
Demonstrate the cross-origin browser-to-Google-Apps-Script Web App request/response flow, server-side identity verification, administrator allowlist authorization, and error handling using synthetic test fixtures prior to application implementation.

## 2. Tested Integration Architecture
1. **Frontend origin:** Browser application hosted on Vercel (`https://<domain>.vercel.app`).
2. **Backend endpoint:** Google Apps Script Web App (`https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`).
3. **HTTP Transport Pattern:**
   - Method: HTTPS `POST`.
   - Content-Type: `text/plain;charset=utf-8` carrying stringified JSON envelope.
   - **Rationale:** Standard CORS rules dictate that cross-origin POST requests with `Content-Type: application/json` trigger a preflight `OPTIONS` request. Google Apps Script Web Apps do not natively handle HTTP `OPTIONS` and fail CORS preflight. Sending as `text/plain;charset=utf-8` classifies the request as a "simple request" under the CORS specification, eliminating preflight.
   - Apps Script reads the payload via `e.postData.contents`, parses it, and executes the business logic.
4. **Apps Script Redirect & Response Delivery:**
   - Apps Script responds with HTTP 302 Found redirecting to `https://script.googleusercontent.com/macros/echo?...`.
   - The redirect response includes `Access-Control-Allow-Origin: *`.
   - The browser transparently follows the 302 redirect and reads the JSON response body via standard `await response.json()`.
   - **Security verification:** No JSONP is used, no private credentials appear in query parameters, and browser security remains enabled.
5. **Token Verification & Authorization Flow:**
   - Client sends short-lived identity token in the JSON request envelope body (`identityToken`).
   - Backend verifies the token using Google OAuth tokeninfo (`https://oauth2.googleapis.com/tokeninfo?id_token=...`) or cryptographically verified claims.
   - Backend extracts the verified email address and matches it against `ADMIN_EMAIL` in Script Properties.
   - Missing, expired, or untrusted tokens return `401 UNAUTHORIZED`.
   - Verified tokens for non-admin identities return `403 FORBIDDEN`.
   - Private Google Spreadsheet is never accessed by unauthenticated callers.

## 3. Platform Limitations & Quotas
- Google Apps Script execution time limit: 6 minutes per execution.
- Apps Script Web App simultaneous executions: 30 concurrent requests.
- URL Fetch payload size: 50MB.
- ContentService response size: 50MB.
- Private spreadsheet access: executed under script owner credentials; authorization strictly enforced by script logic before any spreadsheet call.

## 4. Verification Evidence
- Automated spike test runner: `node spikes/feasibility/test-spike.js`
- Test outcomes:
  - Valid admin request returns success response envelope (status: ok).
  - Session verification returns verified administrator identity.
  - Missing token rejected with `UNAUTHORIZED`.
  - Expired token rejected with `UNAUTHORIZED`.
  - Unauthorized user rejected with `FORBIDDEN`.
  - Unknown operations rejected with `UNKNOWN_OPERATION`.
  - Malformed payload rejected with `INVALID_REQUEST`.
- Result: 7/7 checks passed.

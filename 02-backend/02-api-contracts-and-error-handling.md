# 02 — API Contracts and Error Handling

**Project:** Student Management Dashboard  
**Document status:** Architecture specification  
**Version:** 1.0.0  
**Companion specification:** `00-documentation/06-apps-script-api-specification.md`  
**Governing data model:** `03-data/01-master-spreadsheet-schema.md`

## 1. Purpose

This document provides the detailed endpoint/operation contracts, payload schemas, response structures, and error envelopes for the Google Apps Script backend. All frontend-to-backend communication passes through these structured contracts.

## 2. Common Envelopes

### 2.1 Request Envelope

Every request sent to the Apps Script Web App (`doPost(e)`) must adhere to this JSON structure:

```json
{
  "apiVersion": "1",
  "operation": "payments.record",
  "requestId": "req_01HPX7...",
  "idempotencyKey": "idem_01HPX7...",
  "identityToken": "<short-lived-google-identity-token>",
  "payload": {}
}
```

- `apiVersion`: Required string; initially `"1"`.
- `operation`: Required registered operation string (e.g., `"payments.record"`).
- `requestId`: Required unique client-generated request correlation identifier for distributed tracing and audit logging.
- `idempotencyKey`: Required for retryable state-changing mutations (`payments.record`, `classes.complete`, etc.); optional for queries.
- `identityToken`: Required identity token for protected operations.
- `payload`: Required object containing operation-specific parameters.

### 2.2 Response Envelope

All API operations return a consistent JSON response envelope:

```json
{
  "apiVersion": "1",
  "requestId": "req_01HPX7...",
  "success": true,
  "data": {},
  "error": null
}
```

When an error occurs (`success: false`):

```json
{
  "apiVersion": "1",
  "requestId": "req_01HPX7...",
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error explanation",
    "details": {
      "field": "feeObligationId",
      "reason": "Missing required fee obligation"
    },
    "retryable": false
  }
}
```

### 2.3 Standard Error Codes

| Code | HTTP Equivalent | Meaning | Retryable |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | Missing, malformed, or expired identity token | Yes (after re-auth) |
| `FORBIDDEN` | 403 | Authenticated identity is not the authorized administrator | No |
| `VALIDATION_ERROR` | 400 | Payload failed schema, type, or boundary validation | No |
| `RECORD_NOT_FOUND` | 404 | Referenced student, obligation, package, or class does not exist | No |
| `CONFLICT` | 409 | Concurrent update conflict or state machine transition error | Yes (after reload) |
| `IDEMPOTENCY_CONFLICT`| 409 | Reused `idempotencyKey` with materially different payload | No |
| `INTERNAL_ERROR` | 500 | Unhandled backend exception or Google Sheets API failure | Yes |

---

## 3. Financial Operation Contracts

### 3.1 `payments.record`

Records a received payment against a fee obligation.

#### Request Payload
```json
{
  "studentId": "stu_01...",
  "feeObligationId": "fee_01...",
  "paymentDate": "2026-10-19",
  "amount": 5000.00,
  "currency": "INR",
  "paymentMethod": "UPI",
  "transactionReference": "UPI/1234567890",
  "notes": "October installment"
}
```

#### Field Specifications
- `studentId` (string, required): Existing student ID.
- `feeObligationId` (string, required): **Mandatory for every Version 1 payment.** Unallocated advance payments and unallocated credits are strictly out of scope.
- `paymentDate` (string, required): Date received in ISO `YYYY-MM-DD`.
- `amount` (number, required): Positive numeric amount in INR.
- `currency` (string, required): Must be `"INR"`.
- `paymentMethod` (string, required): One of `UPI`, `BANK_TRANSFER`, `CASH`, `CARD`, `OTHER`.
- `transactionReference` (string, optional): External receipt/transaction reference.
- `notes` (string, optional): Operational notes.
- Envelope `idempotencyKey` (string, required): Mandatory deduplication key.

#### Backend Validation & Rejection Rules
The backend strictly evaluates:
1. `feeObligationId` presence: Missing ID is rejected (`VALIDATION_ERROR`).
2. Obligation existence & status: Obligation must exist and `obligation_status` must not be `VOID`. If nonexistent or void, reject with `RECORD_NOT_FOUND` or `CONFLICT`.
3. Student match: `obligation.student_id === payload.studentId`. Cross-student allocations are strictly rejected (`VALIDATION_ERROR`).
4. Currency match: `obligation.currency === payload.currency`.
5. Balance check: `payload.amount` must not exceed `obligation.outstanding_amount`. Overpayments are rejected.
6. Persisted Idempotency check:
   - Check `Payments.idempotency_key` in the master spreadsheet.
   - If key matches and payload is equivalent (same student, obligation, amount, and currency), return the original payment record and financial summary (`success: true`).
   - If key matches but payload differs materially, reject with `IDEMPOTENCY_CONFLICT`.
   - If key is new, persist the payment with `idempotency_key` inside `LockService.getScriptLock()`.

#### Success Response Data
```json
{
  "payment": {
    "payment_id": "pay_01...",
    "student_id": "stu_01...",
    "fee_obligation_id": "fee_01...",
    "payment_date": "2026-10-19",
    "amount": 5000.00,
    "currency": "INR",
    "payment_method": "UPI",
    "transaction_reference": "UPI/1234567890",
    "idempotency_key": "idem_01HPX7...",
    "payment_status": "RECORDED",
    "notes": "October installment",
    "created_at": "2026-10-19T15:40:00.000Z",
    "updated_at": "2026-10-19T15:40:00.000Z",
    "voided_at": null,
    "void_reason": null
  },
  "obligationSummary": {
    "fee_obligation_id": "fee_01...",
    "amount_due": 10000.00,
    "paid_amount": 5000.00,
    "outstanding_amount": 5000.00,
    "obligation_status": "PARTIALLY_PAID"
  }
}
```

### 3.2 `payments.void`

Voids a previously recorded payment and restores the obligation balance.

#### Request Payload
```json
{
  "paymentId": "pay_01...",
  "voidReason": "Check bounced / duplicate entry"
}
```

#### Behavior
- Sets `payment_status = VOID`, `voided_at = now()`, and `void_reason`.
- Recalculates `paid_amount`, `outstanding_amount`, and `obligation_status` on the fee obligation.
- Records an audit log entry.
- Does not physically delete the payment row.

---

## 4. Class Session Operation Contracts

### 4.1 `classes.create` (Schedule Session)

#### Request Payload
```json
{
  "studentId": "stu_01...",
  "enrollmentId": "enr_01...",
  "packageId": "pkg_01...",
  "meetingLinkId": "ml_01...",
  "classTitle": "Mathematics Session 1",
  "scheduledStart": "2026-10-20T10:00:00.000Z",
  "scheduledEnd": "2026-10-20T11:00:00.000Z",
  "notes": "Bring textbook"
}
```

#### Rules
- `classTitle`: Required. Frontend supplies default `"Class session"` if left blank.
- `scheduledEnd`: Required. If the administrator entered a duration, the UI or backend calculates and persists `scheduledEnd = scheduledStart + duration`.
- Stored `class_credit_effect` is set to `PENDING`. No credits are consumed.

### 4.2 `classes.complete` (Complete Session)

#### Request Payload
```json
{
  "classSessionId": "cls_01...",
  "attendanceStatus": "ATTENDED",
  "actualStart": "2026-10-20T10:02:00.000Z",
  "actualEnd": "2026-10-20T11:00:00.000Z",
  "notes": "Completed exercises 1-5"
}
```

#### Deduplication & Credit Rules
1. Backend acquires script lock (`LockService.getScriptLock()`).
2. Checks current state:
   - If already `COMPLETED`, return current record without deducting credit again.
3. Applies finalized Version 1 policy:
   - `ATTENDED` and linked to eligible package: `class_credit_effect = CONSUME` (consumes 1 credit).
   - `ATTENDED` without eligible package: `class_credit_effect = NO_CONSUME` (0 credits consumed; no package balance changed).
   - `NO_SHOW`: `class_credit_effect = NO_CONSUME` (0 credits consumed by default).
   - `ABSENT`: `class_credit_effect = NO_CONSUME` (0 credits consumed by default).
   - `EXCUSED`: `class_credit_effect = NO_CONSUME` (0 credits consumed).
4. Persists `completed_at` and updates package balance.

### 4.3 `classes.restoreCredit` (Audited Credit Restoration)

#### Request Payload
```json
{
  "studentId": "std_01...",
  "classPackageId": "pkg_01...",
  "creditRestorationForSessionId": "cls_01...",
  "reason": "Administrative correction for cancelled session mistakenly marked attended",
  "idempotencyKey": "idem_rest_123"
}
```

#### Deduplication & Integrity Rules
1. Acquires script lock (`LockService.getScriptLock()`).
2. Validates idempotency key against `AuditLog.request_id`.
3. Verifies target session:
   - Must exist in `ClassSessions`.
   - Must match `studentId` and `classPackageId`.
   - Must have `class_credit_effect = CONSUME`.
4. Checks at-most-once restoration constraint:
   - No existing record in `ClassSessions` can already have `credit_restoration_for_session_id = creditRestorationForSessionId`.
   - Re-restoration attempts are rejected with `INVALID_STATE` (`DUPLICATE_RESTORATION`).
5. Creates a new record in `ClassSessions` with:
   - `class_credit_effect = CREDIT_BACK`
   - `credit_restoration_for_session_id = creditRestorationForSessionId`
   - `class_title = "Credit Restoration: " + targetSession.class_title` (default `"Credit Restoration"`)
   - `scheduled_start = new Date().toISOString()`
   - `scheduled_end = scheduled_start` (zero duration)
   - `session_status = COMPLETED`
   - `attendance_status = NOT_MARKED`
   - `meeting_link_id = null`
   - `completed_at = scheduled_start`
   - `notes = reason`
6. Operational queries (calendar, schedules, attendance) filter out records with `class_credit_effect = CREDIT_BACK`. The record is displayed solely in package balance and credit audit history.
7. Recalculates package balance: adds $+1$ credit to `remaining_classes`.
8. Emits an audit event.

---

## 5. Other Domain Operation Contracts

### 5.1 `students.create` & `students.update`
- Manages student profiles with stable `student_id`.
- Duplicate checks run as advisory warnings without automatic merging.

### 5.2 `feeObligations.create`
- Creates obligations with `amount_due`, `due_date`, and initial `obligation_status = OPEN`.

### 5.3 `config.get` & `config.updateSetting`
- Exposes non-sensitive settings (`display_currency`, `display_timezone`, `default_class_duration_minutes`).
- `schema_version` is validated on startup and migrations.

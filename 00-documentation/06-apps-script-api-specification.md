# 06 — Apps Script API Specification

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** 06
- **Status:** Authoritative API Contract Specification
- **Version:** 4.0.0
- **Audience:** Frontend developers, backend engineers, AI coding agents

---

## 2. API Architecture & Transport Principles

1. **Single Entry Point (`doPost(e)`):**
   All API requests are sent via HTTP POST to the deployed Google Apps Script Web App URL.
2. **Text/Plain POST Transport:**
   To prevent browser CORS preflight (`OPTIONS`) requests—which Apps Script Web Apps cannot handle—the client sends requests with header `'Content-Type': 'text/plain;charset=utf-8'` and JSON stringified body.
3. **HTTP 302 Redirect Handling:**
   Apps Script redirects successful requests to `script.googleusercontent.com`. The frontend `apiClient.ts` uses `redirect: 'follow'`.
4. **Server-Side Authorization:**
   Protected operations require verified HMAC-SHA256 session tokens. Unauthorized requests return `{ ok: false, error: { code: 'UNAUTHORIZED' } }`.

---

## 3. Request & Response Envelopes

### 3.1 Standard Request Envelope
```json
{
  "apiVersion": "1",
  "operation": "students.list",
  "identityToken": "eyJhbGciOiJIUzI1NiJ9...signature",
  "requestId": "req_1730000000000_abc123",
  "idempotencyKey": "idemp_optional_uuid",
  "payload": { ... }
}
```

### 3.2 Standard Response Envelope
```json
{
  "apiVersion": "1",
  "requestId": "req_1730000000000_abc123",
  "ok": true,
  "data": { ... },
  "error": null,
  "meta": {
    "totalCount": 26,
    "timestamp": "2026-11-07T12:00:00.000Z"
  }
}
```

### 3.3 Error Envelope
```json
{
  "apiVersion": "1",
  "requestId": "req_1730000000000_abc123",
  "ok": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Student name is required",
    "details": { "student_name": "Required field" },
    "retryable": false
  }
}
```

---

## 4. Authoritative Operation Registry

### 4.1 System & Authentication

#### `system.health`
- **Description:** Verifies Web App responsiveness and health.
- **Access:** Public.
- **Payload:** `{}`.
- **Returns:** `{ status: "ok", apiVersion: "1", schemaVersion: "2.0.0", checkedAt: ISOString }`.

#### `auth.verifySession`
- **Description:** Validates administrator session token and returns identity.
- **Access:** Protected.
- **Payload:** `{}`.
- **Returns:** `{ authenticated: true, displayIdentity: string, actorId: string, verifiedAt: ISOString }`.

---

### 4.2 Students Domain

#### `students.list`
- **Description:** Lists all student records from `Students` sheet.
- **Payload:** `{ query?: string, status?: string }`.
- **Returns:** Array of `Student` objects (`student_id, student_name, parent_name, parent_phone, parent_email, student_phone, student_email, subject, status`).

#### `students.get`
- **Description:** Retrieves a single student by ID.
- **Payload:** `{ student_id: string }`.
- **Returns:** `Student` object.

#### `students.create`
- **Description:** Appends a new student to `Students`. Generates next sequential `student_id` (`STU_xxx`).
- **Payload:** `{ student_name: string, parent_name: string, parent_phone: string, parent_email?: string, student_phone?: string, student_email?: string, subject?: string, status?: string }`.
- **Returns:** Created `Student` object.

#### `students.update`
- **Description:** Updates existing student record matched by `student_id`.
- **Payload:** `{ student_id: string, updates: Partial<Student> }`.
- **Returns:** Updated `Student` object.

#### `students.archive` / `students.reactivate`
- **Description:** Sets student status to `ARCHIVED` or `ACTIVE`.
- **Payload:** `{ student_id: string }`.
- **Returns:** Updated `Student` object.

---

### 4.3 Packages Domain

#### `packages.list`
- **Description:** Lists packages from `Packages` sheet, enriched with dynamically calculated consumed and remaining classes.
- **Payload:** `{ student_id?: string }`.
- **Returns:** Array of `Package` objects.

#### `packages.get` / `packages.getBalance`
- **Description:** Retrieves a student's package and balance breakdown.
- **Payload:** `{ student_id: string }` or `{ package_id: string }`.
- **Returns:** Enriched package object (`classes_purchased, consumed_classes, remaining_classes, is_exhausted`).

#### `packages.create`
- **Description:** Creates a package record in `Packages` (12 columns). Idempotently updates existing package if matching student and class count exists.
- **Payload:** `{ student_id: string, student_name?: string, plan_type: string, currency?: string, package_price: number, per_class?: number, classes_purchased: number, class_duration?: number, class_schedule?: string, start_date?: string, end_date?: string, next_due_date?: string }`.
- **Returns:** Enriched `Package` record.

#### `packages.update`
- **Description:** Updates a package in `Packages` matched by `student_id` (or `_rowIndex`).
- **Payload:** `{ student_id: string, updates: Partial<Package> }`.
- **Returns:** Updated `Package` record.

---

### 4.4 Payments Domain

#### `payments.list`
- **Description:** Lists payment records from `Payments` sheet.
- **Payload:** `{ student_id?: string, startDate?: string, endDate?: string }`.
- **Returns:** Array of `Payment` records (`student_id, student_name, payment_date, amount, currency, in_inr`).

#### `payments.record`
- **Description:** Appends a payment record to `Payments`. Supports `idempotency_key` caching.
- **Payload:** `{ student_id: string, student_name?: string, payment_date: string, amount: number, currency: string, in_inr?: number, idempotency_key?: string }`.
- **Returns:** Created `Payment` record with generated ID.

#### `payments.void`
- **Description:** Marks a payment as voided.
- **Payload:** `{ payment_id: string, reason?: string }`.
- **Returns:** `{ success: true, payment_id: string }`.

---

### 4.5 Class Sessions Domain

#### `classes.list`
- **Description:** Lists sessions from `ClassSessions` sheet with derived end-times and durations from `Packages`.
- **Payload:** `{ student_id?: string, startDate?: string, endDate?: string }`.
- **Returns:** Array of `ClassSession` objects (`session_id, student_id, student_name, schedule_date, schedule_time, duration_minutes, attendance_status, session_status, deduct_class, cancellation_reason`).

#### `classes.schedule` / `classes.create`
- **Description:** Schedules a single class session with conflict detection.
- **Payload:** `{ student_id: string, student_name?: string, schedule_date: string, schedule_time: string, duration_minutes?: number }`.
- **Returns:** Scheduled session record.

#### `classes.batchSchedule`
- **Description:** Inserts multiple class sessions idempotently under a script lock.
- **Payload:** `{ student_id: string, sessions: Array<{ schedule_date: string, schedule_time: string, duration_minutes?: number }> }`.
- **Returns:** `{ count: number, data: ClassSession[] }`.

#### `classes.complete` / `classes.recordAttendance`
- **Description:** Marks session completed and applies attendance deduction rule.
- **Payload:** `{ session_id: string, attendance_status: 'PRESENT' | 'ABSENT' | 'NOT_MARKED', deduct_class?: boolean }`.
- **Returns:** Updated session record (`session_status: 'COMPLETED', deduct_class: boolean`).

#### `classes.cancel`
- **Description:** Cancels session. If $< 4$h notice without waiver, deducts credit. If advance/waived, preserves credit and auto-schedules replacement session.
- **Payload:** `{ session_id: string, cancellation_reason?: string, credit_waiver?: boolean, deduct_class?: boolean }`.
- **Returns:** `{ session_status: 'CANCELLED', deduct_class: boolean, replacement_session?: ClassSession }`.

#### `classes.restoreCredit`
- **Description:** Reverses class deduction on an incorrectly deducted session (`deduct_class = false`).
- **Payload:** `{ session_id: string }`.
- **Returns:** Updated session record.

#### `classes.update` / `classes.batchUpdate`
- **Description:** Updates session fields by composite ID or `_rowIndex`.
- **Payload:** `{ session_id: string, updates: Record<string, unknown> }`.
- **Returns:** Updated session record.

---

### 4.6 Recurring Schedules Domain

#### `schedules.list`
- **Description:** Retrieves weekly recurring schedule slots for a student (parsed from `Packages.class_schedule`).
- **Payload:** `{ student_id: string }`.
- **Returns:** Array of `WeeklyScheduleEntry` (`day_of_week, start_time, end_time`).

#### `schedules.save`
- **Description:** Saves recurring schedule entries directly into `Packages.class_schedule`.
- **Payload:** `{ student_id: string, schedules: WeeklyScheduleEntry[] }`.
- **Returns:** Updated entries.

---

### 4.7 Meeting Links Domain

#### `meetingLinks.list`
- **Description:** Lists student meeting links from `MeetingLinks` sheet.
- **Payload:** `{ student_id?: string }`.
- **Returns:** Array of `MeetingLink` objects (`student_id, student_name, meeting_link_1, meeting_link_2`).

#### `meetingLinks.create` / `meetingLinks.update`
- **Description:** Upserts primary and secondary meeting links for a student.
- **Payload:** `{ student_id: string, student_name?: string, meeting_link_1: string, meeting_link_2?: string }`.
- **Returns:** Updated `MeetingLink` record.

#### `meetingLinks.deactivate`
- **Description:** Clears links for a student slot.
- **Payload:** `{ student_id: string, slot?: 1 | 2 }`.
- **Returns:** Updated `MeetingLink` record.

---

### 4.8 Student Notes Domain

#### `notes.list`
- **Description:** Lists student notes from `StudentNotes` sheet.
- **Payload:** `{ student_id?: string }`.
- **Returns:** Array of `StudentNote` records (`student_id, student_name, note_date, note_text, follow_up_date`).

#### `notes.create`
- **Description:** Appends a new pedagogical note to `StudentNotes`.
- **Payload:** `{ student_id: string, student_name?: string, note_date?: string, note_text: string, follow_up_date?: string }`.
- **Returns:** Created note record.

---

### 4.9 Reports & Dashboard Domain

#### `dashboard.overview`
- **Description:** Returns high-level metrics for dashboard cards.
- **Payload:** `{}`.
- **Returns:** `{ activeStudentsCount: number, classesUpcoming7Days: number, outstandingFeesTotal: number, currency: "INR" }`.

#### `reports.financialSummary`
- **Description:** Aggregates invoices, receipts, and outstanding debt across domestic INR and foreign transactions.
- **Payload:** `{ startDate?: string, endDate?: string }`.
- **Returns:** `{ totalInvoiced: number, totalCollected: number, totalOutstanding: number, currency: "INR" }`.

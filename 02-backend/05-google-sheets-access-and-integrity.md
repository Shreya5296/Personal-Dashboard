# 02 Backend — 05 Google Sheets Access and Integrity

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** Backend-05
- **Status:** Authoritative Data Access Specification
- **Version:** 4.0.0 (Strict Six-Table Architecture)

---

## 2. Core Sheets Data-Access Layer

The backend interfaces with Google Sheets exclusively through dedicated access components in `02-backend/apps-script/sheets/`:

```text
Backend Service
      │
      ▼
RowReader / RowWriter
      │
      ├───────────────────────┬────────────────────────┐
      ▼                       ▼                        ▼
HeaderMapper.gs       LockManager.gs           DateFormatService.gs
(Dynamic mapping,     (ScriptLock for          (Standardizes
 date ISO conversion,  concurrency safety)      number format
 + phone escaping)                              to dd/MM/yyyy)
      │
      ▼
Google Spreadsheet (Physical Sheet)
```

---

## 3. Dynamic Header Mapping (`HeaderMapper.gs`)

### 3.1 Principles
1. **Never Rely on Hardcoded Column Letters:**
   The backend never assumes column letters (e.g. `sheet.getRange("A2")`). Instead, `createHeaderMap(headerRow)` inspects Row 1, trims header strings, and maps column names to 0-based row indexes:
   ```javascript
   var map = { "student_id": 0, "student_name": 1, ... };
   ```
2. **Duplicate Header Detection:**
   If a sheet contains duplicate headers, `createHeaderMap` throws an explicit error rather than silently reading corrupt data.

### 3.2 Date Normalization on Read (`rowToRecord`)
- Google Sheets stores dates as internal Date objects or formatted strings (`dd/mm/yyyy` or `d/m/yyyy`).
- When reading columns ending in `_date` (or `class_date`, `expiry_date`):
  - If a Date object is returned, `rowToRecord` converts it to ISO `YYYY-MM-DD` using local calendar values (`getFullYear()`, `getMonth() + 1`, `getDate()`).
  - If a string in `dd/mm/yyyy` format is returned, it is converted to `YYYY-MM-DD`.
- When reading `schedule_time` or `start_time`:
  - If a Date object is returned (Google Sheets often parses times on epoch date 1899-12-30), `rowToRecord` extracts the 24-hour time string `HH:mm`.

### 3.3 Formula Injection & Phone Escaping on Write (`recordToRow`)
- If a string value begins with `+` or `=` (e.g. international phone number `+91 98765 43210`):
  - Prepends a single quote (`'`) to ensure Google Sheets treats it as plain text and avoids formula parsing errors.
- On subsequent read, `rowToRecord` strips the leading `'` so the client receives the clean phone number.

---

## 4. Date Standardization (`DateFormatService.gs`)

- Applies standard spreadsheet number format `dd/MM/yyyy` to all date columns across tables:
  - `Packages`: `start_date`, `end_date`, `next_due_date`
  - `Payments`: `payment_date`
  - `ClassSessions`: `schedule_date`
  - `StudentNotes`: `note_date`, `follow_up_date`
- Converts raw strings into real Date objects set to noon (12:00:00) to prevent date shifts across timezones.

---

## 5. Concurrency Protection (`LockManager.gs`)

To prevent race conditions during simultaneous class scheduling or attendance updates:
- Sensitive mutations acquire a lock via `LockService.getScriptLock()` with a timeout of 10,000–15,000 milliseconds.
- Execution runs inside the lock and releases in a `finally` block:
  ```javascript
  function withLock(timeoutMs, actionFn) {
    var lock = LockService.getScriptLock();
    var acquired = lock.tryLock(timeoutMs || 10000);
    if (!acquired) return { success: false, code: 'LOCK_TIMEOUT', message: 'Could not acquire lock' };
    try {
      return { success: true, result: actionFn() };
    } finally {
      lock.releaseLock();
    }
  }
  ```

---

## 6. Row Index Safety & Direct Sheet Maintenance Rules

### 6.1 Row Index (`_rowIndex`) Mechanics in `ClassRepository.gs`
- To optimize performance and avoid full-table scans, `Classes_update` utilizes 1-based row indices (`_rowIndex`) supplied by the client/service.
- **Safety Verification:** The repository reads the row at `_rowIndex` and validates `updates.student_id === rec.student_id`. If they do not match, it falls back to scanning the entire sheet for the matching composite key (`student_id__schedule_date__schedule_time`).

### 6.2 The Same-Student Row Shift Risk
> [!WARNING]
> **CRITICAL DATA-INTEGRITY LIMITATION:**
> The `student_id` validation guard protects against cross-student data contamination, but **cannot detect row shifts between sessions belonging to the same student**.
> If rows are manually inserted, deleted, or sorted directly inside the `ClassSessions` sheet while client sessions or asynchronous workers hold cached `_rowIndex` references, an attendance, cancellation, or rescheduling update can be applied to the wrong session of that student.

### 6.3 Mandatory Operational Rule
**Never manually sort, insert, delete, or rearrange `ClassSessions` rows while operations relying on cached row indices may be in progress.**
Any direct spreadsheet edits must be strictly limited to scheduled offline maintenance windows with no active client sessions.

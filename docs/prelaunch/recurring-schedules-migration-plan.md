# Recurring Class Schedules Schema and Migration Plan

## 1. Context and Objective

The Personal Dashboard manages live learning for individual students. Students frequently attend recurring weekly classes on one or more days of the week, with identical or varying start/end times.

In compliance with project architecture rules:
- Recurring weekly schedule templates are strictly separated from actual dated class session occurrences.
- The canonical `ClassSessions` sheet (`class_session_id, student_id, scheduled_start, scheduled_end, attendance_status, session_status, cancellation_reason, deduct_class`) represents executed or scheduled dated calendar occurrences.
- Fake dated sessions must never be created simply to store day-of-week recurrence rules.
- Per Critical Rule 7, no automated live Google Sheet schema modifications are executed without documented owner authorization.

## 2. Proposed Schema: `ClassSchedules`

To store recurring weekly class definitions, the proposed `ClassSchedules` sheet schema is:

| Column Name | Data Type | Required | Description |
|---|---|---|---|
| `schedule_id` | Text | Yes | Primary key (`csch_<timestamp><random>`) |
| `student_id` | Text | Yes | Foreign key to immutable permanent `student_id` (`STU_001`, etc.) |
| `day_of_week` | Text | Yes | Uppercase weekday: `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY` |
| `start_time` | Text | Yes | 24-hour start time in `HH:MM` format (e.g., `17:00`) |
| `end_time` | Text | Yes | 24-hour end time in `HH:MM` format (e.g., `18:00`), strictly after `start_time` |
| `is_active` | Boolean | Yes | Active status (`TRUE` / `FALSE`) |
| `created_at` | ISO 8601 | Yes | Creation timestamp |
| `updated_at` | ISO 8601 | Yes | Last update timestamp |

## 3. Backward Compatibility and Current Implementation

1. **Backend Service (`ClassScheduleService.gs`)**:
   - Implements `Schedules_list(spreadsheet, studentId)` and `Schedules_save(spreadsheet, studentId, entries, actor)`.
   - If the `ClassSchedules` sheet is present in the spreadsheet, records are persisted directly to it.
   - If the `ClassSchedules` sheet is not yet created in the live spreadsheet, the service falls back gracefully to in-memory/session persistence and returns `meta: { persistentSheet: false }`, ensuring zero runtime errors.

2. **Frontend Integration**:
   - `scheduleApi.ts` communicates with `schedules.save` and `schedules.list`.
   - `mockDataStore.ts` provides complete local in-memory persistence for offline and testing workflows.

## 4. Owner Action Required for Live Application

To apply this schema to the canonical live Google Sheet (`Private Class Dashboard`):

1. Open the Google Apps Script project editor (`1CC_ZjGrLBD8BnrAm6CP9oDUJmUPqFy4MCc-MkBiBvCNkMA616uF_pCPL`).
2. Select function `runRecurringSchedulesMigration` from `setup/SchemaMigration.gs`.
3. Click **Run**.
4. The function will create the `ClassSchedules` tab with the exact canonical headers if it does not already exist.

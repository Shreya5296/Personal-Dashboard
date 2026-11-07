# 03 Data — 04 Data Validation and Schema Migrations

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** Data-04
- **Status:** Authoritative Migration & Schema History
- **Version:** 4.0.0 (Strict Six-Table Architecture)

---

## 2. Schema History & Executed Migrations

### 2.1 Milestone 1: Student ID Migration (Phase 27)
- **Problem:** Legacy student records contained inconsistent identifiers (`stu_...` mixed with `STU_...`).
- **Migration Script:** `StudentIdMigration.gs`.
- **Execution Result:**
  - Migrated 23 legacy IDs to standardized sequential format `STU_001` through `STU_026`.
  - Cascaded foreign key updates across all dependent tables.
  - Backup preserved in `StudentId_Migration_Backup` tab.
  - Zero legacy IDs remain.

### 2.2 Milestone 2: Canonical Six-Table Schema Migration
- **Problem:** Datastore previously contained redundant intermediate tabs (`ClassSchedules`, `FeeObligations`, `Enrollments`) and non-canonical columns (`package_id` in Packages, `class_session_id` in ClassSessions).
- **Migration Script:** `FinalCanonicalSchemaMigration.gs` (`runFinalCanonicalSchemaMigration`).
- **Execution Result:**
  1. **`Packages` (12 columns):**
     - Target headers: `student_id, student_name, plan_type, currency, package_price, per_class, classes_purchased, start_date, end_date, next_due_date, class_duration, class_schedule`.
     - Embedded recurring schedule string into column 12 (`class_schedule`).
     - Removed `package_id` column.
     - Pre-migration backup created: `_Backup_PreCanonical_Packages`.
  2. **`ClassSessions` (8 columns):**
     - Target headers: `student_id, student_name, schedule_date, schedule_time, attendance_status, session_status, deduct_class, cancellation_reason`.
     - Removed `class_session_id`, `scheduled_start`, `scheduled_end`, `topic` columns.
     - Formatted columns 3 (`schedule_date`) and 4 (`schedule_time`) as plain text `@` to eliminate timezone drift.
  3. **`ClassSchedules` Archived:**
     - Renamed sheet to `_Archived_ClassSchedules`.
     - Pre-migration backup created: `_Backup_PreCanonical_ClassSchedules`.

### 2.3 Milestone 3: Class Session Backdating
- **Problem:** Student `STU_001` (Seerat) sessions required backdating to initial commencement date.
- **Migration Script:** `FinalCanonicalSchemaMigration.gs` (`runBackdateStudentSessions`).
- **Execution Result:**
  - Backdated 48 class sessions starting from `2026-01-19` through `2026-05-09`.
  - Updated `Packages`: `start_date = 2026-01-19`, `end_date = 2026-05-09`, `next_due_date = 2026-04-29`.
  - Embedded schedule string: `Mon - 6:00 PM, Wed - 6:00 PM, Sat - 10:00 AM`.
  - Set student status to `ACTIVE`.

### 2.4 Milestone 4: Date Format Standardization
- **Problem:** Date columns across sheets had inconsistent mixed formats (`YYYY-MM-DD`, `M/D/YYYY`, Date objects).
- **Migration Script:** `DateFormatService.gs` (`standardizeAllDateFormats`).
- **Execution Result:**
  - Standardized date column number formatting to `dd/MM/yyyy` across all sheets.
  - Ensured backend `HeaderMapper.gs` normalizes between spreadsheet `dd/MM/yyyy` and ISO `YYYY-MM-DD`.

---

## 3. Schema Validation Rules (`SchemaValidator.gs`)

During bootstrapping or integrity checks:
1. Verifies that all six canonical tables exist.
2. Checks that Row 1 headers exactly match expected canonical headers.
3. Detects duplicate header names and missing required columns.
4. Alerts if unsupported legacy tabs are present.

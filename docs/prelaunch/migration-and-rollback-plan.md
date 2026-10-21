# Migration & Rollback Runbook for Schema Redesign

**Document Version:** 1.0.0  
**Status:** Pre-Launch Proposal (Requires Owner Authorization Before Execution)  
**Date:** October 21, 2026

---

## 1. Safety Principles & Invariants

1. **Zero Data Loss Invariant:** No financial transaction or historical attendance record may be deleted or overwritten.
2. **Read-Only Inspection Before Action:** All row counts, sheet IDs, and header names must be verified before modifying any structure.
3. **Pre-Migration Snapshot:** A complete Google Spreadsheet clone must be created prior to making any schema or column modifications.
4. **Dual-Read Backend Adapters:** Backend repositories and API handlers must accept both legacy and new column names during the transition, preventing downtime or broken lookups.
5. **No Blind Automation:** Live migrations must be executed in bounded stages with manual verification gates after each step.

---

## 2. Pre-Migration Verification Checklist

Before initiating migration:
- [ ] Confirm master spreadsheet ID: `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`.
- [ ] Verify that no uncommitted changes exist in the Git repository (`git status` clean).
- [ ] Run full regression suite (`npm test`, `npm run typecheck`, `npm run build`, `npm run check:lines`).
- [ ] Take a manual backup of the Google Sheet:
  * Open Google Sheet $\rightarrow$ **File** $\rightarrow$ **Make a copy**.
  * Name: `Personal Dashboard — Master Backup (Pre-Schema Redesign YYYY-MM-DD)`.
- [ ] Record current row counts:
  * `Students`: 54 rows
  * `Packages`: 5 rows
  * `FeeObligations`: 20 rows
  * `Payments`: 10 rows
  * `ClassSessions`: 5 rows
  * `MeetingLinks`: 5 rows
  * `StudentNotes`: 5 rows
  * `Enrollments`: verified intact

---

## 3. Step-by-Step Migration Execution Plan

### Step 1: Hide Operational Tabs in Google Sheets UI
* Open the live Google Spreadsheet.
* Right-click the sheet tab at the bottom for each of the following:
  1. `AuditLog` $\rightarrow$ click **Hide sheet**.
  2. `ImportBatches` $\rightarrow$ click **Hide sheet**.
  3. `ImportRowResults` $\rightarrow$ click **Hide sheet**.
  4. `AppConfig` $\rightarrow$ click **Hide sheet**.
* *Verification:* Confirm sheets are hidden from the bottom tab bar, but visible under **View** $\rightarrow$ **Hidden sheets**.
* *Impact:* Google Apps Script backend will continue reading/writing to these sheets with zero code modifications.

### Step 2: Implement Bidirectional Column Aliases in Backend (Dual-Read)
* Update `RowReader.gs` and domain repositories to support canonical fallback mapping:
  * `Students`: support both `student_name` and `first_name` + `last_name`; `parent_phone` and `primary_phone`.
  * `Packages`: support both `plan_name` and `package_name`; `classes_purchased` and `purchased_classes`.
  * `ClassSessions`: support `class_id` and `class_session_id`; split `class_date` / `start_time` and `scheduled_start`.
  * `FeeObligations`: support `fee_id` and `fee_obligation_id`; `amount` and `amount_due`.
  * `Payments`: support `fee_id` and `fee_obligation_id`.
  * `MeetingLinks`: support `primary_link` and `meeting_url`.

### Step 3: Column Header Transition in Isolated Sheet
* Perform schema modification on an isolated clone of the spreadsheet first.
* Add new columns to the header row without shifting or deleting historical columns.
* Populate converted values for existing rows using migration scripts.
* Validate row-by-row reconciliation.

### Step 4: Verification of Authoritative Computations
* Run verification queries to ensure:
  1. Class credit consumption matches: $\text{Remaining} = \text{Purchased} - \sum(\text{credit\_deducted})$.
  2. Fee balances match: $\text{Outstanding} = \text{Amount} - \sum(\text{Non-Void Payments})$.
  3. All partial payments correctly reflect against parent obligations.

---

## 4. Rollback Procedure

If any anomaly, data mismatch, or API failure occurs during migration:

### Rollback Step 1: Revert Sheet Headers
* Unhide all sheets via **View** $\rightarrow$ **Hidden sheets**.
* If headers were modified on the live sheet, restore Row 1 from the pre-migration backup sheet.

### Rollback Step 2: Switch to Master Backup
* If any row was corrupted or misaligned:
  1. Rename the corrupted sheet to `Corrupted_Archive_[timestamp]`.
  2. Restore the pre-migration backup copy as the primary active spreadsheet.
  3. Update Google Apps Script Script Property `MASTER_SPREADSHEET_ID` to point to the restored copy if ID changed.

### Rollback Step 3: Git Revert
* If backend code was deployed that relies on the new schema:
  `git revert HEAD`
  `clasp push` (deploy to previous stable version `@17`).

### Rollback Verification
* Run `npm test` and `npx playwright test`.
* Confirm all 18 end-to-end tests pass against the restored backend.

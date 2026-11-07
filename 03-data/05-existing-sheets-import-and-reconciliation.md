# 03 Data — 05 Existing Sheets Import and Reconciliation [HISTORICAL]

> [!NOTE]
> **HISTORICAL ARCHIVE:** This document records the pre-launch analysis and mapping of existing multi-sheet legacy records into the initial database schema.
> Bulk import and reconciliation features were permanently retired in Phase 15. The active datastore follows the 6-table canonical schema documented in `03-data/01-master-spreadsheet-schema.md`.

---

## 1. Historical Purpose

This document recorded the initial audit and column reconciliation across multiple legacy student spreadsheets prior to the deployment of the Personal Dashboard.

## 2. Legacy Spreadsheets Audited
- Individual student spreadsheets (`Aarav Sharma`, `Diya Patel`, `Rohan Verma`, `Ananya Roy`, etc.).
- Legacy master trackers.

## 3. Reconciliation Findings
- Student names: Unified fragmented `first_name` and `last_name` into a single `student_name` column.
- Contacts: Separated `parent_email` and `student_email` into distinct physical columns.
- Phones: Prepend with `'` to preserve leading `+` country codes.
- Subjects: Extracted into a dedicated `subject` column in `Students`.
- Classes & Payments: Consolidated into `ClassSessions`, `Packages`, and `Payments`.

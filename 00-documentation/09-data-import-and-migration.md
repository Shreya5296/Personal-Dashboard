# 09 — Data Import and Migration [HISTORICAL / RETIRED]

> [!NOTE]
> **RETIRED SPECIFICATION:** The bulk data import and reconciliation feature described in this document was **permanently retired in Phase 15**.
> All import UI screens, navigation items, routes, and backend import handlers were removed from active code to simplify architecture.
> Student onboarding is now performed directly through the 4-section **Add Student** modal (`AddStudentModal.tsx`), backed by `Students`, `Packages`, and `ClassSessions`.
> This document is preserved solely for historical context and project audit traceability.

---

## 1. Historical Purpose

This document originally specified the bulk import pipeline for ingesting legacy multi-sheet student records into the master spreadsheet during the pre-launch phase.

## 2. Retirement Record (Phase 15)

In Phase 15 of implementation:
1. **Frontend Removal:** The `Imports` navigation link, `ImportPage`, file upload widgets, preview tables, and row-level reconciliation controls were permanently deleted.
2. **Backend Decoupling:** Bulk import batch handlers (`system.executeImportBatch`, `system.previewImport`) were removed from `OperationRouter.gs`.
3. **Spreadsheet Simplification:** The `ImportBatches` and `ImportRowResults` operational tabs were retired from the canonical schema.
4. **Current Ingestion Standard:** New students are added individually or updated via the authenticated **Students** directory and **Edit Student** dialog.

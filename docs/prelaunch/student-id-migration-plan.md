# Student ID Consistency & Legacy ID Migration Plan

## 1. Executive Summary

A comprehensive read-only audit of the canonical Google Spreadsheet (`Private Class Dashboard`, ID: `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`) was completed on 2026-10-24 via authenticated backend inspection.

### Verified Live Sheet State
- **Total Students in Canonical Sheet**: 26 students.
- **Standard Sequential IDs (`STU_001` - `STU_003`)**: 3 students (Seerat, Rehaan, Viwaan).
- **Legacy Random IDs (`stu_...`)**: 23 synthetic test student records created during past automated verification runs.
- **Referential Integrity Audit**:
  - `Packages`: 6 total records; 3 reference standard IDs (`STU_001`, `STU_002`, `STU_003`); 3 reference legacy IDs (`stu_mvmiomr6trzbiw8p`, `stu_mvmius7iukn9f9p9`, `stu_mvmiygz6ubjaj1lo`).
  - `Payments`: 7 total records; all 7 reference standard IDs (`STU_001`, `STU_002`, `STU_003`). 0 reference legacy IDs.
  - `ClassSessions`: 7 total records; all 7 reference standard IDs (`STU_001`, `STU_002`). 0 reference legacy IDs.
  - `MeetingLinks`: 6 total records; 3 reference standard IDs (`STU_001`, `STU_002`, `STU_003`); 3 reference legacy IDs (`stu_mvmitdx8nxfc11aw`, `stu_mvmivws8eavtk1hi`, `stu_mvmixxqgjq0a5qg6`).
  - `StudentNotes`: 7 total records; 4 reference standard IDs (`STU_002`, `STU_003`); 3 reference legacy IDs (`stu_mvmitdx8nxfc11aw`, `stu_mvmivws8eavtk1hi`, `stu_mvmixxqgjq0a5qg6`).
  - `ClassSchedules`: Physical sheet not yet created in canonical spreadsheet. Storage currently inactive on deployed backend `@25`.
  - `AuditLog`: 51 total records; 22 audit entries record operations on legacy student entities.
  - **Dangling / Orphaned Foreign Keys**: **0** across all tables.

---

## 2. Complete 23-Row Legacy-to-Sequential ID Mapping

The 23 legacy random IDs map sequentially from `STU_004` to `STU_026`:

| # | Current Legacy ID | Target Migrated ID | Student Name | Dependent References to Update |
|---|---|---|---|---|
| 1 | `stu_mvmdy31r08u30kg5` | `STU_004` | Concurrency Test Student | None |
| 2 | `stu_mvmhu724np6p8p9t` | `STU_005` | Concurrency Test Student | None |
| 3 | `stu_mvmhvvo49plkt60d` | `STU_006` | Concurrency Test Student | None |
| 4 | `stu_mvmhwy4y33yonhpa` | `STU_007` | Synthetic Student STU_WXAE_UVEO | None |
| 5 | `stu_mvmhz5a5tyc8jsb9` | `STU_008` | Synthetic Student STU_Z4F3_NT1F | None |
| 6 | `stu_mvmi793q380cw45n` | `STU_009` | Synthetic Student STU_7848_NTWH | None |
| 7 | `stu_mvmi9t4g5nf11dwu` | `STU_010` | Synthetic Student STU_9RG0_1LPZ | None |
| 8 | `stu_mvmibnf2572gvm8n` | `STU_011` | Concurrency Test Student | None |
| 9 | `stu_mvmij84swy8t1bgu` | `STU_012` | Synthetic Student STU_J7DO_QUL5 | None |
| 10 | `stu_mvmilgt1yw9ju9n7` | `STU_013` | Synthetic Student FEE_LFUU_ZBOW | None |
| 11 | `stu_mvmimhowpghngof0` | `STU_014` | Synthetic Student NL_MGQI_LF35 | None |
| 12 | `stu_mvmiomr6trzbiw8p` | `STU_015` | Synthetic Student PKG_OLEX_6AIG | `Packages` (`pkg_mvmiosa2xm00wvg2`) |
| 13 | `stu_mvmisd19yiak2mps` | `STU_016` | Synthetic Student FEE_SC50_MFOO | None |
| 14 | `stu_mvmitdx8nxfc11aw` | `STU_017` | Synthetic Student NL_TCSC_56U3 | `MeetingLinks` (`ml_...`), `StudentNotes` |
| 15 | `stu_mvmius7iukn9f9p9` | `STU_018` | Synthetic Student PKG_UR0Z_ODT0 | `Packages` (`pkg_mvmiuwumsjttw5lo`) |
| 16 | `stu_mvmivqc7d4lu3s5j` | `STU_019` | Synthetic Student FEE_VPF0_SVBO | None |
| 17 | `stu_mvmivws8eavtk1hi` | `STU_020` | Synthetic Student NL_VVIE_TWN1 | `MeetingLinks` (`ml_...`), `StudentNotes` |
| 18 | `stu_mvmix0llv63hdlkn` | `STU_021` | Concurrency Test Student | None |
| 19 | `stu_mvmixftz1joovfpl` | `STU_022` | Synthetic Student FEE_XEMB_T05U | None |
| 20 | `stu_mvmixxqgjq0a5qg6` | `STU_023` | Synthetic Student NL_XWT0_82IA | `MeetingLinks` (`ml_...`), `StudentNotes` |
| 21 | `stu_mvmiygz6ubjaj1lo` | `STU_024` | Synthetic Student PKG_YFUU_3GXV | `Packages` (`pkg_mvmiyle2ecyeq5u4`) |
| 22 | `stu_mvmiz93y8ybzk0mv` | `STU_025` | Synthetic Student STU_Z78N_NTL7 | None |
| 23 | `stu_mvmjfcnjwhmzr5z0` | `STU_026` | Synthetic Student STU_FBA1_8A5F | None |

---

## 3. Recurring Schedule Storage Audit Findings

1. **Physical Sheet**: `ClassSchedules` does not currently exist as a tab in `Private Class Dashboard`.
2. **Deployed Backend (@25)**: Calls to `schedules.list` return `UNKNOWN_OPERATION` because `ClassScheduleHandlers.gs` was authored locally but never pushed to the live deployment (obeying Critical Rule 2).
3. **Backend Service (`ClassScheduleService.gs`)**:
   - Detects whether `ClassSchedules` sheet is present in the spreadsheet.
   - If present: reads and writes rows directly in the `ClassSchedules` sheet.
   - If absent: operates in temporary execution memory with `meta: { persistentSheet: false }`.
   - Does not store schedule records in ScriptProperties or CacheService.
4. **Migration Engine Handling**:
   - `StudentIdMigration.gs` includes `ClassSchedules` in `sheetsToCascade`.
   - If `ClassSchedules` exists, student IDs in it are updated in lockstep.
   - If absent, it is gracefully skipped without error.

---

## 4. Audit History Preservation Strategy

1. **Selective Updating of `entity_id`**:
   - `AuditLog.entity_id` is updated **only** when `entity_type` (case-insensitive) equals `'STUDENT'` and `entity_id` matches a mapped legacy ID.
   - Rows where `entity_type` is `'PACKAGE'`, `'PAYMENT'`, `'CLASS'`, or `'SYSTEM'` are preserved unchanged.
2. **Context and Text Preservation**:
   - No blind regex substitution is performed on `before_summary`, `after_summary`, or action descriptions.
   - Exact historical event text remains authentic to the time it was recorded.
3. **Traceability Guarantee**:
   - The permanent `StudentId_Migration_Backup` tab preserves the exact `{ original_id, migrated_id, status, created_at, updated_at }` mapping.
   - A dedicated audit entry is appended upon migration completion documenting the batch migration count and timestamp.
   - Any historical audit record referencing `stu_...` can be resolved immediately to its sequential permanent ID (`STU_...`).

---

## 5. Backup, Concurrency, and Recovery Architecture

1. **Script Locking**:
   - `runStudentIdMigration` and `rollbackStudentIdMigration` acquire `LockService.getScriptLock()` with a 30-second timeout.
   - Concurrent invocations immediately fail with `CONCURRENCY_LOCKED` rather than producing corrupted mappings.
2. **Pre-Write Backup Verification**:
   - `StudentId_Migration_Backup` is created and populated with status `MAPPED` **before** any business data write.
   - If backup writing fails, zero business tables are touched.
3. **Resume on Interruption**:
   - If execution is interrupted after `Students` is updated but before dependent tabs finish, re-running `runStudentIdMigration()` detects the existing backup.
   - It re-uses the exact persisted mapping rather than allocating new numbers or skipping remaining tables.
4. **Idempotence**:
   - If executed on an already-migrated spreadsheet, the function detects that all IDs are standard and returns `alreadyCompleted: true` with 0 mutations.
5. **Reversible Rollback**:
   - `rollbackStudentIdMigration()` inverts the backup mapping, restores original IDs across all business sheets, updates backup status to `ROLLED_BACK`, and logs a rollback event in `AuditLog`.

---

## 6. Strictly Read-Only Preflight Tooling

A dedicated preflight tool is provided in `02-backend/apps-script/setup/StudentIdPreflight.gs`:

```javascript
var preflight = runStudentIdMigrationPreflight(spreadsheet);
// Returns:
// {
//   ready: true,
//   status: 'READY',
//   reasons: [],
//   warnings: ['ClassSchedules sheet not present in spreadsheet (storage inactive)'],
//   stats: { totalStudents: 26, standardStudentCount: 3, legacyStudentCount: 23, ... },
//   proposedMapping: { ... 23 pairs ... },
//   backupStatus: 'NONE'
// }
```

- Strictly non-mutating: does not write, insert, append, or clear any cells.
- Evaluates duplicate student IDs, orphaned foreign keys, schema conformance, and target collisions.
- Reports `READY` or `BLOCKED` with specific reasons.

---

## 7. Owner Action Required for Live Execution

In accordance with safety restrictions, the migration has **not** been executed against the live spreadsheet. To execute:

### Step 1: Preflight Audit (Read-Only)
1. Open Google Spreadsheet: `Private Class Dashboard` (ID: `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`).
2. Go to **Extensions > Apps Script**.
3. Open `setup/StudentIdPreflight.gs`.
4. Select `runStudentIdMigrationPreflight` and click **Run**.
5. Verify in Execution Log: `status: 'READY'`, `reasons: []`, `legacyStudentCount: 23`.

### Step 2: Live Migration Execution
1. Open `setup/StudentIdMigration.gs`.
2. Select `runStudentIdMigration` and click **Run**.
3. Verify in Execution Log:
   - `StudentId_Migration_Backup` created with 23 pairs.
   - 23 student rows updated (`STU_004` - `STU_026`).
   - 3 package rows, 3 meeting link rows, 3 student note rows updated.
   - Result: `{ success: true, migratedCount: 23 }`.

### Step 3: Post-Execution Verification
1. Open `setup/StudentIdVerification.gs`.
2. Select `verifyStudentIdReferentialIntegrity` and click **Run**.
3. Verify in Execution Log: `isValid: true`, `nonStandardStudentIds: []`, `danglingReferences: {}`.

### Step 4 (Emergency Rollback, if ever needed):
1. Select `rollbackStudentIdMigration` from `setup/StudentIdVerification.gs` and click **Run**.
2. All records and foreign keys will be safely reverted to their original `stu_...` IDs.

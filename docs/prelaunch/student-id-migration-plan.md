# Student ID Consistency & Legacy ID Migration Plan

## 1. Executive Summary

An audit of the canonical Google Spreadsheet (`Private Class Dashboard`, ID: `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`) was performed on 2026-10-24 via the authenticated Apps Script backend.

### Findings
- **Total Students in Canonical Sheet**: 25 students.
- **Standard Sequential IDs (`STU_001` - `STU_003`)**: 3 students (Seerat, Rehaan, Viwaan).
- **Legacy Random IDs (`stu_...`)**: 22 synthetic student records created during test runs prior to sequential ID enforcement.
- **Referential Integrity Audit**:
  - `Packages`: 6 total records; 3 reference standard IDs (`STU_001`, `STU_002`, `STU_003`); 3 reference legacy IDs (`stu_mvmiomr6trzbiw8p`, `stu_mvmius7iukn9f9p9`, `stu_mvmiygz6ubjaj1lo`).
  - `Payments`: 7 total records; all 7 reference standard IDs (`STU_001`, `STU_002`, `STU_003`). 0 reference legacy IDs.
  - `ClassSessions`: 7 total records; all 7 reference standard IDs (`STU_001`, `STU_002`). 0 reference legacy IDs.
  - `MeetingLinks`: 6 total records; 3 reference standard IDs (`STU_001`, `STU_002`, `STU_003`); 3 reference legacy IDs (`stu_mvmitdx8nxfc11aw`, `stu_mvmivws8eavtk1hi`, `stu_mvmixxqgjq0a5qg6`).
  - `StudentNotes`: 7 total records; 4 reference standard IDs (`STU_002`, `STU_003`); 3 reference legacy IDs (`stu_mvmitdx8nxfc11aw`, `stu_mvmivws8eavtk1hi`, `stu_mvmixxqgjq0a5qg6`).
  - `AuditLog`: 47 total records; 22 audit entries record operations on legacy student entities.

---

## 2. Complete Legacy-to-Sequential ID Mapping

The 22 legacy random IDs will be migrated sequentially starting from `STU_004` to `STU_025`:

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

---

## 3. Migration Safety & Guarantees

1. **Pre-Migration Audit Backup**:
   - The migration automatically creates a new tab `StudentId_Migration_Backup` with columns `original_id, migrated_id, migrated_at`.
   - Every mapped row is appended before modifying any business tab.
2. **Cascading Referential Integrity**:
   - Foreign-key references in `Packages`, `Payments`, `ClassSessions`, `MeetingLinks`, `StudentNotes`, `ClassSchedules`, and `AuditLog` are updated in lockstep with `Students`.
   - No orphan records are created.
3. **Idempotence**:
   - Running the migration multiple times has no additional effect (`migratedCount: 0`) because all IDs match `STU_\d+`.
4. **Immutability of Standard IDs**:
   - Existing standard IDs (`STU_001`, `STU_002`, `STU_003`) are detected and left unchanged.
5. **No Data Deletion**:
   - No student records, transactions, or historical data are deleted.

---

## 4. Owner Action Required for Live Execution

In accordance with project safety rules, the automated assistant did not modify live spreadsheet rows. To execute the migration on the live Google Spreadsheet:

1. Open the Google Spreadsheet: `Private Class Dashboard` (ID: `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`).
2. Go to **Extensions > Apps Script**.
3. Locate `setup/StudentIdMigration.gs`.
4. Select the function `runStudentIdMigration` from the function dropdown.
5. Click **Run**.
6. The migration will:
   - Create the `StudentId_Migration_Backup` tab.
   - Update rows 4 through 25 to `STU_004` ... `STU_025`.
   - Update dependent records in `Packages`, `MeetingLinks`, and `StudentNotes`.
   - Return `{ success: true, migratedCount: 22 }`.

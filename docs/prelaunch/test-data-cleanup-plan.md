# Pre-Launch Test Data Cleanup Plan & Manifest

**Document Version:** 3.0.0  
**Status:** EXECUTED AND VERIFIED (135 Data Rows Cleared; All Headers & Protected Tabs Preserved)  
**Date:** October 21, 2026  
**Execution Timestamp:** `2026-10-21T08:22:11.713Z`  
**Owner Authorization:** CONFIRMED by Owner  
**Verified Pre-Launch Backup ID:** `1kAvJZVSnWyVsg2QnfKl5tIIE_X28EySwAVeYnKQT8C4`  
**Verified Pre-Launch Backup URL:** `https://docs.google.com/spreadsheets/d/1kAvJZVSnWyVsg2QnfKl5tIIE_X28EySwAVeYnKQT8C4/edit`  
**Live Master Spreadsheet ID:** `1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`  
**Live Backend Deployment:** Apps Script Web App `@21` (`AKfycbx4d_VG4CsZIEAomX_OjNMuej06ktTYmKLME5ennLsI7mx3Fn5b-YBu9CRqe7NwrUVH3w`)

---

## 1. Safety Guardrails & Invariants (Enforced & Verified)

1. **Explicit Owner Authorization:** Cleanup was executed strictly after owner authorization was confirmed.
2. **Pre-Flight Validation Gate:** Prior to execution, backend asserted exact match on spreadsheet ID (`1cVQknq...`), 100% match on all 12 tab names, expected header columns, and expected row counts under script lock.
3. **Strict Tab Scope (6 Target Tabs Only):** Truncation was applied strictly to the 6 working tabs: `Students`, `Packages`, `ClassSessions`, `FeeObligations`, `Payments`, and `MeetingLinks`.
4. **Protected Tabs Retained:** `Enrollments`, `StudentNotes`, `AuditLog`, `ImportBatches`, `ImportRowResults`, and `AppConfig` were completely excluded from clearing.
5. **Row 1 Canonical Header Preservation:** Data rows were cleared via `clearContent()`. Row 1 headers, column widths, formatting, and tab configurations were preserved intact.
6. **Immutable Audit Logging:** Cleanup execution was permanently recorded as `aud_cleanup_1792570931713` in `AuditLog` without modifying or deleting any historical audit records.

---

## 2. Actual Before/After Verification Table (All 12 Tabs)

| Tab Name | Role | Before Rows | After Rows | Rows Cleared | Data Rows Remaining | Headers Preserved | Status |
|---|---|---|---|---|---|---|---|
| `Students` | Working Tab | 73 | **1** | **72** (Rows 2–73) | 0 | 19/19 (100%) | **CLEARED — READY FOR REAL ROSTER** |
| `Packages` | Working Tab | 9 | **1** | **8** (Rows 2–9) | 0 | 15/15 (100%) | **CLEARED — READY FOR REAL PACKAGES** |
| `ClassSessions` | Working Tab | 9 | **1** | **8** (Rows 2–9) | 0 | 19/19 (100%) | **CLEARED — READY FOR REAL SESSIONS** |
| `FeeObligations` | Working Tab | 27 | **1** | **26** (Rows 2–27) | 0 | 15/15 (100%) | **CLEARED — READY FOR REAL INVOICES** |
| `Payments` | Working Tab | 14 | **1** | **13** (Rows 2–14) | 0 | 15/15 (100%) | **CLEARED — READY FOR REAL RECEIPTS** |
| `MeetingLinks` | Working Tab | 9 | **1** | **8** (Rows 2–9) | 0 | 13/13 (100%) | **CLEARED — READY FOR REAL LINKS** |
| `Enrollments` | **PROTECTED** | 1 | **1** | **0** | 0 | 13/13 (100%) | **PRESERVED INTACT (Legacy Tab)** |
| `StudentNotes` | **PROTECTED** | 9 | **9** | **0** | 8 | 9/9 (100%) | **PRESERVED INTACT (Progress Notes)** |
| `AuditLog` | **PROTECTED** | 196 | **197** | **0** | 196 | 12/12 (100%) | **PRESERVED INTACT (+1 Cleanup Audit Log)** |
| `ImportBatches` | **PROTECTED** | 8 | **8** | **0** | 7 | 14/14 (100%) | **PRESERVED INTACT (Hidden Operational Tab)** |
| `ImportRowResults` | **PROTECTED** | 14 | **14** | **0** | 13 | 9/9 (100%) | **PRESERVED INTACT (Hidden Operational Tab)** |
| `AppConfig` | **PROTECTED** | 5 | **5** | **0** | 4 | 4/4 (100%) | **PRESERVED INTACT (Hidden System Config)** |
| **TOTALS** | — | **374** | **240** | **135** | **228** | — | **135 ROWS CLEARED; ZERO ERRORS** |

---

## 3. Cleared Record Manifest Details

### A. Records Cleared per Tab
1. **`Students` (72 records cleared):**
   `stu_mvgforv2waoo9a2e`, `stu_mvgiggst98ug42dd`, `stu_mvgiigt8eqjjezhc`, `stu_mvgijz3y076vai3t`, `stu_mvgimalp6eetkcaj`, `stu_mvgimmzcg92f9r5i`, `stu_mvginay9qsz239t3`, `stu_mvgio50sflr7d70u`, `stu_mvgj07uio3c55219`, `stu_mvgj44k7qg8q72f9`, `stu_mvgj4smfep3k7t50`, `stu_mvgj6r9m5q69265f`, `stu_mvgj9k2z01b975o6`, `stu_mvgjg54q9b6uag85`, `stu_mvgjuu826m3q8k3j`, `stu_mvgjwvhz29aeg5vi`, `stu_mvglawo4cnaacdn0`, `stu_mvglbkge0fm7hdt9`, `stu_mvgldefask9brino`, `stu_mvglg103o0gvd7d9`, `stu_mvglhsq9i03k36g7`, `stu_mvglkn2s7z89y69g`, `stu_mvhmxpaolomjxz9e`, `stu_mvhn022v62r6i7t9`, `stu_mvhn5m2zsq78y78n`, `stu_mvhn874g1t3ylzrl`, `stu_mvhnbf36hfs32q9f`, `stu_mvhncmllj5qnwzcc`, `stu_mvhnd99tv90hsgt9`, `stu_mvhnrpuwz3bepb5j`, `stu_mvhnvr8lx3702qkd`, `stu_mvhnx9pggjplmcfx`, `stu_mvho0tjbohf6fzoc`, `stu_mvho35bhwzq8ovba`, `stu_mvho3rqj9ul16grc`, `stu_mvho6zk9z7f44u83`, `stu_mvho94ravfr9tjhv`, `stu_mvho9s2bvwl4n1my`, `stu_mvhoau9whhptk4ad`, `stu_mvhqjyaoyyyzfb3g`, `stu_mvhqlhjy2j40384n`, `stu_mvhqm4j2qac9r0qb`, `stu_mvhqtrvce1nfxqqu`, `stu_mvhqv6417jeg6q1e`, `stu_mvhqwn9tbmmx5se5`, `stu_mvhqxazrs57int1j`, `stu_mvhqyuh6aae2v98g`, `stu_mvhqzxaweg1v238m`, `stu_mvhr021q1dndb77w`, `stu_mvhr03i97p5s9c3d`, `stu_mvhr0401qfg2m62f`, `stu_mvhr04m16k6t2o7b`, `stu_mvhr0570b55t194i`, `stu_mvhr05snv2b6w9r9`, `stu_mvhr06dffn0rsmio`, `stu_mvhr077q3b2u21t9`, `stu_mvhr0891s1g2y6sm`, `stu_mvhr09b5qj4f1y0c`, `stu_mvhr0a48hdt134d1`, `stu_mvhr0auvfz7k98ad`, `stu_mvhr0bjs9hff4nlo`, `stu_mvhr0ce45u4e9wio`, `stu_mvhr0cz09g97y1sm`, `stu_mvhr0di6g4g73g6h`, `stu_mvhr0e042o04e67h`, `stu_mvhr0ejuuhhh45e8`, `stu_mvhreob7y0yowy2a`, `stu_mvhrf0my3lclouj3`, `stu_mvhrg0d6zs99gn1v`, `stu_mvhrg5ybze4xbt16`, `stu_mvhrgryjyvbnywak`, `stu_mvhrhhendof4de9w`.
2. **`Packages` (8 records cleared):**
   `pkg_mvglb29avcll73vh`, `pkg_mvglbos5ubkd6yq7`, `pkg_mvgldjfr6r0m0ua0`, `pkg_mvho3wuxfwlx9zn8`, `pkg_mvho9x8bqvdbaenw`, `pkg_mvhqm9453ci7eiug`, `pkg_mvhqxfj83iwfy9dg`, `pkg_mvhrgx07smpg0t6k`.
3. **`ClassSessions` (8 records cleared):**
   `cls_mvglc3ftg6hi9wtf`, `cls_mvglcng3qbdal3ev`, `cls_mvhn81f1fly9cosr`, `cls_mvho0mt44qqlyosk`, `cls_mvho6tku1s5oygsm`, `cls_mvhqjr6wi42ni4rf`, `cls_mvhquy96o4u64ode`, `cls_mvhreh8eykh6vrq6`.
4. **`FeeObligations` (26 records cleared):**
   `fee_mvgj34fhv5i38r99`, `fee_mvgj4yeje30f5e6t`, `fee_mvgj7gs5nuix31g6`, `fee_mvgjgrn88fvljtye`, `fee_mvgjx5be0ikzqei5`, `fee_mvgl93k0a1a0q6o4`, `fee_mvglavd90u41a9ev`, `fee_mvglb2m6a2b2737v`, `fee_mvglbp1s3c336yp8`, `fee_mvgle0s74d440t8b`, `fee_mvhn6bhn5e55nuz1`, `fee_mvhnbaal6f66p0cc`, `fee_mvhndk8o7g77sgt9`, `fee_mvhnrw0x8h88pb5j`, `fee_mvhnx9p29i99mcfx`, `fee_mvho3vqu0j006grc`, `fee_mvho5k2s1k114dtb`, `fee_mvho7e8g2l22fve5`, `fee_mvho9x5v3m33n1my`, `fee_mvhoay3i4n44k4ad`, `fee_mvhqkff75o55kzvj`, `fee_mvhqm8sq6p66r0qb`, `fee_mvhqvqlb7q77bquh`, `fee_mvhqxeyx8r88nt1j`, `fee_mvhrf3iju341p4b7`, `fee_mvhrfgn5qt5xjhcq`.
5. **`Payments` (13 records cleared):**
   `pay_mvgjxb1rnboeryj8`, `pay_mvgld75yinobwan6`, `pay_mvhmzmmwj9elf7or`, `pay_mvhnb7tlc5b0p0cc`, `pay_mvhne0tqgo4429ba`, `pay_mvhngizvwaym3ua3`, `pay_mvhnipwgo39mt2nk`, `pay_mvho1hutfpz39z3p`, `pay_mvho5sxym4ge4dtb`, `pay_mvho7nlisl4fhve5`, `pay_mvhqkggp31mwkzvj`, `pay_mvhqvrnu237bgquh`, `pay_mvhrf80qwwelr9as`.
6. **`MeetingLinks` (8 records cleared):**
   `ml_mvhn07ljyq9ovlh9`, `ml_mvhnrv4hpnmiu25w`, `ml_mvhnvwonig2c03ha`, `ml_mvho3aen6xk2pkjr`, `ml_mvho9a7zf37uv3ro`, `ml_mvhqljv84ixa2tgc`, `ml_mvhqwssljwhn3sqo`, `ml_mvhrgaju49hhq79x`.

### B. Live Application API Verification
Direct read operations against the active Apps Script API returned:
- `students.list`: `[]` (0 records)
- `packages.list`: `[]` (0 records)
- `fees.list`: `[]` (0 records)
- `payments.list`: `[]` (0 records)
- `classes.list`: `[]` (0 records)
- `meetingLinks.list`: `[]` (0 records)
- `notes.list`: 8 historical progress notes preserved

---

## 4. Protected Tabs Integrity

All six protected tabs were verified immediately post-execution:
- **`Enrollments`**: Exactly 1 header row, 13 columns, zero data rows. Legacy schema compatibility maintained.
- **`StudentNotes`**: Exactly 9 rows (1 header + 8 notes), 9 columns. Historical tutor progress notes preserved.
- **`AuditLog`**: 197 rows (196 pre-existing + 1 new cleanup audit log). Contains full chronological audit trail from initial setup through test runs and final cleanup. Hidden in spreadsheet UI.
- **`ImportBatches`**: Exactly 8 rows (1 header + 7 batch rows), 14 columns. Hidden in spreadsheet UI.
- **`ImportRowResults`**: Exactly 14 rows (1 header + 13 result rows), 9 columns. Hidden in spreadsheet UI.
- **`AppConfig`**: Exactly 5 rows (1 header + 4 configuration settings), 4 columns. System settings intact. Hidden in spreadsheet UI.

---

## 5. Safe In-Place Recovery Runbook

If restoration to pre-cleanup state is ever required:
1. Open backup spreadsheet: [`Master Backup`](https://docs.google.com/spreadsheets/d/1kAvJZVSnWyVsg2QnfKl5tIIE_X28EySwAVeYnKQT8C4/edit) (ID: `1kAvJZVSnWyVsg2QnfKl5tIIE_X28EySwAVeYnKQT8C4`).
2. Read data ranges (Rows 2–$N$) from the backup tabs.
3. Write back into the canonical spreadsheet (`1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8`) via `setValues()`.
4. Reconstruct post-backup entities if needed directly from the preserved `AuditLog` entries.
5. Canonical spreadsheet ID and Script Properties remain completely unchanged.

# 09 — Data Import and Migration

> [!IMPORTANT]
> **ARCHIVED / RETIRED FEATURE:** The bulk Import & Reconcile UI and endpoints have been completely removed per owner decision. The system uses direct student onboarding and management instead of bulk CSV/sheet imports. This document is retained solely as an archival record of historical migration design.

## 1. Purpose

Define a safe, repeatable process for consolidating the existing student-specific Google Sheets into the canonical Student Management Dashboard master spreadsheet.

The migration must preserve useful historical information, avoid duplicate students and financial transactions, report uncertain mappings for review, and leave source spreadsheets unchanged.

This document defines migration behavior. The canonical destination schemas are defined in `04-google-sheets-data-model.md`; business rules are defined in `05-business-rules-and-workflows.md`; API behavior is defined in `06-apps-script-api-specification.md`.

## 2. Goals

- Import existing student, fee, package, class, and meeting-link information.
- Normalize equivalent source columns into the canonical schema.
- Support minor differences between existing spreadsheets without silently guessing.
- Preserve historical records, including inactive students.
- Detect duplicates before writing records.
- Provide preview, validation, reconciliation, and an auditable result.
- Make a failed or interrupted import safe to inspect and resume.
- Avoid destructive edits to source spreadsheets.

## 3. Non-Goals

Version 1 does not need a fully automated universal spreadsheet-mapping engine, continuous two-way synchronization, or automatic deletion of source data. Import is an administrator-initiated, controlled migration workflow.

## 4. Migration Principles

1. The master spreadsheet becomes the canonical source of truth after a record is imported and reconciled.
2. Source spreadsheets are read-only inputs. The importer must not edit, move, rename, or delete source data.
3. No record is imported without a validated mapping to a destination entity.
4. Ambiguous matches are flagged for human review rather than merged automatically.
5. Re-running the same import must not create duplicate records.
6. Existing destination records must not be overwritten silently.
7. Imported records must use backend-generated canonical IDs.
8. Source row numbers may be stored as migration references but are not permanent record IDs.
9. All import writes must be attributable to an import batch.
10. Import results must distinguish imported, skipped, duplicate-review, and failed rows.

## 5. Supported Source Inputs

The first release supports Google Sheets that the administrator is authorized to read.

Supported input patterns:
- One student per row, with fee and schedule fields in the same row.
- Separate tabs for students, payments, classes, or meeting links.
- Multiple student-specific spreadsheets with broadly similar columns.
- Minor differences in header names, column order, optional fields, and date formatting.

Unsupported or ambiguous layouts must be exported or mapped into a supported structure before import, or handled through an explicitly reviewed mapping. The importer must not assume every spreadsheet has the same layout.

## 6. Import Workflow

### Step 1: Select Source

The administrator selects a source spreadsheet and one or more tabs to import. The application records the source spreadsheet ID and tab name in the import batch.

The backend must verify that the source can be accessed by its configured execution identity. Access failure must stop that source import with a clear error.

### Step 2: Inspect Headers

Read the header row and a bounded sample of rows. Identify columns using normalized header matching and an administrator-confirmed mapping.

Header normalization may ignore capitalization, leading/trailing whitespace, repeated internal spaces, and common punctuation differences. It must not infer equivalence from vague similarity alone.

Examples of possible aliases:
- `Student Name`, `Name`, `Child Name` → student name mapping
- `Parent Phone`, `Contact Number`, `Mobile` → contact mapping, subject to confirmation
- `Fee Due`, `Amount Due`, `Pending Fee` → these terms are not necessarily equivalent and must not be mapped automatically without understanding the source meaning
- `Zoom Link`, `Meet Link`, `Meeting URL` → meeting URL candidate, with provider confirmed separately when unclear

Alias rules must be maintained in one documented mapping module rather than scattered across import handlers.

### Step 3: Configure Mapping

The administrator maps each relevant source column to a canonical field or explicitly marks it as ignored.

The mapping screen must show:
- Source tab and column header
- Sample source values
- Proposed destination field
- Whether the mapping is required, optional, or ignored
- Any transformation applied
- Validation warnings

Required destination fields that cannot be populated must be corrected, supplied through an explicit default where permitted, or left out of the import. The system must not invent contact details, amounts, dates, or statuses.

### Step 4: Normalize and Validate

The importer converts source values into canonical types without writing to the destination.

Validation includes:
- Required fields present
- Valid dates and timestamps
- Valid monetary values and precision
- Supported status values
- Valid class quantities
- Valid URL schemes
- Relationship consistency
- Duplicate candidates
- Unsupported or ambiguous values

Every row receives a validation result. The preview must show errors separately from warnings.

### Step 5: Resolve Duplicates

The importer compares candidate records against existing destination records and other rows in the same batch.

Potential duplicate signals include:
- Existing source reference for the same source spreadsheet, tab, and row
- Matching normalized student name plus matching parent/guardian phone
- Matching parent/guardian email where present
- Matching transaction reference for payments
- Matching class/session details where a stable source identifier is unavailable

No single fuzzy match may automatically merge two student records. Name-only matches are insufficient for automatic merging.

Possible review outcomes:
- Import as a new record
- Link to an existing student
- Skip as an already imported record
- Mark for manual review
- Exclude the row

A human-confirmed student match must be recorded in the import result. Related payments, packages, classes, and meeting links must then reference the canonical student ID.

### Step 6: Preview

Before import, show a summary containing:
- Source spreadsheet and tab
- Rows examined
- Rows ready to import
- Rows likely to be duplicates
- Rows requiring review
- Rows with errors
- Destination entities to be created
- Warnings about omitted or transformed fields

The administrator must explicitly confirm the import after reviewing the preview.

### Step 7: Execute Import

The backend imports only rows approved by validation and duplicate resolution.

For each accepted source row:
1. Create or resolve the canonical parent entity, such as a student.
2. Generate a canonical ID for each new destination record.
3. Resolve foreign-key relationships using canonical IDs.
4. Write records using the destination schema.
5. Record the source reference and import outcome.
6. Record an audit event for material changes.

Entity order must respect dependencies. For example, students must be resolved before enrollments, packages, fee obligations, payments, class sessions, meeting links, and notes that reference them.

The importer must not write directly to undocumented column positions. It must use the schema-aware persistence layer.

### Step 8: Reconcile

After import, compare the source batch counts and normalized values with the destination results.

The reconciliation report must include:
- Total source rows inspected
- Imported rows
- Skipped rows
- Duplicate-review rows
- Failed rows
- Counts by destination entity
- Unresolved foreign-key relationships
- Financial totals where source values have a clear comparable meaning
- Any differences requiring manual review

A batch must not be marked `COMPLETED` while required reconciliation checks remain unresolved. If some rows succeeded and others failed, use `COMPLETED_WITH_ERRORS` and retain row-level results.

## 7. Canonical Import Mapping

The primary destination tabs are defined in `04-google-sheets-data-model.md`.

| Source information | Destination | Notes |
|---|---|---|
| Student identity and contact details | `Students` | Create one canonical student record per resolved person. |
| Enrollment or teaching period | `Enrollments` | Create only when the source supports a meaningful enrollment period or it is explicitly assigned during review. |
| Purchased class bundle | `Packages` | Preserve purchased quantity and price where known. Do not infer remaining classes as purchased classes. |
| Fee charged or installment due | `FeeObligations` | Import as an obligation only when the source value represents an amount charged or owed. |
| Individual payment | `Payments` | Each payment must be a separate transaction where source data supports it. |
| Scheduled or completed lesson | `ClassSessions` | Preserve status and date meaning; do not treat every schedule row as completed. |
| Zoom or Google Meet URL | `MeetingLinks` | Store each distinct link separately and identify provider. |
| Internal note or follow-up | `StudentNotes` | Keep dated notes as notes, not as substitutes for structured records. |
| Batch metadata | `ImportBatches` | One record per import attempt. |
| Row-level outcome | `ImportRowResults` | One outcome per inspected row or explicitly defined source record. |

## 8. Financial Migration Rules

Financial data requires special care because source spreadsheets may combine agreed fees, amounts paid, and outstanding balances in one row.

The importer must distinguish these meanings:
- Total agreed fee
- Fee obligation or installment
- Individual payment transaction
- Outstanding balance reported by the source
- Advance or unallocated credit

A source column called `Fee` is ambiguous until its meaning is confirmed.

Rules:
1. Do not import a source outstanding balance as a payment.
2. Do not import a total paid value as a single payment if individual transaction history exists and should be preserved.
3. If only a historical aggregate is available, use an explicitly reviewed opening-balance migration procedure defined by the business rules; do not fabricate transaction dates or payment methods.
4. Do not create both an aggregate payment and the underlying individual payments for the same money.
5. Reconcile imported obligation and payment totals before activating the migrated records for routine use.
6. Preserve source values and notes needed to explain historical discrepancies.
7. Do not silently change currency or round amounts without a documented conversion rule.
8. Any opening balance or migration adjustment must be distinguishable from an ordinary payment.

If the current schema or business rules do not support a source financial situation faithfully, stop and flag it for a deliberate schema or workflow decision. Do not force-fit it into an unrelated field.

## 9. Class and Package Migration Rules

The importer must distinguish:
- Classes purchased
- Classes scheduled
- Classes completed
- Classes cancelled
- No-shows
- Remaining balance reported by a source

A source field such as `Classes Left` is not sufficient to reconstruct individual class history.

When detailed session history exists, import the supported sessions and derive the balance using the canonical rules.

When only a remaining balance or aggregate class count exists:
- Preserve the source-reported value for reconciliation.
- Do not invent completed-session records.
- Use an explicit reviewed opening-balance or migration adjustment if supported by the finalized data model.
- Otherwise mark the package for manual reconciliation before it is treated as authoritative.

A scheduled class must not be imported as completed solely because it has a date or meeting link.

## 10. Meeting-Link Migration Rules

- Import each distinct link as a separate `MeetingLinks` record.
- Preserve the original URL string after safe normalization of surrounding whitespace.
- Do not rewrite URL paths or meeting identifiers.
- Infer provider only from reliable evidence, such as the URL host, and allow administrator correction.
- Treat unrecognized hosts as `OTHER` or require review.
- Do not make an old link preferred automatically when several active links exist and the correct default is unclear.
- Do not open imported meeting links automatically during migration.
- Invalid or unsupported URLs must be flagged rather than silently discarded.

## 11. Student Lifecycle Migration

Active and inactive students may both be imported.

The importer must not equate a missing recent class with inactivity unless the administrator confirms that rule for the source.

When a source contains an explicit inactive, archived, or former-student status, map it to the canonical lifecycle status only after validating the meaning.

If the source has no status field, the administrator must select a documented default for that source batch. The default must be visible in the preview and recorded in the batch metadata or notes.

## 12. Idempotency and Resume Behavior

Every import batch has a unique `import_batch_id`.

Each source record should have a stable source reference derived from the source spreadsheet ID, tab name, and a source record key. A row number may be used as a migration reference for a one-time import, but it is not sufficient as a long-term identity if source rows can be reordered.

Where no stable source key exists, compute a documented fingerprint from normalized source values and use it only as a duplicate-detection aid.

Rules:
- Re-running an already completed source import must not create duplicate records.
- Retrying a failed batch must reuse recorded row outcomes where safe.
- A retry must not blindly repeat successful financial writes.
- Duplicate checks must run again immediately before critical writes.
- An ambiguous fingerprint match must be reviewed rather than treated as proof of identity.
- The system must distinguish retrying a batch from intentionally importing changed source data as a new revision.

## 13. Failure and Partial-Write Handling

Google Sheets does not provide a general transaction spanning multiple tabs. The importer must therefore make partial progress visible and recoverable.

The implementation must:
- Validate the complete candidate row before writing it.
- Write dependent records in a defined order.
- Record each row outcome.
- Use locks for critical duplicate-check-and-write operations where needed.
- Avoid marking a row imported until its required writes have succeeded.
- Detect and report incomplete related-record creation.
- Provide a reconciliation path for incomplete rows.
- Never claim a full rollback if writes cannot be reliably undone.

If a batch fails, successful records remain recorded and are included in reconciliation. A retry should continue safely without duplicating them.

Any compensating action must be explicit and auditable. The importer must not delete valid existing destination records automatically as a generic rollback strategy.

## 14. Import Batch Status

Supported statuses, as defined by the data model:
- `PENDING`
- `RUNNING`
- `COMPLETED`
- `COMPLETED_WITH_ERRORS`
- `FAILED`

Status behavior:
- `PENDING`: batch created but execution has not started.
- `RUNNING`: inspection, validation, or writes are in progress.
- `COMPLETED`: all approved rows were processed and required reconciliation passed.
- `COMPLETED_WITH_ERRORS`: useful progress was made, but rows failed, were skipped unexpectedly, or require review.
- `FAILED`: the batch could not proceed or complete its essential operation.

The final status and counts must be persisted, not maintained only in frontend state.

## 15. Import Result Records

For every processed source record, persist:
- Import row result ID
- Import batch ID
- Source row reference
- Target entity type, when known
- Target record ID, when created or resolved
- Row status
- Source fingerprint, when used
- Clear outcome or error message
- Processing timestamp

Error messages must be useful to the administrator but must not contain authentication tokens or unnecessary sensitive data.

## 16. Permissions and Privacy

- Import operations require an authenticated, authorized administrator.
- The backend must verify access to each source and destination spreadsheet.
- The frontend must not receive unrelated source data beyond what is needed for preview and review.
- Import previews must not be publicly accessible.
- Import results and reconciliation reports are private application data.
- Source spreadsheet IDs are references, not security credentials.
- The importer must not broaden sharing permissions on source or destination files.

## 17. User Interface Requirements

The import flow must provide:
1. Source selection
2. Tab selection
3. Header and sample inspection
4. Column mapping
5. Validation results
6. Duplicate resolution
7. Import preview
8. Explicit confirmation
9. Progress and partial-result reporting
10. Reconciliation summary

The UI must support leaving the import workflow and returning to a persisted batch status where practical. It must not rely on a browser tab remaining open as the sole record of progress.

## 18. Operational Limits

The implementation must account for Apps Script execution limits and Google Sheets read/write quotas.

It must:
- Process records in bounded batches.
- Avoid cell-by-cell reads and writes.
- Persist progress between batches where needed.
- Make retry behavior deterministic.
- Avoid long-running unbounded imports in one request.
- Show when an import needs to be resumed.

Batch size and timeout handling must be tested against representative data rather than chosen arbitrarily.

## 19. Migration Acceptance Criteria

The migration implementation is accepted when tests demonstrate that:
- Similar but non-identical headers can be mapped explicitly.
- Required missing fields block the affected rows.
- Source spreadsheets remain unchanged.
- Ambiguous student matches are flagged for review.
- A repeated import does not duplicate students, payments, or sessions.
- Payments link to the correct student and fee obligation.
- Classes and packages link to the correct student and enrollment.
- Source-reported balances are not mistaken for transaction history.
- Imported links are stored individually and unsafe URLs are flagged.
- Partial failures are reported at row level.
- A retry does not repeat successful financial writes.
- Reconciliation identifies count and financial discrepancies.
- Archived students and their historical records remain accessible.
- The final batch status and row results persist after the browser closes.

## 20. Implementation Dependencies

Before implementing imports, finalize and cross-check:
- `04-google-sheets-data-model.md`
- `05-business-rules-and-workflows.md`
- `06-apps-script-api-specification.md`
- `10-testing-and-acceptance-criteria.md`

If these documents do not define a required concept, such as opening balances, class-credit adjustments, or stable source references, the implementation agent must flag the gap rather than invent behavior.

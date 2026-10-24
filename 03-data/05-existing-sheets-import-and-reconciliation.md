# 05 — Existing Sheets Import and Reconciliation

> [!IMPORTANT]
> **ARCHIVED / RETIRED FEATURE:** The bulk Import & Reconcile UI and endpoints have been completely removed per owner decision. The system uses direct student onboarding and management instead of bulk CSV/sheet imports. This document is retained solely as an archival record of historical migration design.

## 1. Purpose

Define a safe, repeatable process for migrating the administrator's existing student Google Sheets into the canonical Student Management Dashboard master spreadsheet.

The import process must reduce manual re-entry while preserving historical information, making uncertainty visible, and preventing accidental overwrites or duplicate records.

This document specifies the import workflow and acceptance requirements. The canonical tab schemas and business rules remain authoritative in their respective data-model and business-rules documents.

## 2. Scope

The initial migration supports Google Sheets containing student information, fee details, class/package counts, class timings, meeting links, and historical information about students who are no longer active.

The source files may have mostly similar structures, with occasional differences in column names, optional fields, date formats, or layout. Import must accommodate these differences through explicit mapping and normalization rather than assuming every source is identical.

Included:
- Registering source spreadsheets and tabs.
- Inspecting and mapping source columns.
- Previewing normalized records.
- Validating required fields and relationships.
- Detecting possible duplicate students and records.
- Importing approved records into canonical tabs.
- Recording row-level results and batch summaries.
- Reconciling source totals against imported results.
- Re-running an import safely after correcting errors.

Excluded from Version 1:
- Unattended synchronization of every source spreadsheet.
- Automatic deletion of source data.
- Guessing ambiguous student identities without review.
- Automatic overwriting of existing financial history.
- Treating arbitrary spreadsheet formulas or formatting as business rules.

## 3. Migration Principles

1. Existing source spreadsheets remain unchanged during import.
2. The master spreadsheet is the only canonical application datastore after cutover.
3. Imports begin in preview mode; preview must not mutate canonical records.
4. Every imported record receives a backend-generated canonical ID.
5. Source row numbers are references for reconciliation, not permanent IDs.
6. Uncertain mappings and duplicate candidates require review.
7. Financial and class history must not be silently discarded or invented.
8. Re-running the same import must not create duplicate records.
9. Every batch and every processed row must have a recorded outcome.
10. The system must distinguish imported, skipped, duplicate-review, and failed rows.
11. No source file is deleted or modified by the importer.
12. A migration is not complete until reconciliation has passed or exceptions are explicitly accepted.

## 4. Source Registration

For each source spreadsheet, record:
- Human-readable source name.
- Spreadsheet ID.
- Source tab name.
- Expected purpose or student group.
- Import owner or initiating administrator.
- Date inspected.
- Mapping profile used.
- Whether the source is considered current, historical, or mixed.

The spreadsheet ID is a reference, not a credential. Source access must be granted only to the identities that need it.

The importer must never infer that a spreadsheet is safe to read solely because its ID is known. Source access failures must stop processing for that source and produce a clear error.

## 5. Source Inspection

Before mapping, inspect the source tab for:
- Header row location.
- Duplicate or blank headers.
- Empty rows and columns.
- Merged cells affecting tabular data.
- Formula-derived values.
- Hidden columns or rows that may contain records.
- Inconsistent date and currency formats.
- Multiple students represented in one cell.
- Repeated meeting links.
- Totals or summary rows mixed with individual records.
- Historical notes or statuses embedded in free text.

The importer must not treat totals, headings, notes, or blank separators as student records. Ambiguous layouts must be flagged for manual review instead of guessed.

## 6. Column Mapping

Provide an explicit mapping from each source column to a canonical field. Mapping may use a saved mapping profile after it has been reviewed and approved.

Examples of acceptable equivalent source headers include:
- Student, Student Name, Name → candidate name fields.
- Parent, Guardian Name → parent_guardian_name.
- Phone, Contact, Parent Phone → primary_phone when the meaning is clear.
- Fee, Package Fee, Amount Due → a field requiring semantic confirmation.
- Zoom, Zoom Link, Meeting URL → a candidate meeting-link value.
- Classes, Total Classes, Sessions Purchased → purchased_classes only when the source meaning is confirmed.

Similar header text does not prove equivalent meaning. For example, “Fee Paid”, “Fee Due”, and “Package Price” must never be mapped to the same canonical field automatically.

For each mapping, record:
- Source header.
- Canonical entity and field.
- Transformation, if any.
- Whether the mapping is required.
- Confidence or review status.
- Any assumptions approved by the administrator.

Unknown columns must be listed in the preview. They may be ignored only after review, or preserved in an explicitly approved migration note or extension field strategy. The importer must not silently discard potentially meaningful data.

## 7. Normalization Rules

### 7.1 Text

- Trim leading and trailing whitespace.
- Preserve meaningful punctuation and internal spacing.
- Do not change a person's identity based on capitalization alone.
- Convert empty strings to blank optional values where appropriate.
- Do not convert a missing value into a fabricated value.

### 7.2 Names and Identity

- Split first and last names only when the source provides a reliable structure or the administrator approves the transformation.
- Preserve the original full name in the import review data where needed for reconciliation.
- Do not use student name alone as a definitive duplicate key.
- Do not merge two records automatically because their names look similar.

### 7.3 Phone and Email

- Normalize phone formatting only when the transformation preserves the number.
- Preserve country codes when present.
- Validate email syntax without assuming that syntax proves ownership.
- Treat shared parent phone numbers as possible legitimate matches, not automatic proof of duplicate students.

### 7.4 Dates and Times

- Support explicitly configured source formats.
- Interpret dates using the selected source locale and mapping profile.
- Reject ambiguous dates when day and month order cannot be determined safely.
- Store calendar dates and timestamps according to the canonical schema.
- Interpret class times in the documented Asia/Kolkata timezone unless the source explicitly establishes another timezone.
- Never silently shift a date because the source format is unclear.

### 7.5 Money

- Parse amounts into numeric INR values only when the currency is known or approved.
- Remove display-only currency symbols and separators only when their meaning is unambiguous.
- Reject malformed values, ranges, or text such as “paid sometime” as numeric amounts.
- Do not infer whether a source amount is a package price, total agreed fee, payment received, or outstanding balance from the number alone.
- Preserve source values in the preview and row result context when needed to resolve errors, while limiting exposure of personal data.

### 7.6 Class Counts

- Purchased class quantities must be non-negative or positive according to the canonical package rules.
- Do not assume “classes left” means “classes purchased”.
- If a source only contains a remaining-class count and no reliable session history, import the value only through an explicitly approved opening-balance or migration-adjustment mechanism.
- Do not fabricate completed class records to make a count reconcile.

### 7.7 Meeting Links

- Preserve multiple distinct links for one student.
- Normalize whitespace around URLs.
- Require a valid URL scheme; prefer HTTPS.
- Infer provider from a recognized URL host only when unambiguous.
- Flag shortened, malformed, or unrecognized URLs for review.
- Do not combine Zoom and Google Meet links into one field.

## 8. Duplicate Detection

Duplicate detection must identify candidates rather than make unsafe assumptions.

Use available evidence such as:
- Existing canonical student ID, if a trusted cross-reference exists.
- Exact normalized name plus matching parent contact details.
- Exact phone number combined with other matching fields.
- Existing source-reference mapping from a previous import.
- Matching source fingerprint for a previously processed row.

Duplicate outcomes:
- Confirmed existing student: link imported related records to the existing student ID.
- Confirmed new student: create a new canonical student record.
- Ambiguous match: set DUPLICATE_REVIEW and require administrator decision.
- Confirmed duplicate source row: skip with a documented reason.

Never automatically merge payments, enrollments, packages, or class sessions solely because student names match.

## 9. Preview and Approval

Before commit, show a preview containing:
- Source spreadsheet and tab.
- Mapping profile.
- Number of candidate rows.
- Rows expected to create students.
- Rows matched to existing students.
- Rows with missing required data.
- Possible duplicates.
- Invalid or ambiguous values.
- Unmapped columns.
- Proposed enrollment, package, fee, payment, class, and meeting-link records where applicable.
- Warnings about information that cannot be represented safely.

The administrator must approve the mapping and selected import scope before writes begin.

Preview mode must be read-only with respect to canonical application records. It may create a batch record only if the system clearly labels it as a preview and does not report the batch as imported.

## 10. Import Workflow

1. Register the source spreadsheet and tab.
2. Verify the source is accessible to the backend.
3. Inspect headers and source layout.
4. Select or create a mapping profile.
5. Normalize candidate rows.
6. Validate field formats and required fields.
7. Resolve or flag ambiguous values.
8. Match possible existing students.
9. Produce a preview and summary.
10. Obtain administrator approval.
11. Create or update the import batch state to RUNNING.
12. Process approved rows using the canonical business rules.
13. Generate canonical IDs on the backend.
14. Write records and row-level outcomes.
15. Record errors without exposing unnecessary personal information.
16. Reconcile counts and totals.
17. Mark the batch COMPLETED, COMPLETED_WITH_ERRORS, or FAILED.
18. Present a final report and unresolved exceptions.

If the operation stops unexpectedly, the batch must remain in a state that makes its incomplete status clear. A later run must inspect prior outcomes before retrying.

## 11. Import Ordering and Relationships

Where records depend on other records, import them in dependency order:

1. Students.
2. Enrollments.
3. Packages.
4. Fee obligations.
5. Payments.
6. Meeting links.
7. Class sessions.
8. Student notes.

Audit events and import result records must be written as part of the defined processing flow.

The order may be adjusted only when a documented dependency-safe implementation requires it. Every foreign-key reference must resolve to a canonical record before the related record is committed.

If a parent record fails, dependent records must be skipped or held for review rather than created with invalid references.

## 12. Idempotency and Safe Retries

A retry must not create duplicates for records already committed by the same logical import.

Use a stable source reference and/or source fingerprint where appropriate. A fingerprint must be deterministic for the same normalized source record and mapping version.

The implementation must distinguish:
- Same source row reprocessed after a transient failure.
- Source row changed since the previous import.
- Different source rows representing the same real-world entity.
- A new legitimate transaction that happens to have the same amount as an earlier transaction.

Do not use amount and date alone as a payment duplicate key. Where no reliable transaction reference exists, flag potential duplicate payments for review.

A completed row must not be re-created on retry. A changed source row must not silently overwrite the previously imported canonical record. It must produce a conflict or an explicit update-review decision.

## 13. Handling Updates to Existing Records

The initial migration should prefer create-and-link behavior over bulk overwriting.

When a source row matches an existing canonical student:
- Do not replace stable student_id.
- Do not overwrite historical transactions.
- Do not replace enrollment or package history without review.
- Compare incoming values with canonical values.
- Present conflicting values for administrator resolution.
- Record approved changes through normal backend services and audit logging.

Routine synchronization of source spreadsheets after cutover is not part of Version 1. Once migration is accepted, changes should be made in the dashboard rather than maintained independently in both places.

## 14. Reconciliation

Every batch must provide a reconciliation summary.

### 14.1 Row Counts

Report:
- Source rows inspected.
- Non-empty candidate rows.
- Rows imported.
- Rows skipped intentionally.
- Duplicate-review rows.
- Failed rows.
- Rows awaiting review.

The totals must reconcile to the set of candidate rows. Header rows and explicitly identified summary rows must be excluded and counted separately where useful.

### 14.2 Student Counts

Report:
- New students created.
- Existing students matched.
- Students flagged as possible duplicates.
- Active students imported.
- Inactive students imported.

Counts must distinguish unique students from source rows.

### 14.3 Financial Reconciliation

Where source data supports reliable comparison, report:
- Source fee obligations represented.
- Imported fee obligations.
- Source payment transaction count.
- Imported payment transaction count.
- Source payment totals by currency.
- Imported payment totals by currency.
- Unmapped financial values.
- Unresolved differences.

Do not compare a source “amount due” total against a canonical “amount paid” total. The meaning of each source total must be established before comparison.

A source that stores only a current balance cannot be treated as a complete payment ledger. Record this limitation explicitly rather than fabricating transaction history.

### 14.4 Class Reconciliation

Where reliable source values exist, report:
- Purchased class quantities.
- Completed class records imported.
- Remaining-class balances represented.
- Cancelled or no-show records requiring policy decisions.
- Differences between source-reported and canonical calculated balances.

If source data provides only a current remaining count, document the opening-balance method used. The resulting balance must be explainable and auditable.

### 14.5 Exceptions

Every unresolved difference must identify:
- Affected source and row reference.
- Entity or field affected.
- Expected or source value, where safe and necessary.
- Canonical value, where applicable.
- Reason the comparison failed.
- Required resolution or accepted limitation.

A batch must not be labelled fully reconciled while material unresolved differences remain.

## 15. Failure Handling

Expected failure categories include:
- Source access denied.
- Source spreadsheet or tab not found.
- Missing or duplicate headers.
- Unsupported schema or mapping version.
- Invalid required field.
- Ambiguous date or amount.
- Duplicate review required.
- Missing parent record.
- Spreadsheet quota or temporary service failure.
- Write failure.
- Reconciliation mismatch.
- Interrupted batch.

Errors must be actionable and must not expose tokens, secrets, or unnecessary personal data.

A row-level failure must not be reported as imported. If a multi-record operation partially succeeds, the batch report must identify the records committed and the records not committed. Recovery must rely on recorded outcomes and idempotent retry behavior.

## 16. Source Preservation and Cutover

Before migration:
- Preserve the original source spreadsheets.
- Ensure an authorized backup or export exists.
- Record the selected sources and their intended scope.
- Confirm that the master spreadsheet is the intended destination.

After migration:
- Review reconciliation reports.
- Resolve duplicate candidates.
- Confirm active and inactive student counts.
- Confirm fee and payment totals where comparable.
- Confirm class balances and meeting links.
- Obtain administrator acceptance.
- Treat the master spreadsheet as the canonical source going forward.

Do not delete source spreadsheets as part of cutover. They may be retained as read-only historical references according to the administrator's retention decision.

## 17. Security and Privacy

- Only an authenticated, authorized administrator may initiate imports.
- The backend must enforce authorization independently of the UI.
- Source spreadsheet permissions must be checked.
- Imported personal and financial data must not be sent to analytics services.
- Logs must avoid full source rows and sensitive payloads.
- Import previews must be visible only to authorized users.
- Temporary normalized data must not be exposed through public URLs.
- Exported migration reports must be handled as confidential records.

## 18. Performance and Limits

- Read source data in batches rather than cell by cell.
- Avoid repeated full-sheet reads inside row-processing loops.
- Use bounded batches to respect Apps Script runtime and spreadsheet quotas.
- Persist progress so interrupted work can resume safely.
- Do not keep script locks while performing unnecessary external calls.
- Report progress and incomplete status accurately.
- Define practical batch-size limits during implementation testing.

The importer must fail clearly when it cannot safely finish within the available execution limits. It must not silently stop halfway and report success.

## 19. Acceptance Criteria

The import implementation is accepted when:

1. A source spreadsheet can be inspected without changing its contents.
2. Source columns can be mapped explicitly to canonical fields.
3. Preview mode performs no canonical data mutations.
4. Ambiguous dates, fees, payment values, and class counts are flagged.
5. Duplicate students can be matched, created, or sent for review.
6. Multiple meeting links for one student are preserved.
7. Inactive students can be imported without losing their historical records.
8. Related records are not committed with invalid foreign keys.
9. Re-running an interrupted batch does not duplicate completed records.
10. Existing financial history is never silently overwritten.
11. Every processed row has a traceable outcome.
12. Batch row counts reconcile.
13. Financial and class reconciliation reports identify differences.
14. Partial failures are visible and recoverable.
15. The original source spreadsheets remain unchanged.
16. Only authorized administrators can run or view imports.
17. The final report clearly distinguishes imported data from unresolved or inferred data.

## 20. Implementation Dependencies

This document depends on:
- The canonical spreadsheet schema.
- Entity relationships and data dictionary.
- Business rules for payments, packages, sessions, and lifecycle states.
- Apps Script API contracts.
- Security and authorization requirements.
- Testing and acceptance criteria.

If these specifications conflict, resolve the conflict in the authoritative document before implementation. The importer must not invent business rules to make source data fit the schema.

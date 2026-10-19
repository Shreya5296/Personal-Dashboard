# 04 — Backup and Recovery

## 1. Purpose

Define a practical backup and recovery process for the Student Management Dashboard, whose canonical datastore is a private Google Spreadsheet and whose backend is a Google Apps Script Web App.

The process must protect student profiles, enrollment history, fee obligations, payments, packages, class sessions, meeting-link records, notes, audit history, and import reconciliation records from accidental deletion, corruption, failed migrations, unauthorized changes, and operational mistakes.

This document defines the minimum viable policy for Version 1. It does not introduce a separate database, a complex disaster-recovery platform, or an automated infrastructure stack.

## 2. Scope

The backup scope includes:

- All application tabs in the master spreadsheet.
- Spreadsheet schema and header definitions.
- Historical and inactive student records.
- Financial obligations, payment transactions, and their audit history.
- Packages, class sessions, attendance, meeting links, and notes.
- Import batches and row-level reconciliation results.
- Non-secret application configuration required to interpret records.
- Apps Script source code and deployment instructions.
- Frontend source code and version history in Git.
- A record of the deployed frontend and backend versions.

Secrets, OAuth tokens, session tokens, and other credentials must not be copied into ordinary backup archives. Their recovery or rotation must follow the secure configuration procedure in the deployment documentation.

## 3. Recovery Objectives

For the initial release, use the following operational targets:

- **Backup frequency:** at least one verified backup on every day the master data is changed; automate or schedule the process where practical.
- **Recovery Point Objective (RPO):** no more than one day of data loss under the normal backup process. This is a target, not a guarantee against all Google account or service failures.
- **Recovery Time Objective (RTO):** restore core administrative access within one business day after a recoverable incident is identified.
- **Restore verification:** every restore must be checked before the restored spreadsheet is used for production operations.

If business volume or the cost of losing recent transactions increases, the owner must review these targets. Do not claim a tighter RPO unless the backup process actually achieves it and has been tested.

## 4. Backup Types

### 4.1 Google Spreadsheet Snapshot

Create a timestamped copy of the entire master spreadsheet in a restricted backup location. A whole-spreadsheet copy is preferred over exporting individual tabs because it better preserves the tab structure, headers, and relationships.

The backup process must:

- Use an approved Google account or backend execution identity with the required permissions.
- Preserve all application tabs, including audit and import records.
- Use a filename that includes the system name and backup timestamp.
- Record the source spreadsheet ID, backup file ID, creation time, outcome, and any validation result in a backup log.
- Avoid making the backup publicly accessible or sharing it with unauthorized users.
- Fail visibly if a required tab cannot be copied or the copy cannot be verified.

A spreadsheet copy is not proof that every record is logically valid. It must be paired with the checks in Section 7.

### 4.2 Source-Code Backup

The frontend and Apps Script source must be version-controlled in the project's Git repository.

- Commit meaningful changes before production deployment.
- Use descriptive commit messages.
- Keep production deployment instructions and configuration names in the repository.
- Never commit secrets, private student exports, live spreadsheet contents, or authentication tokens.
- Keep a record of the Git commit corresponding to each production release.

If Apps Script is edited through its online editor, changes must be synchronized back to the repository through the documented workflow. An uncommitted online-only change is not considered safely backed up.

### 4.3 Configuration Backup

Maintain a secure inventory of the configuration required to recover the system, including:

- Production and development spreadsheet identifiers.
- Apps Script project and deployment identifiers.
- OAuth client identifiers and approved administrator identity configuration.
- Frontend production URL and relevant deployment settings.
- Required script properties and configuration key names.
- The current schema version.
- The current frontend release and Apps Script version.

The inventory must distinguish non-secret identifiers from secret values. Secret values must be stored only in an approved secure location and must never be embedded in the Markdown documentation or Git repository.

## 5. Backup Location and Access

Backups must be stored in a dedicated Google Drive folder restricted to the administrator and any explicitly authorized recovery operator.

Requirements:

- Do not store backups in a folder shared with students, parents, or unrelated collaborators.
- Do not use public links or "anyone with the link" sharing.
- Do not rely on the master spreadsheet's own revision history as the only recovery mechanism.
- Avoid keeping the only backup in the same folder as the live spreadsheet if a separate restricted backup folder is practical.
- Review folder permissions periodically and after any account or access change.
- Keep backup identifiers in the backup log, not in public frontend code.

The backup folder must have an understandable naming convention and must not be confused with the live production data folder.

## 6. Retention Policy

Use this initial retention policy unless the owner adopts a different documented policy:

- Keep daily backups for at least 30 days.
- Keep one monthly backup for at least 12 months.
- Keep a pre-migration backup until the migration has been verified and the rollback window has expired.
- Keep a pre-release backup before any schema migration or operation that changes many records.
- Do not delete the only known-good backup.

Retention cleanup must not run against the live master spreadsheet. Backup deletion must target only files in the designated backup location and must respect the retention rules.

If Google Drive storage or organizational policy makes these periods impractical, the owner must choose and document a replacement policy rather than silently allowing backups to accumulate without limit or deleting them unpredictably.

## 7. Backup Verification

Each backup must receive basic integrity checks. At minimum, verify:

1. The backup file exists and can be opened by the authorized recovery identity.
2. Every required application tab is present.
3. Each tab contains the expected header row.
4. The schema version is supported and recorded.
5. Record counts for important tabs are captured where practical.
6. The backup is not empty unless the source tab is legitimately empty.
7. The backup file has the expected restricted access.
8. The backup operation completed without an unreported error.

Useful record-count checks include Students, Enrollments, Packages, FeeObligations, Payments, ClassSessions, MeetingLinks, StudentNotes, AuditLog, ImportBatches, and ImportRowResults.

A record-count difference is not automatically corruption; records may have changed while the backup was created. The backup procedure should minimize concurrent writes during snapshot creation or record the snapshot timing and flag discrepancies for review.

A backup is marked **VERIFIED** only after the required checks pass. If verification fails, mark it **FAILED** or **NEEDS_REVIEW**, preserve the file for diagnosis where safe, and create another backup after the underlying issue is resolved.

## 8. Backup Log

Maintain a simple backup log in a restricted location. It may be a dedicated tab in an operational log spreadsheet or a structured record in the approved backup folder. Do not add backup-management complexity to the student data model unless an application requirement justifies it.

Each log entry should include:

- backup_id
- started_at
- completed_at
- source_spreadsheet_id
- backup_file_id
- backup_type
- schema_version
- source_record_counts
- backup_record_counts, where available
- verification_status
- outcome
- error_summary
- initiated_by
- source_code_commit, when relevant
- deployed_frontend_version, when relevant
- deployed_backend_version, when relevant

Do not include student names, parent contact details, payment details, tokens, or other unnecessary personal data in the log.

## 9. Recovery Triggers

Use this procedure when any of the following occurs:

- Accidental deletion or bulk overwrite of records.
- Spreadsheet tab or header corruption.
- A migration or import writes incorrect data.
- A faulty deployment causes incorrect updates.
- Important payment or class records become inconsistent.
- Unauthorized modification is suspected.
- The master spreadsheet becomes inaccessible or unusable.

For suspected unauthorized access, preserve available evidence and review account access before restoring. A restore alone does not remove the cause of a security incident.

## 10. Recovery Procedure

### Step 1: Stop Further Changes

- Disable or pause affected write operations where practical.
- Do not continue importing, bulk editing, or running migrations.
- Inform the administrator that data integrity is under investigation.
- Avoid deleting the damaged source file or its revision history.

### Step 2: Identify the Incident Window

Record:

- Approximate time the problem began.
- Last known-good backup.
- Changes made since that backup.
- Relevant import batch IDs, deployment versions, or request IDs.
- Tabs and record types affected.

Use the Google Sheets version history and application audit records as supporting evidence. Do not assume either source alone contains the complete recovery information.

### Step 3: Select a Recovery Method

Choose the least destructive method that restores correct data:

- **Small, isolated error:** correct the affected record through an audited application operation, if the correct values are known and the repair is safe.
- **Faulty import:** stop the import, use its row-level results to identify affected records, and apply a reviewed repair or restore from a pre-import backup.
- **Widespread corruption:** restore a verified backup into a separate recovery spreadsheet first.
- **Damaged schema:** recover the spreadsheet and schema version together, then apply only documented migrations.
- **Compromised account or credentials:** secure the account, revoke or rotate affected credentials, review access, and then recover data.

Never overwrite the production spreadsheet immediately with a backup before validating the backup and assessing changes made after its timestamp.

### Step 4: Restore to a Separate Recovery Copy

1. Select the latest verified backup from before the incident.
2. Create or identify a separate recovery spreadsheet.
3. Restrict its permissions to authorized recovery personnel.
4. Confirm required tabs, headers, schema version, and record counts.
5. Inspect the affected records and related entities.
6. Confirm that IDs and references remain consistent.
7. Verify financial totals and class balances using the documented business rules.
8. Check audit and import history relevant to the incident.

The recovery copy must not be connected to production writes until explicitly approved.

### Step 5: Reconcile Changes After the Backup

Identify valid changes made after the selected backup that should not be lost.

Where possible, recover these changes from audit records, import results, payment references, or verified operational records. Apply them through a controlled repair process rather than copying arbitrary rows between spreadsheets.

Financial transactions require particular care. Do not recreate a payment solely because a total appears different. Confirm the original transaction, date, amount, obligation, and status to avoid duplicate accounting.

### Step 6: Validate the Recovery Copy

Before promotion, verify:

- All required tabs and headers are present.
- Primary IDs are unique and non-empty.
- Foreign-key references resolve to existing records where required.
- Student, enrollment, package, fee, payment, and class relationships are valid.
- Fee balances reconcile with valid payment transactions.
- Package balances reconcile with class sessions and supported adjustments.
- Voided transactions are excluded from active calculations.
- Archived students retain their history.
- Recent valid changes have been reconciled or explicitly accepted as lost.
- Authentication and spreadsheet permissions remain correct.

Record the validation outcome and the person approving recovery.

### Step 7: Promote the Recovery Copy

Promote the recovered data only after validation and explicit administrator approval.

The cutover plan must identify the authoritative spreadsheet ID, update the protected backend configuration, and verify that the deployed backend reads from the intended spreadsheet.

Do not keep two independently writable production spreadsheets. Once cutover is complete, designate one canonical production spreadsheet and restrict the former source to read-only recovery or evidence access as appropriate.

### Step 8: Verify Application Behavior

After promotion:

- Test administrator authentication.
- Search for representative active and inactive students.
- Open student profiles and historical records.
- Verify fee balances and payment history.
- Verify package and class balances.
- Check upcoming schedules and meeting links.
- Run a safe test read and a controlled test write where appropriate.
- Confirm that audit logging works.
- Confirm that the frontend and backend point to production configuration.

### Step 9: Close the Incident

Document:

- Incident summary.
- Cause, if known.
- Backup used.
- Data restored and any data not recovered.
- Validation results.
- Recovery duration.
- Corrective actions.
- Any changes required to backup frequency or retention.

Do not mark the incident resolved while unexplained financial or relationship discrepancies remain.

## 11. Application and Code Recovery

If a deployment introduces a defect:

1. Identify the last known-good Git commit and deployed version.
2. Revert or redeploy the known-good frontend release where supported.
3. Redeploy the known-good Apps Script version using the documented procedure.
4. Confirm that backend and frontend contracts remain compatible.
5. Inspect whether the defective release changed spreadsheet data.
6. If data changed, use the data recovery procedure as well; rolling back code does not roll back spreadsheet mutations.

The application must not assume that reverting code restores previously changed records.

## 12. Schema Migration Recovery

Before a schema migration:

- Create and verify a pre-migration backup.
- Record the current schema version.
- Review the migration and rollback approach.
- Test against a copy of representative data.
- Confirm that the migration can detect missing or unexpected headers.

If migration fails:

1. Stop further writes and migration retries.
2. Preserve the failed spreadsheet for diagnosis.
3. Review migration logs and the schema version.
4. Restore the pre-migration backup into a separate recovery copy, or apply a documented corrective migration if that is safer.
5. Validate data integrity before resuming operations.

Never mark a migration complete if only some tabs were migrated and the application cannot safely interpret the resulting schema.

## 13. Recovery Permissions and Approval

Only the authorized administrator or explicitly delegated recovery operator may approve production restoration.

The person performing recovery must not broaden spreadsheet sharing as a shortcut. Temporary access must be limited to the recovery task and removed afterward.

If the administrator account itself is compromised, secure the Google account and review Drive, Apps Script, OAuth, and deployment access before returning the system to normal operation.

## 14. Recovery Drills

At least quarterly, perform a lightweight recovery drill using a non-production copy.

The drill should demonstrate that the team can:

- Locate a verified backup.
- Open and inspect it.
- Confirm tabs, headers, and schema version.
- Reconcile basic record counts.
- Verify representative financial and class calculations.
- Restore the copy without changing production data.
- Document the result and elapsed time.

A drill is successful only when the restored copy is usable and its integrity checks pass. Record failures and corrective actions.

## 15. Operational Checklist

### Daily or After Data Changes

- [ ] Create a backup according to the agreed schedule.
- [ ] Confirm the backup file exists.
- [ ] Run basic integrity checks.
- [ ] Record the backup outcome.
- [ ] Investigate failures promptly.

### Before Imports, Bulk Updates, or Schema Changes

- [ ] Create a dedicated pre-operation backup.
- [ ] Verify the backup.
- [ ] Record the current schema version.
- [ ] Review the rollback plan.
- [ ] Confirm the operation has a reconciliation report.

### After Recovery

- [ ] Confirm the authoritative production spreadsheet.
- [ ] Validate record relationships and financial balances.
- [ ] Verify authentication and permissions.
- [ ] Test core dashboard workflows.
- [ ] Record the incident and recovery outcome.
- [ ] Create a new verified backup after service is restored.

## 16. Acceptance Criteria

Backup and recovery are acceptable for Version 1 when:

1. The administrator can create a restricted, timestamped copy of the master spreadsheet.
2. The backup process verifies required tabs and headers.
3. Backup outcomes are recorded without unnecessary personal data.
4. Source code and release versions can be identified and restored.
5. A pre-import backup can be located and restored to a separate copy.
6. A recovery copy can be checked for duplicate IDs and broken references.
7. Fee and class balances can be reconciled after restoration.
8. Production is not overwritten before recovery validation and approval.
9. A recovery drill has been completed and documented.
10. The procedure does not depend on public sharing or secrets committed to source control.

## 17. Deferred Enhancements

The following are not required for the initial release unless operational
experience demonstrates a need:

- Automated off-site replication to a second cloud provider.
- Point-in-time database recovery.
- A separate disaster-recovery environment with automated failover.
- Complex backup orchestration infrastructure.
- Continuous replication of every spreadsheet edit.

The initial solution should favor restricted Google Drive snapshots,
source control, validation, and tested manual recovery over unnecessary
infrastructure.

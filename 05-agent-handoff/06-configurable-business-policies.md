# 06 — Configurable Business Policies

## 1. Purpose

This document defines which operational policies may be configured without changing application code, how those settings are stored and validated, and which rules remain fixed by the approved product, security, data-model, and API specifications.

Configuration exists to support legitimate differences in day-to-day administration. It must not become a mechanism for bypassing authorization, weakening data integrity, changing historical calculations silently, or introducing undocumented product behavior.

## 2. Authority and Scope

This document supplements:

- `00-documentation/04-google-sheets-data-model.md`
- `00-documentation/05-business-rules-and-workflows.md`
- `00-documentation/06-apps-script-api-specification.md`
- `02-backend/04-business-services-and-validation.md`
- `02-backend/05-google-sheets-access-and-integrity.md`
- `03-data/01-master-spreadsheet-schema.md`
- `03-data/03-financial-and-class-balance-calculations.md`
- `03-data/04-data-validation-and-schema-migrations.md`
- `04-quality-and-operations/03-deployment-and-environment-configuration.md`

If a proposed setting conflicts with an authoritative requirement, the agent must not implement the setting as a workaround. The owner must approve a documented requirement change and update the affected specifications first.

## 3. Configuration Principles

1. **Backend authority:** The Apps Script backend resolves and validates policy settings. Frontend controls are presentation only.
2. **Explicit defaults:** Every configurable policy has one documented default and a defined behavior when missing.
3. **Fail closed:** Invalid, unsupported, or contradictory settings must not silently fall back to permissive behavior.
4. **Typed values:** Settings have declared types, allowed values, bounds, and validation rules.
5. **No secrets in `AppConfig`:** OAuth secrets, tokens, credentials, and privileged identity configuration must remain in protected backend configuration.
6. **No silent historical rewrites:** Changing a policy must not silently recalculate or mutate historical source records. Any changed interpretation of historical data requires a reviewed migration or explicit recalculation plan.
7. **Auditability:** Changes to business policies are recorded with the setting key, safe before/after values, actor, timestamp, and outcome. Secret values must never be included in audit records.
8. **Minimal scope:** Add a setting only when a real operational requirement justifies it. Do not create a generic rules engine.
9. **Version compatibility:** The application must recognize the policy schema version and reject unsupported versions safely.
10. **Environment separation:** Development and production policy values must be independently controlled and reviewed.

## 4. Configuration Storage and Precedence

### 4.1 Storage locations

Use the following boundaries:

- **`AppConfig` spreadsheet tab:** Non-secret business and display preferences that the administrator is allowed to manage through the application.
- **Apps Script Script Properties or another approved protected backend configuration store:** Spreadsheet identifiers, environment identifiers, administrator allowlist, OAuth audience/client configuration used for verification, and other privileged deployment settings.
- **Source-controlled specifications:** Fixed business invariants, default policy definitions, allowed ranges, validation behavior, and migration procedures.
- **Frontend environment variables:** Public configuration only, such as the relevant API deployment URL and a browser-visible OAuth client ID if required by the selected flow. Never store secrets here.

The `AppConfig` tab is not an authorization boundary. A setting must not grant access, change the administrator allowlist, select an arbitrary production spreadsheet, or disable backend validation.

### 4.2 Precedence

Resolve configuration in this order:

1. Non-overridable security and data-integrity invariants in approved specifications.
2. Valid protected backend deployment configuration.
3. Valid persisted business settings in `AppConfig`.
4. Documented defaults for optional settings that are missing and explicitly allow a default.

A lower-precedence source must never override a higher-precedence rule. A malformed value must not be treated as if it were absent.

### 4.3 Settings record shape

Use the canonical columns defined for `AppConfig` in the master spreadsheet schema. Conceptually, each row represents one key/value setting and may include a type, description, update timestamp, and other schema-approved metadata. Do not add columns or assume fields that are not in the authoritative schema.

The implementation must not store executable expressions, JavaScript, formulas intended to be evaluated as rules, HTML, or arbitrary code in configuration values.

## 5. Configurable Policy Catalog

The following policies may be configurable only if the existing schema and API can represent them without conflicting with authoritative rules. If the canonical `AppConfig` schema cannot represent a required setting, document and approve a schema change before implementation.

| Policy | Default | Allowed configuration | Validation and behavior |
|---|---|---|---|
| Application display timezone | `Asia/Kolkata` | A supported IANA timezone identifier, if timezone configurability is approved | Invalid identifiers block configuration save. Date-only values must never shift due to timezone conversion. The initial production policy remains `Asia/Kolkata`. |
| Display currency | `INR` | `INR` only in Version 1 | Other currencies are rejected until the schema, calculations, import behavior, and UI are explicitly revised. |
| Date display format | `DD MMM YYYY` | A small documented enum of supported formats, if required | Store date-only values canonically; format only at presentation boundaries. |
| Date-time display format | `DD MMM YYYY, HH:mm` | A small documented enum of supported formats, if required | Render using the configured display timezone. Do not change stored instants when display format changes. |
| Default student directory filter | Active students | `ACTIVE`, `INACTIVE`, or `ALL` where the UI supports these filters | Affects initial presentation only; it never limits backend authorization or deletes records. |
| Default class calendar view | The view specified by the approved UI specification | Only views actually implemented by the UI | Unknown values are rejected. This is a presentation preference, not a scheduling rule. |
| Upcoming-class dashboard horizon | The period specified by the approved dashboard specification | A bounded positive integer number of days, if exposed as a setting | Apply a documented minimum and maximum. It changes the dashboard query window only. |
| Due-soon warning horizon | No additional warning unless defined by approved requirements | A bounded non-negative integer number of days, if approved | Must not change the due date, obligation amount, paid amount, or overdue definition. |
| Duplicate-student warning behavior | Warn and require review for likely matches | Enable/disable only the non-blocking warning presentation if approved | Must never auto-merge records. Existing backend duplicate safeguards remain mandatory. |
| Meeting-link provider labels | Canonical provider labels defined by the schema/UI | Labels for already supported provider enum values only | Cannot add unsupported provider types or allow unsafe URL schemes. Stored provider enums remain canonical. |
| Import preview sample size | A small bounded sample | Bounded positive integer, if required | Must not reduce full-row validation. Sampling is for preview only; all rows selected for import still require validation. |
| Import duplicate-match sensitivity | The documented conservative matching behavior | A small enumerated mode only if the matching algorithm is specified and tested | Ambiguous matches must remain review items. A setting must not authorize silent merging or overwriting. |

This catalog is a controlled proposal, not permission to add every setting immediately. Implement only policies that have a concrete UI or operational use case and are representable in the approved schema.

## 6. Fixed Rules That Are Not Configurable in Version 1

The following must not be exposed as ordinary settings:

- Whether authentication is required for protected operations.
- Which administrator identity or allowlist is authorized.
- Whether the spreadsheet is private.
- Whether the frontend may access Google Sheets directly.
- Whether backend validation can be skipped.
- Whether foreign-key and record-ownership checks run.
- Whether audit logging is disabled for important mutations.
- Whether IDs can be generated from names, phone numbers, or row numbers.
- Whether financial and class balances are derived from source records.
- Whether a payment may exceed the outstanding obligation through the normal payment workflow.
- Whether voided financial records contribute to balances.
- Whether ordinary workflows may hard-delete historical student, payment, package, enrollment, or class records.
- Whether ambiguous import matches may be merged automatically.
- Whether source spreadsheets may be edited by the importer.
- Whether production data may be used for routine automated tests.
- Whether the micro-file source limit can be ignored.

A future requirement may change a fixed rule, but only through a reviewed specification change, impact assessment, test updates, and explicit owner approval—not through a runtime toggle.

## 7. Financial and Class Policies

### 7.1 Financial calculation invariants

The calculation specification remains authoritative. Configurable display preferences must not change:

- The set of payments eligible to contribute to an obligation.
- The relationship checks between a payment, student, and fee obligation.
- The formula for paid amount and outstanding amount.
- The rule that voided records do not contribute to balances.
- The prohibition on silently clamping imported overpayments.
- The requirement to preserve financial history and audit corrections.
- The currency and precision rules defined for Version 1.

If a future policy needs to alter financial treatment—such as refunds, credits, late fees, or currency conversion—it requires a separately approved business-rule and data-model revision. It must not be introduced as a generic `AppConfig` toggle.

### 7.2 Class-credit invariants

The class-balance calculation and attendance rules remain authoritative. In Version 1, a configurable preference must not change which attendance/session outcomes consume a class credit. In particular, the approved rule that a class is deducted only when both teacher and student attended must not be overridden by a setting.

Any future exception or credit-adjustment policy requires an explicit model for the adjustment, reason, actor, timestamp, audit event, and calculation effect. It cannot be implemented by editing a package's derived balance directly.

### 7.3 Due dates and warnings

A warning horizon may affect when the dashboard highlights an upcoming due date, if approved. It must not change the stored due date or the authoritative meaning of overdue. The UI must distinguish a warning from an actual overdue state.

## 8. Validation and Runtime Resolution

For each configurable key, the backend must define:

- Canonical key name.
- Data type.
- Default value, if any.
- Allowed values or numeric bounds.
- Whether the setting is owner-editable in the UI.
- Whether the setting requires reloading cached configuration.
- Whether changing it requires an audit event.
- Whether it affects only future operations or also presentation of historical records.

At runtime:

1. Load settings through `ConfigurationService` and the repository layer.
2. Validate the configuration schema and each recognized setting.
3. Reject malformed values and unsupported keys where strict configuration validation applies.
4. Apply documented defaults only for missing optional keys.
5. Return a safe operational error when a required setting is invalid.
6. Never continue with an unsafe permissive fallback.
7. Cache validated settings only where justified; invalidate the cache after a successful setting change or schema migration.
8. Ensure simultaneous updates cannot leave partially applied or contradictory policy state.

The frontend may receive a safe, allowlisted subset of settings required for rendering. It must not receive privileged backend configuration or internal secrets.

## 9. Settings UI Requirements

If a Settings UI is implemented for these policies, it must:

- Show the current value, allowed range/options, and concise explanation of its effect.
- Distinguish business policy from display preference.
- Prevent saving invalid values and show backend validation errors.
- Require confirmation for settings that materially change operational behavior.
- Explain whether a change affects future operations, display only, or historical presentation.
- Display a clear saved state only after the backend confirms persistence.
- Provide a safe reset-to-default action only for settings that explicitly define a default.
- Avoid presenting fixed security or data-integrity rules as toggles.
- Avoid exposing protected deployment configuration or administrator allowlist values.
- Refresh affected UI state after a successful save.

If the Settings page is not specified to expose a policy, the coding agent must not add it merely because the backend can store it.

## 10. Change, Audit, and Concurrency Rules

A policy update must follow the standard protected mutation lifecycle:

1. Authenticate and authorize the administrator.
2. Validate the key and proposed value against the policy catalog.
3. Read the current persisted value.
4. Determine whether the change is permitted and whether confirmation is required.
5. Acquire the appropriate lock for the mutation.
6. Re-read the value under the lock if concurrent modification is possible.
7. Persist the validated value using the repository layer.
8. Verify the persisted result where appropriate.
9. Record the policy change in the audit log without secrets or unnecessary personal data.
10. Invalidate the configuration cache and return the confirmed result.

A failed write must not be reported as successful. If persistence succeeds but audit recording fails, follow the approved audit-integrity failure policy; do not silently claim a fully successful operation if the audit requirement was not met.

## 11. Imports and Policy Changes

Import behavior must be deterministic for a given batch, source, mapping, and approved policy version.

- Record the applicable policy/schema version with the import batch when the canonical schema supports it; otherwise document the approved alternative before implementation.
- Do not rerun a partially completed import under materially different matching or normalization policies without an explicit review step.
- A policy change must not make previously imported rows appear to have been processed under a different rule.
- Reconciliation must continue to distinguish imported, skipped, duplicate-review, and failed rows.
- Never overwrite existing financial history because a configuration value changed.

If the schema lacks the fields required to preserve this provenance, document the gap and seek approval for the smallest required schema change. Do not add undocumented columns ad hoc.

## 12. Testing Requirements

Tests must cover at least:

- Missing optional setting uses its documented default.
- Missing required setting blocks the affected operation safely.
- Invalid type, enum, numeric bound, timezone, or unsupported value is rejected.
- Unknown or prohibited security-sensitive keys cannot weaken controls.
- The frontend cannot bypass backend policy validation by sending a crafted request.
- A successful update persists, is audited, and invalidates cached settings.
- A failed update does not display a success state.
- Concurrent setting updates do not silently overwrite one another where locking is required.
- Display-format changes do not mutate stored dates, timestamps, amounts, or historical records.
- Warning-horizon changes do not alter fee obligations or financial calculations.
- Class-credit behavior remains unchanged by display or warning preferences.
- Import preview and reconciliation remain safe under the applicable policy version.
- Development and production configuration remain separated.

Use synthetic data and a dedicated test spreadsheet. Do not run destructive configuration or migration tests against production.

## 13. Acceptance Criteria

This document is implemented when:

- Every live configurable setting has an approved catalog entry, type, default, allowed range, and ownership rule.
- The backend validates settings centrally through `ConfigurationService`.
- No setting can disable security, integrity, audit, or historical-preservation invariants.
- The Settings UI exposes only approved settings and accurately explains their effects.
- Policy updates are persisted, verified, audited, and reflected in runtime configuration.
- Invalid configuration fails safely and produces a non-sensitive diagnostic.
- Automated tests cover defaults, validation, prohibited overrides, update failures, cache invalidation, and invariant preservation.
- The document index and any affected schema, API, business-rule, test, and traceability documents are updated if the approved implementation changes the documented setting catalog.

## 14. Agent Instructions

Before implementing a policy setting:

1. Confirm that the policy appears in the approved catalog and is needed by a specified workflow.
2. Check that the canonical schema and API can represent it.
3. Identify the owning backend service and the required UI surface, if any.
4. Add validation and tests before exposing the setting.
5. Confirm that the setting cannot bypass a fixed invariant.
6. Update traceability and documentation when behavior or scope changes.
7. Stop and report a blocker if the requested policy conflicts with an authoritative specification.

Do not invent extra configurable policies, alter defaults without approval, or treat the existence of the `AppConfig` tab as permission to make every business rule configurable.

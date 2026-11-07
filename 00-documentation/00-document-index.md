# 00 — Document Index & Documentation Registry

## 1. Project Identification

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document set version:** 4.0.0 (Post-Audit Canonical Realignment)
- **Status:** Authoritative documentation matching verified implementation
- **Primary user:** One authorized administrator (`ashreya0502@gmail.com`)
- **Authentication:** Server-side HMAC-SHA256 signed session tokens via Apps Script Script Properties (`ADMIN_AUTH_KEY`)
- **Frontend:** React 18, TypeScript, Vite (Vercel SPA)
- **Backend:** Google Apps Script Web App (API, business logic & datastore operations)
- **Datastore:** Exactly six Google Sheets tables in one private Google Spreadsheet
- **Primary Timezone:** `Asia/Kolkata` (IST, UTC+05:30)
- **Base Currency:** `INR` (multi-currency supported with original currency retained and manual `in_inr` conversion)

## 2. Documentation Architecture & Directory Map

```text
Personal Dashboard/
├── README.md                                    # Root project guide, architecture overview, and quickstart
├── 00-documentation/                            # Canonical system specifications
│   ├── 00-document-index.md                     # [Current] Document registry, classification, and authority map
│   ├── 01-product-requirements.md              # [Current] Product scope, modules, user boundaries, and non-goals
│   ├── 02-system-architecture.md               # [Current] End-to-end architecture, boundaries, components, data flow
│   ├── 03-security-and-authentication.md       # [Current] HMAC-SHA256 token verification, allowlist, Script Properties
│   ├── 04-google-sheets-data-model.md          # [Current] Canonical 6-table schema, columns, IDs, normalization
│   ├── 05-business-rules-and-workflows.md      # [Current] Student, package, class, deduction, finance, and calendar rules
│   ├── 06-apps-script-api-specification.md     # [Current] API operations, payloads, responses, validation, error codes
│   ├── 07-frontend-product-and-ui-specification.md # [Current] Screen layouts, navigation, forms, tables, modals
│   ├── 08-frontend-file-and-code-architecture.md  # [Current] Frontend tree, single-purpose micro-files (<= 149 lines)
│   ├── 09-data-import-and-migration.md         # [Historical] Legacy import pipeline (Retired in Phase 15)
│   ├── 10-testing-and-acceptance-criteria.md   # [Current] Quality gates, Vitest regression suite, line-limit checks
│   ├── 11-deployment-and-operations.md         # [Current] Vercel frontend, Apps Script clasp deployment, runbooks
│   ├── 12-implementation-agent-instructions.md # [Current] AI coding agent rules, 6-table restrictions, invariants
│   └── 13-glossary-and-architecture-decisions.md # [Current] Terminology, ADRs, schema history, and constraints
├── 01-frontend/                                # Frontend domain deep-dives
│   ├── 01-frontend-requirements.md             # [Current] Frontend functional requirements & navigation scope
│   ├── 02-design-system-and-ui-guidelines.md   # [Current] Visual tokens, typography, spacing, CSS architecture
│   ├── 03-pages-components-and-interactions.md # [Current] Component hierarchy, modals, tables, inline expansion
│   └── 04-frontend-state-and-data-flow.md      # [Current] Async state, API transport, caching, error boundaries
├── 02-backend/                                 # Backend domain deep-dives
│   ├── 01-apps-script-project-structure.md     # [Current] Apps Script file structure, handlers, services, repositories
│   ├── 02-api-contracts-and-error-handling.md  # [Current] Request envelope, response factory, error envelope
│   ├── 03-authentication-and-authorization.md  # [Current] Token verification, secret key, admin allowlist
│   ├── 04-business-services-and-validation.md  # [Current] Backend validation, lock manager, audit logging
│   ├── 05-google-sheets-access-and-integrity.md# [Current] HeaderMapper, RowReader, RowWriter, DateFormatService
│   └── apps-script/README.md                   # [Current] clasp synchronization, manifest, deployment notes
├── 03-data/                                    # Datastore and schema deep-dives
│   ├── 01-master-spreadsheet-schema.md         # [Current] Master 6-table spreadsheet schema & physical column order
│   ├── 02-entity-relationships-and-data-dictionary.md # [Current] ER diagram, composite session ID, field dictionary
│   ├── 03-financial-and-class-balance-calculations.md # [Current] Dynamic class balance & multi-currency math
│   ├── 04-data-validation-and-schema-migrations.md    # [Current] Schema validation, FinalCanonicalSchemaMigration
│   └── 05-existing-sheets-import-and-reconciliation.md# [Historical] Legacy spreadsheet reconciliation
├── 04-quality-and-operations/                  # Quality assurance & operational runbooks
│   ├── 01-test-strategy-and-acceptance-criteria.md    # [Current] Test layers, mock spreadsheet, regression coverage
│   ├── 02-security-and-privacy-checklist.md    # [Current] Security release gates, formula injection guards
│   ├── 03-deployment-and-environment-configuration.md # [Current] Deployment procedure, Script Properties, Vercel
│   ├── 04-backup-and-recovery.md               # [Current] Spreadsheet backup runbook, rollback procedures
│   └── 05-maintenance-and-troubleshooting.md   # [Current] Common failure modes, Apps Script quota, diagnosis
├── 05-agent-handoff/                           # AI Agent and handoff documents
│   ├── 00-project-state.md                     # [Current] Durable project run state, current commit, snapshot
│   ├── 01-implementation-sequence.md           # [Current] Milestone sequence, completed phases, execution flow
│   ├── 02-coding-agent-rules.md                # [Current] Non-negotiable coding agent rules, 6-table restriction
│   ├── 03-definition-of-done.md                # [Current] Verification checklist and acceptance criteria
│   ├── 04-requirements-traceability.md         # [Current] Requirements to implementation verification matrix
│   ├── 05-autonomous-execution-protocol.md     # [Current] Autonomous execution guidelines and safety checks
│   ├── 06-configurable-business-policies.md    # [Current] ConfigService, ScriptProperties, non-configurable rules
│   └── 07-owner-setup-and-inputs.md            # [Current] Production secrets, spreadsheet IDs, owner checklist
└── docs/                                       # Project audit records and pre-launch migration archive
    ├── README.md                               # [Current] Navigation guide to canonical documentation
    ├── audits/                                 # Historical post-deployment audits
    └── prelaunch/                              # Historical pre-launch migration proposals and field maps
```

## 3. Documentation Audit & Classification Register

| Document Path | Status | Summary of Content / Action Taken |
|---|---|---|
| `README.md` | **Current** | Updated to reflect 6-table datastore, micro-file rule, commands, and architecture. |
| `00-documentation/00-document-index.md` | **Current** | Updated complete document inventory, classifications, and authority map. |
| `00-documentation/01-product-requirements.md` | **Current** | Aligned scope to 6 active modules; consolidated Finances; retired Import/Reconcile. |
| `00-documentation/02-system-architecture.md` | **Current** | Aligned architecture to 6-table datastore, HMAC-SHA256 auth, Apps Script backend, and React. |
| `00-documentation/03-security-and-authentication.md` | **Current** | Verified server-side HMAC-SHA256 session tokens, allowlist, Script Properties, zero-GCP. |
| `00-documentation/04-google-sheets-data-model.md` | **Current** | Authoritative 6-table canonical schema. Removed package_id, session_id, and obsolete tables. |
| `00-documentation/05-business-rules-and-workflows.md` | **Current** | Aligned student status, package expiry, session deduction, calendar 3-state, and finance rules. |
| `00-documentation/06-apps-script-api-specification.md` | **Current** | Complete reference of registered backend operations and contracts. Removed retired APIs. |
| `00-documentation/07-frontend-product-and-ui-specification.md` | **Current** | Matches actual UI pages (Dashboard, Calendar, Students, Classes, Finances, Meeting Links). |
| `00-documentation/08-frontend-file-and-code-architecture.md` | **Current** | Maps actual `src/` directory structure, domains, and strictly enforced <= 149 lines rule. |
| `00-documentation/09-data-import-and-migration.md` | **Historical** | Marked as permanently retired feature (retired in Phase 15). Preserved for project history. |
| `00-documentation/10-testing-and-acceptance-criteria.md` | **Current** | Documents Vitest regression suite, line limits, TypeScript strict check, and mock stores. |
| `00-documentation/11-deployment-and-operations.md` | **Current** | Details Vercel hosting, Apps Script Web App clasp deployment, and Script Properties. |
| `00-documentation/12-implementation-agent-instructions.md` | **Current** | Aligned coding agent rules: 6-table restriction, micro-file limit, source-of-truth rules. |
| `00-documentation/13-glossary-and-architecture-decisions.md` | **Current** | Documents architectural decision records (ADRs) for 6-table model, composite keys, etc. |
| `01-frontend/01-frontend-requirements.md` | **Current** | Aligned navigation to 6 active sections; consolidated Finances; removed retired screens. |
| `01-frontend/02-design-system-and-ui-guidelines.md` | **Current** | Confirmed CSS design tokens, typography, responsive rules, and 3-color calendar scheme. |
| `01-frontend/03-pages-components-and-interactions.md` | **Current** | Documents actual component hierarchy, modals, tables, and inline row expansion. |
| `01-frontend/04-frontend-state-and-data-flow.md` | **Current** | Details client-side data fetching, text/plain transport, async state, and ErrorBoundary. |
| `02-backend/01-apps-script-project-structure.md` | **Current** | Documents backend modules, handlers, services, repositories, and setup migration scripts. |
| `02-backend/02-api-contracts-and-error-handling.md` | **Current** | Documents request/response envelope, error codes, and CORS text/plain POST handling. |
| `02-backend/03-authentication-and-authorization.md` | **Current** | Explains HMAC-SHA256 session token generation, validation, and admin allowlist check. |
| `02-backend/04-business-services-and-validation.md` | **Current** | Explains validation rules, concurrency lock manager, and audit trail. |
| `02-backend/05-google-sheets-access-and-integrity.md`| **Current** | Details dynamic HeaderMapper, RowReader, RowWriter, and DateFormatService. |
| `03-data/01-master-spreadsheet-schema.md` | **Current** | Authoritative 6-table schema specification matching Section 3. |
| `03-data/02-entity-relationships-and-data-dictionary.md` | **Current** | Entity-relationship diagram, composite key strategy, and canonical column definitions. |
| `03-data/03-financial-and-class-balance-calculations.md` | **Current** | Explains dynamic balance derivation, FIFO credit burn, and multi-currency rules. |
| `03-data/04-data-validation-and-schema-migrations.md` | **Current** | Migration history, FinalCanonicalSchemaMigration, and validation rules. |
| `03-data/05-existing-sheets-import-and-reconciliation.md` | **Historical** | Preserved historical migration analysis from pre-launch phase. |
| `04-quality-and-operations/01-test-strategy-and-acceptance-criteria.md` | **Current** | Documents automated unit, domain, and E2E test strategy. |
| `04-quality-and-operations/02-security-and-privacy-checklist.md` | **Current** | Production security checklist, formula injection protection, secret safety. |
| `04-quality-and-operations/03-deployment-and-environment-configuration.md`| **Current** | Step-by-step deployment and environment configuration guide. |
| `04-quality-and-operations/04-backup-and-recovery.md` | **Current** | Automated and manual backup procedures, rollback runbooks. |
| `04-quality-and-operations/05-maintenance-and-troubleshooting.md` | **Current** | Diagnostic procedures for Apps Script errors, timeout recovery, and quota limits. |
| `05-agent-handoff/00-project-state.md` | **Current** | Durable project run record through git commit `db0fccb`. |
| `05-agent-handoff/01-implementation-sequence.md` | **Current** | Execution phase sequence through completed Batch 5 fixes. |
| `05-agent-handoff/02-coding-agent-rules.md` | **Current** | Core instructions for AI coding agents; 6-table restriction; micro-file mandate. |
| `05-agent-handoff/03-definition-of-done.md` | **Current** | Verification checklist for completed features and refactors. |
| `05-agent-handoff/04-requirements-traceability.md` | **Current** | Traceability matrix linking requirements to code and tests. |
| `05-agent-handoff/05-autonomous-execution-protocol.md` | **Current** | Autonomous development safety rules. |
| `05-agent-handoff/06-configurable-business-policies.md`| **Current** | ConfigService, ScriptProperties, non-configurable invariants. |
| `05-agent-handoff/07-owner-setup-and-inputs.md` | **Current** | Production credentials and environment configuration checklist. |
| `docs/README.md` | **Current** | Navigation guide to canonical documentation. |
| `docs/audits/*` | **Historical** | Preserved records of past deployment audits. |
| `docs/prelaunch/*` | **Historical** | Preserved pre-launch schema proposals, field migration maps, and owner decisions. |

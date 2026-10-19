# 00 — Document Index

## 1. Project

- **Product:** Student Management Dashboard
- **Document set version:** 1.0.0
- **Status:** Architecture documentation
- **Primary user:** One authorized administrator
- **Frontend:** React, TypeScript, Vite
- **Backend:** Google Apps Script Web App
- **Datastore:** Google Sheets
- **Frontend hosting:** Vercel, subject to plan eligibility and applicable terms
- **Version control:** Git

## 2. Documentation Structure

```text
student-management-dashboard/
├── 00-documentation/
│   ├── 00-document-index.md
│   ├── 01-product-requirements.md
│   ├── 02-system-architecture.md
│   ├── 03-security-and-authentication.md
│   ├── 04-google-sheets-data-model.md
│   ├── 05-business-rules-and-workflows.md
│   ├── 06-apps-script-api-specification.md
│   ├── 07-frontend-product-and-ui-specification.md
│   ├── 08-frontend-file-and-code-architecture.md
│   ├── 09-data-import-and-migration.md
│   ├── 10-testing-and-acceptance-criteria.md
│   ├── 11-deployment-and-operations.md
│   ├── 12-implementation-agent-instructions.md
│   └── 13-glossary-and-architecture-decisions.md
├── 01-frontend/
│   ├── 01-frontend-requirements.md
│   ├── 02-design-system-and-ui-guidelines.md
│   ├── 03-pages-components-and-interactions.md
│   └── 04-frontend-state-and-data-flow.md
├── 02-backend/
│   ├── 01-apps-script-project-structure.md
│   ├── 02-api-contracts-and-error-handling.md
│   ├── 03-authentication-and-authorization.md
│   ├── 04-business-services-and-validation.md
│   └── 05-google-sheets-access-and-integrity.md
├── 03-data/
│   ├── 01-master-spreadsheet-schema.md
│   ├── 02-entity-relationships-and-data-dictionary.md
│   ├── 03-financial-and-class-balance-calculations.md
│   ├── 04-data-validation-and-schema-migrations.md
│   └── 05-existing-sheets-import-and-reconciliation.md
├── 04-quality-and-operations/
│   ├── 01-test-strategy-and-acceptance-criteria.md
│   ├── 02-security-and-privacy-checklist.md
│   ├── 03-deployment-and-environment-configuration.md
│   ├── 04-backup-and-recovery.md
│   └── 05-maintenance-and-troubleshooting.md
└── 05-agent-handoff/
    ├── 01-implementation-sequence.md
    ├── 02-coding-agent-rules.md
    ├── 03-definition-of-done.md
    └── 04-requirements-traceability.md
```

## 3. Document Register

### 00-documentation

| Number | File | Authority |
|---|---|---|
| 00 | `00-document-index.md` | Document inventory, conventions, and navigation |
| 01 | `01-product-requirements.md` | Product goals, scope, users, and functional requirements |
| 02 | `02-system-architecture.md` | End-to-end system components, boundaries, and data flow |
| 03 | `03-security-and-authentication.md` | Identity, authorization, privacy, and security controls |
| 04 | `04-google-sheets-data-model.md` | Canonical spreadsheet tabs, columns, IDs, and relationships |
| 05 | `05-business-rules-and-workflows.md` | Student lifecycle, fees, payments, packages, classes, and meeting links |
| 06 | `06-apps-script-api-specification.md` | API operations, payloads, responses, validation, and errors |
| 07 | `07-frontend-product-and-ui-specification.md` | Screens, navigation, forms, tables, and UI behavior |
| 08 | `08-frontend-file-and-code-architecture.md` | Frontend directory tree, file responsibilities, and code constraints |
| 09 | `09-data-import-and-migration.md` | Source-sheet mapping, import, duplicate review, and reconciliation |
| 10 | `10-testing-and-acceptance-criteria.md` | Test strategy and release acceptance requirements |
| 11 | `11-deployment-and-operations.md` | Environments, deployment, backups, recovery, and maintenance |
| 12 | `12-implementation-agent-instructions.md` | Coding-agent execution rules and implementation handoff |
| 13 | `13-glossary-and-architecture-decisions.md` | Shared terminology, confirmed architecture decisions, and global constraints |

### 01-frontend

| File | Authority |
|---|---|
| `01-frontend-requirements.md` | Frontend-specific behavior and constraints |
| `02-design-system-and-ui-guidelines.md` | Visual tokens, typography, spacing, responsive behavior, and accessibility |
| `03-pages-components-and-interactions.md` | Page inventory, component responsibilities, and interaction details |
| `04-frontend-state-and-data-flow.md` | Client state, API calls, loading states, errors, and refresh behavior |

### 02-backend

| File | Authority |
|---|---|
| `01-apps-script-project-structure.md` | Apps Script module and file organization |
| `02-api-contracts-and-error-handling.md` | Detailed endpoint/operation contracts and error envelope |
| `03-authentication-and-authorization.md` | Backend enforcement of identity and permissions |
| `04-business-services-and-validation.md` | Service boundaries, input validation, and domain operations |
| `05-google-sheets-access-and-integrity.md` | Spreadsheet repositories, locking, batching, and integrity safeguards |

### 03-data

| File | Authority |
|---|---|
| `01-master-spreadsheet-schema.md` | Exact tab names, column order, types, and required fields |
| `02-entity-relationships-and-data-dictionary.md` | IDs, relationships, enumerations, and field meanings |
| `03-financial-and-class-balance-calculations.md` | Authoritative balance and allocation formulas |
| `04-data-validation-and-schema-migrations.md` | Schema versions, validation, and controlled upgrades |
| `05-existing-sheets-import-and-reconciliation.md` | Import mappings, row outcomes, duplicate handling, and reconciliation |

### 04-quality-and-operations

| File | Authority |
|---|---|
| `01-test-strategy-and-acceptance-criteria.md` | Automated and manual testing requirements |
| `02-security-and-privacy-checklist.md` | Security verification and privacy release gate |
| `03-deployment-and-environment-configuration.md` | Local, preview, and production configuration and release process |
| `04-backup-and-recovery.md` | Backup, restoration, and recovery verification |
| `05-maintenance-and-troubleshooting.md` | Operational checks and common failure procedures |

### 05-agent-handoff

| File | Authority |
|---|---|
| `01-implementation-sequence.md` | Ordered implementation milestones and dependencies |
| `02-coding-agent-rules.md` | Mandatory coding-agent behavior and repository constraints |
| `03-definition-of-done.md` | Final deliverables and release completion criteria |
| `04-requirements-traceability.md` | Mapping from requirements to implementation and tests |

## 4. Source-of-Truth Rules

When documents overlap, the following files are authoritative for their domain:

- Product scope: `01-product-requirements.md`
- System boundaries and architecture: `02-system-architecture.md`
- Security controls: `03-security-and-authentication.md`
- Canonical data fields: `04-google-sheets-data-model.md` and the detailed schema under `03-data/`
- Business behavior: `05-business-rules-and-workflows.md`
- API contract: `06-apps-script-api-specification.md` and its detailed backend contract
- Frontend file structure: `08-frontend-file-and-code-architecture.md`
- Acceptance: `10-testing-and-acceptance-criteria.md`
- Deployment and recovery: `11-deployment-and-operations.md`
- Agent execution: `12-implementation-agent-instructions.md`
- Terminology and confirmed architecture decisions: `13-glossary-and-architecture-decisions.md`

`13-glossary-and-architecture-decisions.md` is an intentional project document and part of the documented review and source-of-truth baseline, not an optional stray file.

Detailed documents may expand an authoritative specification but must not silently contradict it. Resolve conflicts explicitly and update every affected document.

## 5. Global Architecture Constraints

1. The application is an admin-only dashboard in its first release.
2. Google Sheets is the canonical datastore.
3. All spreadsheet access passes through the Apps Script backend.
4. Authentication and authorization are enforced server-side for every protected operation, including reads.
5. Student, enrollment, package, fee, payment, class, and meeting-link records use stable IDs.
6. Historical records are retained; normal application workflows do not hard-delete students or financial history.
7. Financial balances and class balances are derived from authoritative records and documented rules.
8. Existing spreadsheets are imported through a controlled, reviewable migration process.
9. The frontend never contains privileged backend credentials.
10. Development and production environments must be separated.
11. Cross-origin and authentication behavior must be proven before real student data is loaded.
12. No insecure workaround may be introduced to bypass browser or backend security.

## 6. Mandatory Source-File Architecture Rule

Every domain in `src/` and `public/` must be organized as a directory of single-purpose micro-files.

- Every source file must remain under 150 lines.
- No catch-all files such as `actions.js` or `app.js`.
- No monolithic CSS files.
- Components, services, schemas, hooks, and utilities must have clear responsibilities.
- Split files by responsibility rather than compressing code to satisfy the limit.
- The detailed directory tree and enforcement rules belong in `08-frontend-file-and-code-architecture.md`.

## 7. Documentation Conventions

- Use the exact filenames and folder names in this index.
- Use consistent entity names, field names, enum values, and API operation names.
- Use `Asia/Kolkata` as the application display timezone unless a later approved decision changes it.
- Use INR as the default display currency for Version 1.
- Mark unresolved decisions explicitly; do not silently invent product behavior.
- Keep each document focused on its assigned responsibility.
- Link related documents by their repository-relative paths.
- Keep examples free of real student personal data and production secrets.

## 8. Change Control

Any change to a finalized requirement must record:

1. The requirement or decision being changed.
2. The reason for the change.
3. The documents affected.
4. Any impacted schemas, API operations, UI flows, or tests.
5. The migration or compatibility implications, if applicable.

Coding agents must not silently change the stack, database model, authentication model, file-size rule, or deployment design.

## 9. Implementation Gate

Implementation may begin only after the required documentation has been reviewed and the following agree:

- Product requirements and explicit non-goals
- System architecture and security model
- Spreadsheet schemas and relationships
- Business rules and calculations
- API contracts
- Frontend screens and data flow
- Source-file and directory constraints
- Import and migration plan
- Acceptance tests
- Deployment, backup, and recovery procedures
- Coding-agent handoff instructions
- Terminology, architecture decisions, and global constraints (`13-glossary-and-architecture-decisions.md`)

Open decisions must be resolved or explicitly deferred with their impact documented.

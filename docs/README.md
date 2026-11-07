# Project Documentation Reference — Personal Dashboard

## 1. Primary Documentation System

The authoritative, canonical documentation system for the Personal Dashboard is organized into the numbered root directories:

- **[`00-documentation/`](../00-documentation/)**: Core system architecture, product requirements, canonical 6-table Google Sheets data model, business rules, API reference, security, testing, deployment, and AI coding agent instructions.
  - [`00-document-index.md`](../00-documentation/00-document-index.md): Complete document register and classification.
  - [`01-product-requirements.md`](../00-documentation/01-product-requirements.md): Scope across all 6 active modules.
  - [`02-system-architecture.md`](../00-documentation/02-system-architecture.md): High-level architecture and Mermaid workflows.
  - [`03-security-and-authentication.md`](../00-documentation/03-security-and-authentication.md): HMAC-SHA256 session token security.
  - [`04-google-sheets-data-model.md`](../00-documentation/04-google-sheets-data-model.md): The strictly six canonical Google Sheets tables.
  - [`05-business-rules-and-workflows.md`](../00-documentation/05-business-rules-and-workflows.md): Attendance, deductions, calendar, package expiry.
  - [`06-apps-script-api-specification.md`](../00-documentation/06-apps-script-api-specification.md): Complete backend API reference.
  - [`07-frontend-product-and-ui-specification.md`](../00-documentation/07-frontend-product-and-ui-specification.md): UI screen layouts and interactions.
  - [`08-frontend-file-and-code-architecture.md`](../00-documentation/08-frontend-file-and-code-architecture.md): Frontend directory tree and micro-files.
  - [`09-data-import-and-migration.md`](../00-documentation/09-data-import-and-migration.md): [Historical] Retired import pipeline.
  - [`10-testing-and-acceptance-criteria.md`](../00-documentation/10-testing-and-acceptance-criteria.md): Testing strategy and command reference.
  - [`11-deployment-and-operations.md`](../00-documentation/11-deployment-and-operations.md): Vercel and Apps Script clasp deployment runbooks.
  - [`12-implementation-agent-instructions.md`](../00-documentation/12-implementation-agent-instructions.md): Instructions and non-negotiable rules for agents.
  - [`13-glossary-and-architecture-decisions.md`](../00-documentation/13-glossary-and-architecture-decisions.md): Glossary and ADRs.
- **[`01-frontend/`](../01-frontend/)**: Frontend requirements, design tokens, component interactions, and state management.
- **[`02-backend/`](../02-backend/)**: Apps Script project structure, API contracts, business services, and Google Sheets access.
- **[`03-data/`](../03-data/)**: Master spreadsheet schema, entity relationships, data dictionary, financial math, and migration history.
- **[`04-quality-and-operations/`](../04-quality-and-operations/)**: Test strategy, security checklist, deployment runbook, backup, and troubleshooting.
- **[`05-agent-handoff/`](../05-agent-handoff/)**: Durable project state, implementation sequence, coding agent rules, and definition of done.

## 2. Historical Archives in this Directory

The subdirectories below contain historical records from earlier implementation phases:
- `docs/audits/`: Historical post-deployment audits.
- `docs/prelaunch/`: Historical pre-launch schema proposals, field migration maps, and owner decision logs.

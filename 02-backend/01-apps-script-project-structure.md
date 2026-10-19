# 01 — Apps Script Project Structure

## 1. Purpose

Define the Google Apps Script backend's file organization and module responsibilities for the Student Management Dashboard.

The backend serves a separate React + TypeScript frontend, applies business rules, verifies the administrator, and accesses the canonical Google Sheets database. It must remain small enough for one administrator's workload and must not introduce unnecessary frameworks or services.

## 2. Architectural Rules

- Google Apps Script is the only application backend in Version 1.
- Google Sheets is the canonical datastore.
- The frontend must never access the master spreadsheet directly.
- Authentication, authorization, validation, and business calculations run on the server.
- Files are organized by domain and single responsibility.
- Keep each source file under 150 lines; split by responsibility before reaching the limit.
- Do not create catch-all files such as `app.js`, `actions.js`, `utils.js`, or one giant router.
- Apps Script project files use `.gs` for server-side JavaScript and `.html` only when needed for Apps Script HTML templates. The separate React frontend remains in its own project directory.
- Use plain JavaScript compatible with the Apps Script V8 runtime. Do not assume Node.js APIs, npm packages, filesystem access, or browser APIs exist in Apps Script.
- Avoid unnecessary abstractions, dependency injection frameworks, and generic plugin systems.

## 3. Recommended Backend Directory Layout

Apps Script does not provide ordinary nested source directories in its editor. Treat the following as the logical source layout. In the repository, keep the corresponding files in `02-backend/apps-script/` and use the documented filenames; deploy the required files to the Apps Script project through the chosen synchronization workflow.

```text
02-backend/apps-script/
├── api/
│   ├── ApiEntry.gs
│   ├── RequestParser.gs
│   ├── OperationRouter.gs
│   └── ResponseFactory.gs
├── auth/
│   ├── IdentityVerifier.gs
│   ├── AdminAuthorization.gs
│   └── TokenValidation.gs
├── students/
│   ├── StudentHandlers.gs
│   ├── StudentService.gs
│   ├── StudentRepository.gs
│   └── StudentValidation.gs
├── enrollments/
│   ├── EnrollmentHandlers.gs
│   ├── EnrollmentService.gs
│   ├── EnrollmentRepository.gs
│   └── EnrollmentValidation.gs
├── packages/
│   ├── PackageHandlers.gs
│   ├── PackageService.gs
│   ├── PackageRepository.gs
│   └── PackageValidation.gs
├── fees/
│   ├── FeeHandlers.gs
│   ├── FeeService.gs
│   ├── FeeRepository.gs
│   └── FeeValidation.gs
├── payments/
│   ├── PaymentHandlers.gs
│   ├── PaymentService.gs
│   ├── PaymentRepository.gs
│   └── PaymentValidation.gs
├── classes/
│   ├── ClassHandlers.gs
│   ├── ClassService.gs
│   ├── ClassRepository.gs
│   └── ClassValidation.gs
├── meeting-links/
│   ├── MeetingLinkHandlers.gs
│   ├── MeetingLinkService.gs
│   ├── MeetingLinkRepository.gs
│   └── MeetingLinkValidation.gs
├── notes/
│   ├── NoteHandlers.gs
│   ├── NoteService.gs
│   ├── NoteRepository.gs
│   └── NoteValidation.gs
├── imports/
│   ├── ImportHandlers.gs
│   ├── ImportService.gs
│   ├── ImportValidation.gs
│   └── ImportReconciliation.gs
├── audit/
│   ├── AuditService.gs
│   └── AuditRepository.gs
├── sheets/
│   ├── SpreadsheetProvider.gs
│   ├── SheetRegistry.gs
│   ├── HeaderMapper.gs
│   ├── SchemaValidator.gs
│   ├── RowReader.gs
│   ├── RowWriter.gs
│   └── LockManager.gs
├── shared/
│   ├── IdGenerator.gs
│   ├── DateTime.gs
│   ├── Money.gs
│   ├── InputRules.gs
│   └── ErrorCodes.gs
├── config/
│   ├── RuntimeConfig.gs
│   └── SchemaVersion.gs
├── appsscript.json
└── README.md
```

This is a logical organization, not a requirement to simulate directories that Apps Script cannot represent. The repository synchronization/deployment method must preserve unique filenames and a predictable deployment result.

## 4. Module Responsibilities

### 4.1 API layer

- `ApiEntry.gs`: exposes the supported Apps Script web entry point(s) and delegates immediately.
- `RequestParser.gs`: parses and validates the basic request envelope and supported content format.
- `OperationRouter.gs`: maps an allowlisted operation name to one handler.
- `ResponseFactory.gs`: creates the standard success and error response envelopes.

The API layer must not contain student, fee, or package business logic.

### 4.2 Authentication and authorization

- `IdentityVerifier.gs`: verifies identity material using a supported trusted verification method.
- `TokenValidation.gs`: checks token expiry, issuer, audience, and required claims.
- `AdminAuthorization.gs`: checks the verified identity against protected administrator configuration.

Never accept a client-supplied email or `isAdmin` flag as proof of identity. Every protected operation must pass authorization on the server.

### 4.3 Domain handlers and services

Handlers adapt API requests to service calls and format domain results. Services implement business rules and coordinate repository operations. Validation modules validate domain-specific input and relationships. Repositories own persistence and row-to-record mapping.

Handlers must remain thin. Services must not depend on frontend component names or UI state.

### 4.4 Sheets access layer

- `SpreadsheetProvider.gs`: obtains the configured spreadsheet and fails clearly if unavailable.
- `SheetRegistry.gs`: defines canonical tab names and expected headers.
- `HeaderMapper.gs`: maps named headers to row values; never relies solely on fixed column letters.
- `SchemaValidator.gs`: checks required tabs, headers, duplicate headers, and supported schema version.
- `RowReader.gs`: performs batched reads and record mapping.
- `RowWriter.gs`: performs validated writes and updates.
- `LockManager.gs`: provides short, bounded critical sections for operations that need serialization.

Repositories use this layer rather than repeating spreadsheet mechanics.

### 4.5 Shared modules

Shared files must contain narrow, genuinely reusable behavior. For example, `Money.gs` handles currency-safe rounding and amount validation; it must not calculate every fee and package rule. Domain-specific calculations remain in their domain services.

## 5. Request Execution Order

Every protected API request follows this order:

1. Parse the incoming request.
2. Reject an unknown operation.
3. Verify the administrator identity and token claims.
4. Authorize the requested operation.
5. Validate the request schema and values.
6. Invoke the relevant domain handler and service.
7. Check record relationships and business invariants.
8. Perform required reads/writes through repositories.
9. Record an audit event for auditable mutations.
10. Return a standard response envelope.

Failures must be explicit. Do not return a success response when a write or required audit step has failed. Where a multi-record operation cannot be atomic, document the partial-failure and reconciliation behavior.

## 6. Naming and Global Namespace Rules

Apps Script `.gs` files share a global runtime context. Therefore:

- Use distinctive function names grouped by domain, such as `Students_getById` or `Payments_record`.
- Avoid generic global names such as `get`, `save`, `handle`, or `validate`.
- Avoid relying on file order for initialization.
- Do not define duplicate global function or constant names in separate files.
- Keep top-level initialization minimal and side-effect free.
- Pass dependencies explicitly as function arguments where this improves clarity; do not build a framework solely for dependency injection.

## 7. Configuration and Secrets

`RuntimeConfig.gs` reads required non-secret runtime settings from the approved protected configuration source. The master spreadsheet ID, administrator allowlist, expected OAuth audience, and deployment-specific values must not be placed in frontend code or committed as live secrets.

Use Apps Script Properties or another explicitly approved protected configuration mechanism for secrets and deployment settings. Do not store tokens, passwords, or privileged credentials in the `AppConfig` sheet.

Configuration must be validated at request time or through a health check. Missing critical configuration must fail closed.

## 8. Spreadsheet and Concurrency Rules

- Resolve tabs through the canonical registry.
- Validate schema before performing writes.
- Read ranges in batches rather than cell by cell.
- Use header names for mapping.
- Use a lock only around the smallest necessary critical section.
- Re-read critical records after acquiring a lock when stale state could cause an incorrect mutation.
- Always release locks in a `finally` block.
- Do not hold locks while waiting for unrelated external network requests.
- Do not assume Google Sheets supports database transactions.
- For partial multi-record writes, provide a reconciliation path and report the operation outcome honestly.

## 9. Error Handling and Response Contract

All API operations use the common response envelope defined in `06-apps-script-api-specification.md` and `02-backend/02-api-contracts-and-error-handling.md`.

Errors must have a stable machine-readable code and a safe user-facing message. Internal stack traces, token contents, spreadsheet credentials, and unnecessary personal data must not be returned to the browser.

Expected validation and authorization errors should be handled explicitly. Unexpected errors should be logged safely with a correlation/request ID and returned as a generic server error.

## 10. Apps Script Entry Point and Browser Integration

The web app entry point must be minimal and delegate to the API layer. Before building domain features, verify the actual browser-to-Apps-Script transport, redirects, request content types, CORS/preflight behavior, and token handling using a small integration proof.

Do not use JSONP or disable browser security to make private data accessible. If the chosen deployment cannot support the required authenticated request/response flow, stop and resolve the architecture before importing real student data.

## 11. Testing Approach

Keep pure validation and calculation functions separate enough to test with controlled inputs. Test at minimum:

- Request parsing and unknown operations.
- Invalid, expired, and unauthorized identity tokens.
- Required-field and relationship validation.
- Fee and package calculations.
- Duplicate payment submission behavior.
- Schema mismatch and missing tabs.
- Lock release after errors.
- Audit behavior for successful and failed mutations.
- Import duplicate detection and row-level errors.
- The end-to-end browser/API integration.

## 12. Deployment and Synchronization

The Apps Script project is version-controlled in the repository. The selected synchronization method must be documented and reproducible. If `clasp` is selected, document the local project mapping, script ID handling, authentication setup, push/pull commands, and versioned deployment procedure in the deployment documentation.

Never commit user-specific authentication files, local secrets, or production tokens. Keep development and production spreadsheet IDs and deployments separate.

## 13. Definition of Done

The backend structure is ready when:

- All modules follow the defined responsibilities.
- Every source file remains below 150 lines.
- No catch-all files or duplicated global names exist.
- Protected operations enforce server-side authorization.
- All spreadsheet access passes through the shared access layer.
- Domain rules are implemented in services and validated server-side.
- The standard API response contract is used consistently.
- The browser integration proof passes without unsafe workarounds.
- Deployment can be reproduced from the documented repository workflow.

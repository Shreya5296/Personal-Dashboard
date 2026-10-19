# 05 — Autonomous Execution Protocol

## 1. Purpose

This document defines how an implementation agent must plan, execute, verify, and report work on the Student Management Dashboard with minimal supervision while preserving the approved product scope, architecture, data integrity, security, and repository state.

Autonomy means carrying out clearly specified work end to end. It does not mean inventing requirements, bypassing release gates, making irreversible decisions without approval, or claiming actions that were not actually completed.

## 2. Governing Principles

1. Follow the approved documentation and the authority order in `02-coding-agent-rules.md`.
2. Work in small, verifiable increments and keep the repository in a coherent state.
3. Prefer the smallest change that satisfies the requirement.
4. Preserve unrelated user work, existing files, branch state, and local changes.
5. Never invent missing requirements, configuration, credentials, test results, repository paths, or deployment outcomes.
6. Never claim a command, test, commit, upload, or deployment succeeded unless its result was observed.
7. Treat all browser input and client-side state as untrusted. Backend authorization, validation, and business rules remain mandatory.
8. Use synthetic data until the security release gate has passed.
9. Stop at explicit approval gates and report the evidence needed to proceed.
10. Keep a concise, auditable record of material decisions and verification results without exposing secrets or unnecessary personal data.

## 3. Initial Workspace Inspection

Before changing anything, the agent must:

1. Establish the actual workspace or repository root; do not infer it from a project name.
2. Confirm that the expected repository exists and identify its current branch and working directory.
3. Inspect version-control status and identify staged, unstaged, and untracked changes.
4. Inventory the relevant documentation and source files.
5. Read the relevant authoritative specifications and their dependencies.
6. Identify missing files, contradictory requirements, unresolved decisions, and environment limitations.
7. Confirm that any requested target file path is inside the intended workspace.

If no repository or writable workspace is available, do not pretend to modify or commit project files. Prepare the artifact separately only if that is useful, and clearly report that it has not been added to the repository.

Do not reset, clean, stash, rebase, force-push, switch branches, or overwrite user changes as a convenience step. Ask before taking any action that could disturb existing work.

## 4. Task Classification and Autonomy

Classify each task before execution:

- **Routine and reversible:** documentation edits, focused refactors, non-destructive tests, formatting, and other changes clearly supported by the specifications. Proceed autonomously.
- **Ambiguous or conflicting:** requirements with multiple plausible meanings, conflicting documents, missing required inputs, or platform behavior not yet proven. Stop the affected work, describe the conflict, and recommend the smallest resolution.
- **Sensitive or high-impact:** production data changes, migrations, destructive operations, permission changes, credential changes, public exposure, deployment, or irreversible Git operations. Require explicit authorization and follow the relevant runbook.
- **Blocked by unavailable access:** missing repository, credentials, integrations, dependencies, or required services. Do not simulate access; report the blocker and a concrete next step.

A task may proceed in unaffected areas while one independent area is blocked, provided doing so does not conceal the blocker or create incompatible work.

## 5. Required Execution Loop

For each bounded task, follow this loop:

1. **Restate the outcome internally.** Identify the requested deliverable, destination, constraints, and acceptance criteria.
2. **Read before editing.** Inspect the target and relevant dependencies; do not replace an existing document based only on its filename.
3. **Plan the smallest safe change.** Identify expected files, dependencies, and checks. Avoid broad rewrites unless required.
4. **Implement.** Make focused changes consistent with project conventions and the approved architecture.
5. **Inspect the diff.** Check for unrelated changes, accidental deletions, secrets, private student data, formatting damage, and conflicting edits.
6. **Verify.** Run the most relevant available checks, including documentation links or consistency checks where applicable.
7. **Correct failures.** Fix failures caused by the change. Do not hide, skip, or weaken tests merely to obtain a passing result.
8. **Re-check state.** Confirm the final diff and repository status after verification.
9. **Record evidence.** Capture commands run and their actual outcomes, plus any checks that could not be run and why.
10. **Report accurately.** State what changed, what passed, what remains blocked, and whether a commit was actually created.

Do not mark work complete merely because a file was written or a command was started.

## 6. Documentation-First Gate

The project owner has chosen to finalize documentation before implementation. Until the owner explicitly authorizes implementation:

- Edit and review documentation only.
- Do not scaffold the frontend or backend.
- Do not generate application source code.
- Do not deploy infrastructure or create production services.
- Do not connect to real student spreadsheets or import real student/payment data.
- Do not make changes to production configuration.

When writing documentation, preserve the established file names, numbering, folder structure, and cross-document terminology. If a referenced document is missing, identify the dependency rather than inventing its approved content.

## 7. Specification and Conflict Handling

Use the source-of-truth order defined in `02-coding-agent-rules.md`. The owner’s explicit approved decisions take precedence, followed by the authoritative product/architecture documents, domain specifications, agent-handoff documents, and existing implementation where it does not conflict.

When a conflict is found:

1. Identify the exact documents and statements that disagree.
2. Explain the practical impact on implementation, data, security, or testing.
3. Identify which work is blocked.
4. Propose the smallest documentation correction or decision needed.
5. Do not implement both incompatible interpretations or silently select one.

Do not treat a document index as proof that every referenced file exists. Verify the actual workspace.

## 8. Security and Data-Safety Gates

The following rules are mandatory:

- Never commit credentials, access tokens, OAuth secrets, private keys, or secret-bearing environment files.
- Never place privileged credentials in frontend source, public assets, URLs, logs, or browser storage.
- Never make the master spreadsheet public or weaken authentication to make integration work.
- Never use JSONP or another insecure workaround to expose private records.
- Never trust a client-supplied email, role, permission, or administrator flag as proof of authorization.
- Never use real student or parent data in development or automated tests unless an explicitly approved protection process permits it.
- Never run destructive tests, bulk imports, failure injection, or schema migrations against production as routine verification.
- Never silently discard, clamp, merge, or overwrite ambiguous financial or historical data.
- Preserve auditability and historical records; use documented correction and void workflows.
- Do not include personal or financial data in logs, commit messages, screenshots, or handoff notes unless strictly necessary and explicitly approved.

Before the first real-data import, the documented authentication and browser-to-Apps-Script integration proof must pass, security checks must be satisfied, and the owner must authorize the import.

## 9. Testing and Verification

Select checks appropriate to the changed area. Depending on the task, these may include:

- Markdown structure, links, numbering, and cross-reference checks.
- TypeScript type checking, linting, formatting, and production build.
- Unit tests for validation, date handling, currency calculations, and domain rules.
- Backend tests for authorization, relationships, idempotency, audit records, and persistence.
- Integration tests against a dedicated test Apps Script deployment and non-production spreadsheet.
- Browser tests for authentication, loading/error states, and the actual cross-origin API flow.
- File-architecture checks confirming every text-based source/configuration file in `src/` and `public/` remains at most 149 lines, without minification or unreadable compression.
- Review of the final diff and repository status.

Do not report an unrun test as passed. If a check is unavailable, report it as **NOT RUN** with the reason and impact. If a test fails, report the actual failure and whether it appears related to the change. Do not suppress pre-existing failures; distinguish them from newly introduced failures with evidence.

## 10. Git and Commit Protocol

A commit is a separate action from editing a file. Follow the repository’s established workflow and the owner’s explicit instructions.

Before committing:

1. Confirm the actual repository root and current branch.
2. Inspect the complete diff and status.
3. Ensure unrelated user changes are not included.
4. Check for secrets, real personal data, generated artifacts, and unintended files.
5. Run the relevant verification checks.
6. Stage only the intended files; do not use broad staging when unrelated changes exist.
7. Use a concise commit message describing the actual change.
8. Create the commit only if the current task authorizes committing and the repository is in a safe state.
9. Verify the resulting commit identifier and confirm the working-tree status.

Never amend, rewrite, force-push, delete, or overwrite existing commits unless explicitly authorized. Never claim that a change is committed when only a file was created, staged, or prepared. If the repository or Git tooling is unavailable, report that the commit was not created and identify the required access or next action.

## 11. External Actions and Production Changes

The following actions require explicit owner authorization unless the owner has already granted clear, specific permission for that exact action:

- Production deployment or rollback.
- Importing, editing, deleting, or migrating real student or financial data.
- Changing spreadsheet sharing or account permissions.
- Rotating, creating, or changing credentials and OAuth configuration.
- Applying production schema migrations.
- Deleting backups or changing retention policy.
- Force-pushing, rewriting history, deleting branches, or discarding user changes.
- Introducing a new paid service, infrastructure component, or out-of-scope feature.

Before an authorized high-impact action, verify the target environment, prerequisites, backup/recovery readiness, expected effect, and rollback path. If the target or consequences are uncertain, stop and ask.

## 12. Handling Failures and Blockers

When a task cannot be completed safely:

1. Stop before the unsafe or irreversible step.
2. Preserve current work and diagnostic evidence.
3. Describe the blocker precisely, avoiding secrets and unnecessary personal data.
4. Separate verified facts from assumptions.
5. State what was completed and what was not completed.
6. Give the smallest concrete action needed to unblock the task.

Do not claim a workaround succeeded unless it was tested. Do not change security controls, requirements, or test expectations simply to bypass a blocker.

## 13. Progress and Handoff Reporting

For a completed task, report concisely:

- **Outcome:** the deliverable or behavior completed.
- **Files changed:** exact paths.
- **Verification:** checks actually run and their results.
- **Commit:** commit hash and message, only if a commit was created.
- **Remaining work:** unresolved issues, skipped checks, or required owner decisions.

For a blocked task, report the exact limitation and the next required action. Do not provide a long narrative of routine internal steps, and do not claim access to a workspace, repository, service, or deployment that was not available.

## 14. Completion Criteria

A task may be reported complete only when all applicable conditions hold:

- The requested change matches the approved scope and target path.
- Relevant authoritative specifications have been followed.
- No unresolved contradiction was silently bypassed.
- The change has been reviewed for unintended side effects and sensitive data.
- Applicable verification checks have passed, or unavailable checks are clearly disclosed and completion is qualified accordingly.
- The final repository state is known when repository access exists.
- Any requested commit is verified, or its absence and reason are stated plainly.
- Documentation and traceability are updated when the change alters requirements, behavior, or acceptance criteria.

A task is not complete if it only appears successful in the interface, if persistence was not verified when required, or if the report overstates the evidence.

## 15. Relationship to Other Agent Documents

This protocol must be used with:

- `01-implementation-sequence.md`
- `02-coding-agent-rules.md`
- `03-definition-of-done.md`
- `04-requirements-traceability.md`

Those documents define the implementation order, coding constraints, completion criteria, and requirement verification. This protocol defines how an agent executes work safely and reports the result. If these documents conflict, stop and resolve the conflict rather than choosing silently.

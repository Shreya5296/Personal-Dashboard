# 03 — Financial and Class Balance Calculations

## 1. Purpose

This document defines the authoritative calculations for fee obligations, payments, outstanding balances, package class balances, and the effect of class-session outcomes.

The backend is the source of truth for all calculations. The frontend may display calculated values, but it must not independently determine or persist authoritative balances.

## 2. Scope and Related Documents

This document depends on:
- `01-product-requirements.md`
- `02-system-architecture.md`
- `03-security-and-authentication.md`
- `04-google-sheets-data-model.md`
- `05-business-rules-and-workflows.md`
- `06-apps-script-api-specification.md`

The spreadsheet schema in `04-google-sheets-data-model.md` defines the stored fields. This document defines how values derived from those fields are calculated. If a schema cannot represent a rule defined here, the schema must be updated before implementation; the coding agent must not invent a workaround.

## 3. Calculation Principles

1. Calculations use persisted, validated records.
2. Voided financial records do not contribute to balances.
3. Historical transactions are preserved; corrections are auditable.
4. Balances are derived values, not manually editable source fields.
5. Calculations must be deterministic and repeatable.
6. Currency and rounding rules are consistent across the backend and UI.
7. Records belonging to different students must never be combined.
8. All relationships must be validated by IDs, not names.
9. A failed or incomplete write must not be reported as a successful calculation update.
10. The frontend must label derived amounts clearly and refresh them after relevant changes.

## 4. Currency and Numeric Precision

Version 1 uses INR as the default currency.

- Amounts are stored as numeric values, without currency symbols in the cell value.
- Amounts must be finite numbers and must not contain more than two decimal places.
- Display formatting may use the Indian numbering system and the INR symbol.
- Calculations must use integer paise or a consistent decimal-safe strategy internally to avoid floating-point rounding errors.
- A transaction or obligation must not silently change currency during an edit.
- If multiple currencies are introduced later, currency conversion and exchange-rate rules require a separate specification.

## 5. Fee Obligation Calculations

### 5.1 Definition

A fee obligation represents a specific amount charged to a student, such as a package charge or installment. It is not the same as a package record, payment, or enrollment's agreed total.

### 5.2 Eligible Payments

A payment contributes to an obligation only when all of the following are true:
- `payment_status = RECORDED`.
- `fee_obligation_id` matches the obligation's ID.
- `student_id` matches the obligation's student ID.
- `currency` matches the obligation's currency.
- The payment passes validation and has not been voided.

A payment with no obligation reference is not allowed in Version 1. Advance balances and unallocated credits are out of scope unless a future schema and business-rule revision explicitly adds them.

### 5.3 Paid Amount

For a given fee obligation:

`paid_amount = sum(amount of all eligible payments allocated to the obligation)`

The backend must calculate this from the Payments ledger. It must not trust a manually entered paid total.

### 5.4 Outstanding Amount

`outstanding_amount = amount_due - paid_amount`

The backend must prevent ordinary payments from exceeding the outstanding amount. Therefore, for valid, non-voided obligations, the outstanding amount must not be negative.

If a legacy import contains overpayments, the row must be flagged for reconciliation. The importer must not silently clamp or discard the excess amount. The product owner must resolve whether the excess is a data error, a refund, or an unmodeled credit before that record is accepted as reconciled.

### 5.5 Obligation Status

The backend derives the operational status from the obligation and its valid payments:

- `VOID`: obligation has been voided with a reason; it contributes no outstanding balance.
- `PAID`: outstanding amount is zero and the obligation is not void.
- `PARTIALLY_PAID`: paid amount is greater than zero and outstanding amount is greater than zero.
- `OPEN`: paid amount is zero and outstanding amount is greater than zero.

Stored status must be reconciled with this calculation. If the implementation stores status for efficient display, it must update it through the same validated backend operation and provide a reconciliation check. The displayed status must never override the calculated balance.

An obligation with `amount_due = 0` is treated as paid unless voided. Zero-value obligations should be used only when the business purpose is documented.

### 5.6 Due and Overdue

An obligation is overdue when:
- It is not void.
- Its calculated outstanding amount is greater than zero.
- It has a due date.
- The current date in `Asia/Kolkata` is later than the due date.

The due date is inclusive: an obligation due today is not overdue until the next calendar day in `Asia/Kolkata`.

An obligation without a due date can be open or partially paid, but it must not be classified as overdue. The UI should make the missing due date visible to the administrator.

### 5.7 Payment Allocation

Every normal payment must be assigned to one fee obligation at creation time. The backend validates that the obligation exists, is not void, belongs to the same student, uses the same currency, and has sufficient outstanding balance.

Partial payments are allowed. A payment must be greater than zero. A payment cannot be allocated across multiple obligations in Version 1.

If one parent pays multiple obligations together, the administrator records separate allocations whose sum equals the received amount. The UI may make this convenient, but each allocation must be represented as a valid payment against one obligation.

### 5.8 Payment Corrections and Voids

A recorded payment must not be silently deleted or overwritten.

To correct an erroneous payment:
1. Void the original payment with a reason.
2. Preserve the original payment record.
3. Record the action in the audit log.
4. Recalculate the obligation balance.
5. If appropriate, create a corrected payment as a new record.

A voided payment does not contribute to `paid_amount`.

Refunds and chargebacks are not fully modeled in Version 1. They must not be represented by a negative normal payment. If refunds become necessary, add an explicit refund/reversal model and tests before implementation.

## 6. Student-Level Financial Summary

For each student, the dashboard may show:

- Total active amount charged: sum of non-void obligations that are included in the agreed reporting scope.
- Total collected: sum of valid recorded payments in the same reporting scope.
- Total outstanding: sum of calculated outstanding amounts for non-void obligations.
- Overdue amount: sum of outstanding amounts for obligations currently overdue.

The default operational summary includes all non-void obligations associated with the student, including historical enrollments, unless a UI filter explicitly limits the reporting period or enrollment.

The UI must label the scope of a financial total. It must not imply that a historical lifetime total is only for the current package.

Voided obligations and voided payments are excluded from operational totals, but remain accessible in history and audit views.

## 7. Enrollment-Level Financial Summary

For an enrollment:

- `enrollment_agreed_amount` is the stored agreed commercial amount and is not itself a balance.
- `enrollment_charged_amount` is the sum of non-void obligations associated with that enrollment.
- `enrollment_paid_amount` is the sum of eligible payments allocated to those obligations.
- `enrollment_outstanding_amount` is the sum of the outstanding amounts of those obligations.

The system must not assume that the agreed amount equals the sum of obligations. A difference may indicate an installment plan that is incomplete or a data discrepancy. Such differences should be surfaced for review rather than silently reconciled.

Payments or obligations with no enrollment association must be excluded from enrollment totals and included only in the appropriate student-level totals.

## 8. Package Price and Fee Obligations

A package's `package_price` is the commercial price for the package. It is not a payment and does not itself establish that money has been collected.

When a package is purchased, the administrator must create the corresponding fee obligation or obligations according to the agreed fee arrangement. The sum of obligations associated with the package may equal the package price, but the application must not silently create duplicate obligations during import or retries.

The relationship between a package and its fee obligation must be explicit through `package_id` on the obligation. A package with no corresponding obligation must be flagged for review when the package is expected to be billed.

Discounts, scholarships, taxes, late fees, and prorated refunds are not automatically inferred. If they are needed, the agreed commercial amount and charge breakdown must be represented explicitly before implementation.

## 9. Package Class Balance

### 9.1 Definition

A package tracks the number of classes purchased, the number of classes consumed by eligible sessions, and any audited restorations.

The package class balance is calculated as:

`remaining_classes = purchased_classes - net_consumed_classes + approved_credit_adjustments`

where:
- `net_consumed_classes = consumed_classes - credited_back_classes`
- `consumed_classes` is the count of unique eligible sessions linked to the package with `class_credit_effect = CONSUME`.
- `credited_back_classes` is the count of unique valid restoration records with `class_credit_effect = CREDIT_BACK` and a valid, unique `credit_restoration_for_session_id`.

**Explicit, auditable representation of `CREDIT_BACK`:**
- A restoration does not overwrite the original session. The original session preserves its historical record with `class_credit_effect = CONSUME`.
- Each restoration is represented by a distinct, audited record in `ClassSessions` with `class_credit_effect = CREDIT_BACK` and an explicit foreign key link `credit_restoration_for_session_id` referencing the `class_session_id` of the original `CONSUME` session.
- The referenced original session must exist, belong to the same student and package, and have `class_credit_effect = CONSUME`.
- At-most-once restoration rule: A given `credit_restoration_for_session_id` can be referenced at most once across all `CREDIT_BACK` records. The system rejects any attempt to restore the same credit a second time.
- By preserving the original `CONSUME` record (+1 in `consumed_classes`) and linking a separate `CREDIT_BACK` record (+1 in `credited_back_classes`), `net_consumed_classes` decreases by exactly 1, restoring exactly one credit to `remaining_classes`.
- Field population for restoration rows: `class_title` is populated as `"Credit Restoration: " + original_session.class_title` (default `"Credit Restoration"`), `scheduled_start` and `scheduled_end` are both set to the restoration timestamp (zero duration), `actual_start`/`actual_end` remain blank, `session_status = COMPLETED`, `attendance_status = NOT_MARKED`, `meeting_link_id = null`, `completed_at` is set to the restoration timestamp, and `notes` stores the administrative rationale.
- Operational query isolation: Operational scheduling and calendar views (teacher/admin calendars, upcoming classes, "next scheduled class", and attendance queues) MUST filter out `class_credit_effect = CREDIT_BACK` records. They are rendered exclusively in the student package ledger and credit balance audit views.
- Immutability: `CREDIT_BACK` records are terminal; the system rejects any attempt to reschedule, cancel, or re-mark attendance on them.

Version 1 must not permit manual editing of `remaining_classes` as a source field.

If credit adjustments are not implemented as explicit auditable records, `approved_credit_adjustments` is zero and must not be entered as an undocumented number.

### 9.2 Consumed Classes and Version 1 Policy

A session consumes a class only when it satisfies the Version 1 policy and is linked to the relevant package.

The Version 1 class-credit policy is explicit and finalized:

| Session outcome | Class-credit effect |
|---|---|
| `COMPLETED` and attended | Consume one credit (`CONSUME`) when linked to an eligible package |
| `NO_SHOW` | No credit consumed by default (`NO_CONSUME`) |
| `ABSENT` | No credit consumed by default (`NO_CONSUME`) |
| `EXCUSED` | No credit consumed (`NO_CONSUME`) |
| `CANCELLED` | No credit consumed by default (`NO_CONSUME`); late cancellations are treated as `CANCELLED` under this default policy |
| `RESCHEDULED` | No credit consumed by the superseded session (`NO_CONSUME`) |

Rules:
- A `SCHEDULED` session does not consume a class (`class_credit_effect = PENDING`).
- A completed session without an eligible package must not change any package balance (`class_credit_effect = NO_CONSUME`).
- A session cannot consume the same package class more than once.
- A completed session must have a valid package association if it is intended to consume a package class.
- Every `CREDIT_BACK` record must explicitly link to a unique prior `CONSUME` session via `credit_restoration_for_session_id`, and the same credit must never be restored twice.

### 9.3 Completed Sessions

For sessions that count against a package, the system must count unique eligible class-session IDs, not rows or repeated status updates.

Changing a session from scheduled to completed must not create a second consumption entry if the operation is retried.

If a completed session is corrected or reversed, the system must record an audit event and recalculate the balance. It must not erase the historical session.

### 9.4 Balance Validation

The backend must flag a package for review if:
- `purchased_classes` is missing or invalid.
- A session references a nonexistent package.
- A package and session reference different students.
- A package and session reference incompatible enrollments.
- The calculated balance is negative.
- A package is marked exhausted while the calculated balance is positive.
- A package is marked active while the calculated balance is zero, unless the status rules explicitly permit this state.

A negative balance must not be hidden by clamping it to zero. The application must report the discrepancy and preserve the source records for reconciliation.

### 9.5 Package Status

Operational status is determined using the package's dates, cancellation/closure state, and calculated class balance.

- `CANCELLED` and `CLOSED` are explicit terminal administrative states.
- `EXHAUSTED` means the calculated remaining balance is zero and the package is otherwise valid.
- `EXPIRED` means the expiry date has passed in `Asia/Kolkata`, subject to the final expiry policy.
- `ACTIVE` means the package is available for use and has a positive calculated balance, is within its valid dates, and is not cancelled or closed.

If a package can be valid without an expiry date, a blank expiry date means no date-based expiry. It must not be interpreted as expired.

A status stored in Sheets must not override contradictory calculated conditions. The backend should update derived status consistently and surface conflicts for reconciliation.

## 10. One Active Package Per Student

Version 1 supports at most one active class package per student.

Before activating or creating a new package as active, the backend must check for another active package for the same student. If one exists, the operation must be rejected with a clear conflict unless the same operation explicitly closes or exhausts the previous package under an approved workflow.

A student may retain many historical packages. Historical packages must not be deleted or rewritten when a new package is purchased.

A student may have multiple historical enrollments, but must not have more than one active package at a time under this rule.

## 11. Class Session and Package Consistency

For every session intended to consume a package class:
- The student must exist.
- The package must exist and belong to that student.
- The package must be eligible under the final consumption policy.
- If an enrollment is specified, it must be compatible with the package and student.
- The session must have a stable ID.
- The session's consumption effect must be applied at most once.

If a session has no package association, it may remain a scheduled or historical class record, but it must not alter any package balance until explicitly associated through a validated operation.

## 12. Reconciliation

The backend must support a reconciliation check for financial and package data.

Financial checks:
- Recalculate each obligation's paid and outstanding amounts.
- Detect payments referencing missing obligations.
- Detect student or currency mismatches.
- Detect recorded payments that exceed an obligation's allowed balance.
- Detect status values inconsistent with calculated values.
- Detect package prices that do not match the intended charge structure when that structure is documented.

Class checks:
- Recalculate consumed classes from eligible unique sessions.
- Detect sessions referencing missing packages or students.
- Detect negative package balances.
- Detect package statuses inconsistent with the calculated balance.
- Detect duplicate or inconsistent class-consumption effects.

Reconciliation must report discrepancies; it must not automatically destroy records or silently alter financial history. Any repair operation must be explicit, validated, and audited.

## 13. API and UI Requirements

The API must return authoritative calculated values needed by the frontend, including:
- `paid_amount`
- `outstanding_amount`
- `is_overdue`
- `remaining_classes`
- `consumed_classes`
- Derived operational status where applicable

These fields are response values, not client-writable source fields.

The API must reject requests attempting to write calculated fields directly.

The UI must refresh the relevant financial or package summary after:
- Creating or voiding a payment.
- Creating, editing, or voiding an obligation.
- Creating or closing a package.
- Completing, correcting, or cancelling a session when that affects consumption.
- Applying an explicitly supported credit adjustment.

## 14. Error Handling

The backend must return a clear validation or conflict error when:
- A payment exceeds the allowed outstanding balance.
- A payment references a different student's obligation.
- A payment uses a mismatched currency.
- A payment is assigned to a void obligation.
- A second active package would violate the one-active-package rule.
- A class session would consume a class twice.
- A package balance would become negative.
- A record is missing or its relationship is invalid.

A failed operation must not partially update the displayed balance as if it succeeded.

Where Google Sheets cannot guarantee an atomic multi-record operation, the backend must use the integrity and recovery strategy documented in the system architecture and API specification.

## 15. Required Tests

Financial tests must cover:
- No payments against an open obligation.
- One full payment.
- Multiple partial payments.
- Payment voiding and recalculation.
- Obligation voiding.
- Due today versus overdue tomorrow.
- Missing due date.
- Payment over the allowed outstanding amount.
- Payment linked to another student's obligation.
- Currency mismatch.
- Legacy overpayment import and reconciliation.
- Consistency between obligation, enrollment, and student totals.

Class-balance tests must cover:
- Package with no sessions.
- One eligible completed session.
- Multiple eligible completed sessions.
- Scheduled, cancelled, and rescheduled sessions.
- Retried completion requests.
- Duplicate session references.
- Invalid package or student relationship.
- Negative calculated balance.
- Exhausted package.
- Expired package.
- Second active package conflict.
- Historical package retained after a new package is created.
- Finalized policy outcomes: COMPLETED attended session (+1 consumption), NO_SHOW (0 consumed), ABSENT (0 consumed), EXCUSED (0 consumed), CANCELLED (0 consumed), RESCHEDULED (0 consumed).
- CREDIT_BACK restoration linking: Valid CREDIT_BACK referencing a prior CONSUME session restores exactly 1 credit.
- Attempting to restore the same consumed credit twice (duplicate `credit_restoration_for_session_id`) is rejected.
- Attempting to restore a credit referencing a nonexistent session or a session without `CONSUME` is rejected.

## 16. Decisions Required Before Implementation

The no-show, absence, excused-absence, and cancellation policies are finalized in Section 9.2 and Document 05. The following operational policies remain open decisions to be finalized by the product owner:

1. Whether administrators may grant discretionary class credits or waive consumption beyond audited corrections (`approved_credit_adjustments`).
2. Authorization and specific workflow for reversing completed sessions and issuing `CREDIT_BACK` restorations.
3. Whether package expiry prevents use of remaining classes or only flags the package for administrative review.
4. Whether payment corrections are handled exclusively by void-and-recreate in Version 1.

Until these decisions are recorded, the implementation agent must not invent defaults for these cases.

## 17. Completion Criteria

This document is complete when:
- All formulas are implemented server-side.
- No derived balance is editable as a source field.
- Financial records preserve an audit trail.
- Package balances are reproducible from source records.
- The one-active-package-per-student rule is enforced.
- Reconciliation detects inconsistencies without silently changing history.
- All required tests pass.

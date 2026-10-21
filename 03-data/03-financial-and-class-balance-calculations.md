# 03 — Financial and Class Balance Calculations

**Project:** Student Management Dashboard / Personal Dashboard  
**Status:** Authoritative Architecture Specification  
**Version:** 2.0.0 (Finalized Owner Data Model)  
**Canonical Datastore:** One private Google Spreadsheet  
**Companion Schema:** `03-data/01-master-spreadsheet-schema.md`

---

## 1. Purpose & Principles

This document defines the authoritative mathematical and business rules for:
1. **Package Class Credit Balances**: Dynamic derivation of consumed and remaining classes.
2. **Attendance & Cancellation Credit Policies**: Enforcing consumption, preservation, and restoration.
3. **Fee Obligations & Invoicing**: Determining gross amount due, credit applied, and net payable.
4. **Payment Ledger & Overpayment Credits**: Exact matching of bank receipts and forward credit carryover.

### Cardinal Rule: Zero Balance Drift
Balances are never stored as static integer columns that can drift when manual edits occur. They are dynamically derived at runtime from underlying immutable event records (`ClassSessions` and `Payments`).

---

## 2. Package Class Credit Balance Calculations

### 2.1 Dynamic Credit Derivation
For any package $P \in \text{Packages}$ with `classes_purchased`:

$$\text{Net Consumed Classes} = \sum_{S \in \text{ClassSessions}(P)} \mathbb{I}(S.\text{credit\_effect} = \text{`CONSUME'}) - \sum_{R \in \text{ClassSessions}(P)} \mathbb{I}(R.\text{credit\_effect} = \text{`CREDIT\_BACK'})$$

$$\text{Remaining Classes} = \max\left(0, P.\text{classes\_purchased} - \text{Net Consumed Classes}\right)$$

$$\text{Is Exhausted} = (\text{Remaining Classes} \le 0)$$

### 2.2 Attendance & Credit Deduction Rules

| Session Status | Attendance Status | Notice / Waiver Condition | `class_credit_effect` | Credit Impact |
|---|---|---|---|---|
| `COMPLETED` | `ATTENDED` | Class conducted successfully | `CONSUME` | $-1$ credit |
| `NO_SHOW` | `ABSENT` (Unexcused) | Student failed to attend without notice | `CONSUME` | $-1$ credit |
| `COMPLETED` | `EXCUSED` | Excused absence / illness | `NO_CONSUME` | $0$ credits |
| `CANCELLED` | `NOT_MARKED` | Notice given $\ge 4$ hours in advance | `NO_CONSUME` | $0$ credits |
| `CANCELLED` | `NOT_MARKED` | Notice given $< 4$ hours (Late cancellation) | `CONSUME` | $-1$ credit |
| `CANCELLED` | `NOT_MARKED` | Late cancellation with explicit tutor waiver | `NO_CONSUME` | $0$ credits |
| `RESCHEDULED`| `NOT_MARKED` | Rescheduled to new date/time | `NO_CONSUME` | $0$ credits |
| `COMPLETED` | `NOT_MARKED` | Correction restoration record | `CREDIT_BACK` | $+1$ credit |

### 2.3 Single Credit Restoration Safeguard (`CREDIT_BACK`)
- A credit restoration record is an audited correction that increments the student's remaining package balance by 1.
- Mandatory constraint: `credit_restoration_for_session_id` must be populated with the target session's `class_session_id`.
- Uniqueness invariant: The same `class_session_id` can appear at most once as `credit_restoration_for_session_id` across the entire database, preventing double restorations.
- Operational isolation: Operational queries for calendars, upcoming schedules, and attendance mark queues explicitly filter out `class_credit_effect = 'CREDIT_BACK'`.

---

## 3. Financial & Invoicing Calculations

### 3.1 Fee Obligation Net Due
For any invoice $F \in \text{FeeObligations}$:

$$\text{Net Amount Payable} = \max\left(0, F.\text{amount\_due} - F.\text{credit\_applied}\right)$$

Where:
- `amount_due`: Gross tuition or package demand before applying discounts or advance credits.
- `credit_applied`: Advance or overpayment credit absorbed by this invoice.

### 3.2 Paid Amount & Outstanding Balance
From the non-void payments referencing $F$:

$$\text{Raw Payments Total} = \sum_{P \in \text{Payments}(F), P.\text{status} \ne \text{`VOID'}} P.\text{amount}$$

$$\text{Paid Amount} = \min\left(\text{Net Amount Payable}, \text{Raw Payments Total}\right)$$

$$\text{Outstanding Balance} = \max\left(0, \text{Net Amount Payable} - \text{Paid Amount}\right)$$

### 3.3 Obligation Status Derivation
- If $F.\text{obligation\_status} = \text{`VOID'}$, status is `VOID`.
- Else if $\text{Outstanding Balance} = 0$, status is `PAID`.
- Else if $\text{Paid Amount} > 0$, status is `PARTIALLY_PAID`.
- Else status is `OPEN`.

---

## 4. Payment Overpayments & Unapplied Credit Ledger

### 4.1 Strict Ledger Integrity
Tutoring parents occasionally overpay (e.g. paying ₹6,000 via UPI on a ₹5,000 monthly invoice). 
- In the `Payments` table, `amount` is stored as the exact cash received (`6000.00`) to guarantee 100% reconciliation against bank statements.
- On the target invoice $F_1$, `paid_amount` is capped at its net payable (`5000.00`).
- The remaining ₹1,000 is held as unapplied credit for that student.

### 4.2 Available Credit Derivation
For a given student $S$ in currency $C$:

$$\text{Total Paid} = \sum_{P \in \text{Payments}(S, C), P.\text{status} \ne \text{`VOID'}} P.\text{amount}$$

$$\text{Total Billed} = \sum_{F \in \text{FeeObligations}(S, C), F.\text{status} \ne \text{`VOID'}} F.\text{amount\_due}$$

$$\text{Available Unapplied Credit} = \max\left(0, \text{Total Paid} - \text{Total Billed}\right)$$

### 4.3 Applying Available Credit to Subsequent Invoices
When the administrator generates a new fee obligation $F_2$ (e.g. for Month 2 tuition of ₹5,000):
1. The UI displays the student's available unapplied credit (₹1,000).
2. The administrator applies the credit:
   - $F_2.\text{amount\_due} = 5000.00$
   - $F_2.\text{credit\_applied} = 1000.00$
   - $F_2.\text{net\_payable} = 4000.00$
3. When the parent pays the net ₹4,000, $F_2$ is fully settled (`paid_amount = 4000`, `outstanding = 0`, status `PAID`).
4. Total cash paid across both months equals ₹10,000, total billed equals ₹10,000, and available unapplied credit returns to ₹0.00 with zero double counting.

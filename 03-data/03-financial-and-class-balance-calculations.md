# 03 — Financial and Class Balance Calculations

**Project:** Student Management Dashboard / Personal Dashboard  
**Status:** Authoritative Architecture Specification  
**Version:** 3.0.0 (Finalized Owner 6-Table Schema)  
**Canonical Datastore:** One private Google Spreadsheet  
**Companion Schema:** `03-data/01-master-spreadsheet-schema.md`

---

## 1. Purpose & Principles

This document defines the authoritative mathematical and business rules for:
1. **Package Class Credit Balances**: Dynamic derivation of consumed and remaining classes.
2. **Attendance & Deduction Rules**: Enforcing the boolean `deduct_class` flag across sessions.
3. **Payment Details & Currency Handling**: Tracking receipts in original currency and manual `in_inr`.
4. **Student Financial Balances**: Deriving total billed and total paid balances.

### Cardinal Rule: Zero Balance Drift
Balances are never stored as static integer columns that can drift when manual edits occur. They are dynamically derived at runtime from underlying immutable event records (`ClassSessions` and `Payments`).

---

## 2. Package Class Credit Balance Calculations

### 2.1 Dynamic Credit Derivation
For any student $S$:
$$\text{Total Consumed Classes}(S) = \sum_{C \in \text{ClassSessions}(S)} \mathbb{I}(C.\text{deduct\_class} = \text{`TRUE'})$$

For each package $P \in \text{Packages}(S)$ ordered FIFO by `start_date`:
$$\text{Allocated Consumed}(P) = \min\left(\text{Remaining Consumed}, P.\text{classes\_purchased}\right)$$
$$\text{Remaining Consumed} \leftarrow \text{Remaining Consumed} - \text{Allocated Consumed}(P)$$
$$\text{Remaining Classes}(P) = \max\left(0, P.\text{classes\_purchased} - \text{Allocated Consumed}(P)\right)$$
$$\text{Is Exhausted}(P) = (\text{Remaining Classes}(P) \le 0)$$

### 2.2 Attendance & Deduction Rules
In `ClassSessions`, class consumption is governed by the boolean column `deduct_class`:

| Attendance Status | Session Status | Rule | `deduct_class` |
|---|---|---|---|
| `ATTENDED` / `PRESENT` | `COMPLETED` | Conducted session automatically consumes 1 credit | `TRUE` |
| `ABSENT` | `COMPLETED` / `NO_SHOW` | Owner specifies whether to deduct (default false unless unexcused) | `TRUE` / `FALSE` |
| `NOT_MARKED` | `SCHEDULED` | Unmarked session does not consume credit | `FALSE` |
| `CANCELLED` | `CANCELLED` | Does not automatically deduct (unless explicitly applied by owner) | `FALSE` (or `TRUE` if late penalty applied) |

---

## 3. Financial & Payment Details Calculations

### 3.1 Payment Details (Physical Sheet: `Payments`)
- `student_id`: Student receiving credit.
- `payment_date`: Date received (`YYYY-MM-DD`).
- `amount`: Numeric value in original transaction currency.
- `currency`: Currency code (`INR`, `USD`, `GBP`).
- `in_inr`: Numeric equivalent in Indian Rupees.
  - **Invariant:** `in_inr` is entered manually and must **never** be overwritten by automated exchange rate conversions.

### 3.2 Total Paid & Financial Balance
For a student $S$:
$$\text{Total Paid}(S) = \sum_{P \in \text{Payments}(S)} P.\text{amount}$$
$$\text{Total Agreed Packages}(S) = \sum_{P \in \text{Packages}(S)} P.\text{package\_price}$$
$$\text{Outstanding Balance}(S) = \max\left(0, \text{Total Agreed Packages}(S) - \text{Total Paid}(S)\right)$$
$$\text{Unapplied / Advance Credit}(S) = \max\left(0, \text{Total Paid}(S) - \text{Total Agreed Packages}(S)\right)$$

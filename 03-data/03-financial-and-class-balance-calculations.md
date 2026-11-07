# 03 Data — 03 Financial and Class Balance Calculations

## 1. Document Control

- **Product:** Personal Dashboard (Student Management Dashboard)
- **Document ID:** Data-03
- **Status:** Authoritative Calculations Specification
- **Version:** 4.0.0 (Strict Six-Table Architecture)

---

## 2. Dynamic Class Balance Calculations

Class balances are **derived dynamically** on read by combining `Packages` and `ClassSessions`. There are no stored running balance columns in Google Sheets.

### 2.1 Formula Definitions
1. **Purchased Classes:**
   $$\text{Purchased} = \text{Packages.classes\_purchased}$$
2. **Consumed Classes:**
   $$\text{Consumed} = \sum_{\substack{s \in \text{ClassSessions} \\ s.\text{student\_id} = \text{student} \\ s.\text{deduct\_class} = \text{TRUE}}} 1$$
3. **Remaining Classes:**
   $$\text{Remaining} = \max(0, \text{Purchased} - \text{Consumed})$$
4. **Exhausted Status:**
   $$\text{is\_exhausted} = (\text{Remaining} \le 0)$$

### 2.2 Attendance State Effects
| Attendance State | Session Status | Default `deduct_class` | Effect on Package Balance |
|---|---|---|---|
| `PRESENT` / `ATTENDED` | `COMPLETED` | `TRUE` | Consumes 1 class credit |
| `NOT_MARKED` | `SCHEDULED` | `FALSE` | Credit is not consumed |
| `ABSENT` / `NO_SHOW` (Unexcused) | `COMPLETED` | `TRUE` (if applied by admin) | Consumes 1 class credit |
| `ABSENT` (Excused) | `COMPLETED` | `FALSE` | Credit is not consumed |
| `CANCELLED` ($< 4$h notice, unexcused) | `CANCELLED` | `TRUE` | Consumes 1 class credit |
| `CANCELLED` ($\ge 4$h notice or waived) | `CANCELLED` | `FALSE` | Credit preserved; replacement auto-scheduled |

---

## 3. Financial Calculations & Multi-Currency Rules

### 3.1 Financial Summary Metrics (`ReportService.gs`)
The financial dashboard calculates three primary metrics across all students:

1. **Total Invoiced Value:**
   $$\text{Total Invoiced} = \sum_{p \in \text{Packages}} \text{INR\_Value}(p)$$
   - If `currency === 'INR'`, $\text{INR\_Value} = p.\text{package\_price}$.
   - If foreign currency, uses manual `in_inr` if present; otherwise matches student payments in INR; otherwise 0.
2. **Collected Earnings:**
   $$\text{Total Collected} = \sum_{\substack{m \in \text{Payments} \\ m.\text{status} \ne \text{VOID}}} \text{INR\_Value}(m)$$
   - If `currency === 'INR'`, $\text{INR\_Value} = m.\text{amount}$.
   - If foreign currency with valid manual `in_inr` ($> 0$), $\text{INR\_Value} = m.\text{in\_inr}$.
   - If foreign currency without manual `in_inr`, $\text{INR\_Value} = 0$.
3. **Total Outstanding Balance:**
   $$\text{Total Outstanding} = \sum_{\text{student}} \max(0, \text{Billed}_{\text{student}} - \text{Paid}_{\text{student}})$$

### 3.2 Debtor Balance Insulation
Debts and overpayments are isolated per student:
- If Student A has paid ₹10,000 against a ₹6,000 package (overpayment of ₹4,000), their outstanding balance is ₹0.
- Student A's surplus **does not offset** Student B's unpaid balance of ₹5,000.
- Total outstanding balance reflects the true sum of all uncollected debts across students:
  $$\text{Total Outstanding} = \sum_{\text{student}} \max(0, \text{Outstanding}_{\text{student}})$$

### 3.3 Strict Currency Insulation
- Foreign payments retain original currency (`USD`, `EUR`, `GBP`) in `Payments.currency`.
- Foreign currency amounts are **never** added directly to INR totals.
- No automated external exchange-rate APIs are called. Only manually entered `in_inr` values are used for conversion.

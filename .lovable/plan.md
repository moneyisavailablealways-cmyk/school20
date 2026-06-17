## Bursar Portal Redesign Plan

Transform the Bursar Portal into one unified Finance Workspace with no duplicated pages, clean workflow, and dynamic Learner/Student terminology.

---

### 1. Consolidate navigation (BursarLayout)

Collapse the sidebar to 4 top-level destinations — everything finance lives inside a single workspace:

- **Dashboard** (`/bursar`)
- **Finance Workspace** (`/bursar/finance`) — tabbed (replaces Fees Management + Salary Management + Reports)
- **Appointments** (`/bursar/appointments`)
- **Profile** (`/bursar/profile`)

Remove redundant sidebar entries (`Fees Management`, `Salary Management`, `Reports`) — they become tabs.

### 2. One Finance Workspace with 8 tabs

Replace `src/pages/bursar/FeesManagement.tsx` with `FinanceWorkspace.tsx`:

```
Dashboard │ Fee Structures │ Invoices │ Payments │ Accounts │ Adjustments │ Report Card Footer │ Reports
```

- **Dashboard** — reuses `FinanceDashboard` extended with: Total Expected, Collected, Outstanding, Net Income, Salary Expenses, Collection Rate %, Defaulters count, Recent Transactions. Each card is a link to its tab with a filter applied (`?status=defaulters` etc.).
- **Fee Structures** — master source (existing `FeeStructures.tsx`).
- **Invoices** — bulk + single + regenerate, pulls from Fee Structures × Year × Term × Class (existing `Invoices.tsx` + `CreateInvoice.tsx` flow surfaced inline).
- **Payments** — existing `Payments.tsx`; payment insert already triggers `update_invoice_balance` → balances/dashboard auto-update.
- **Accounts** — central per-learner page (existing `StudentAccounts.tsx`) with row-level quick actions: Add Payment, Generate Invoice, Apply Discount, View Statement, Print Receipt.
- **Adjustments (Scholarships / Bursaries / Waivers / Discounts)** — merge into existing `Scholarships.tsx` with a `type` selector. No new page.
- **Report Card Footer** — existing `ReportCardFees.tsx`, auto-pulls outstanding balance via `calculate_student_fees_balance` (already exists). Remove any manual fee-entry duplication.
- **Reports** — existing `Reports.tsx` (collection trends, defaulters export, salary expense).

Salary Management becomes a sub-section inside Reports tab (or its own tab "Salaries") — keep one entry point, not a sidebar item.

### 3. Defaulters quick view

Inside Accounts tab, add a "Defaulters" filter chip that shows only `balance > 0` past due-date, with bulk actions: Send Reminder, Email, SMS, Print List. Reuses existing `fee_reminders` table and `send-fee-reminders` edge function.

### 4. Dynamic terminology (Learner vs Student)

Use existing `useSchoolLevel` hook in `BursarLayout`, `FinanceWorkspace`, `StudentAccounts`, `Invoices`, `Payments`, `ReportCardFees`. Add a tiny helper `useTermLabel()` returning `{ singular, plural }` → "Learner/Learners" for primary, "Student/Students" for secondary. Swap all hard-coded "Student" labels in bursar pages.

### 5. Database audit (read-only first)

No schema changes proposed in this plan — current tables already model the workflow correctly:

```
fee_structures ──┐
                 ├──► invoices ──► invoice_items
academic_years ──┤        │
classes ─────────┘        ├──► payments (trigger updates balance/status)
                          │
student_scholarships ◄────┘
                          │
student_fee_overrides ◄───┘ (report card footer)
```

`calculate_student_fees_balance(student, year, term)` already returns the single source of truth used by report cards, dashboard, accounts, and footer.

If the audit during implementation surfaces a missing FK or redundancy, I'll propose a migration before touching code.

### 6. Files

**New**
- `src/pages/bursar/FinanceWorkspace.tsx` — unified tabbed workspace
- `src/hooks/useTermLabel.ts` — Learner/Student helper

**Modified**
- `src/components/BursarLayout.tsx` — collapsed nav
- `src/App.tsx` — route `/bursar/finance` → FinanceWorkspace; keep legacy routes redirecting
- `src/pages/bursar/FinanceDashboard.tsx` — add Net Income, Salary Expenses, Collection %, Defaulters, Recent Transactions, click-through links
- `src/pages/bursar/StudentAccounts.tsx` — Defaulters filter, row quick actions, dynamic label
- `src/pages/bursar/Scholarships.tsx` — add `type` filter (Scholarship/Bursary/Waiver/Discount) → single Adjustments tab
- `src/pages/bursar/ReportCardFees.tsx` — wire to `calculate_student_fees_balance`, remove manual duplication
- `src/pages/bursar/Invoices.tsx`, `Payments.tsx` — dynamic Learner/Student labels

**Deleted (replaced by tabs)**
- `src/pages/bursar/FeesManagement.tsx` (replaced by FinanceWorkspace)
- Sidebar entry for `SalaryManagement` (page kept, accessed via tab)

### 7. Acceptance check
- One sidebar entry per concept; no duplicated finance pages
- Payment insert → balance/dashboard/footer update with no manual sync (already wired via trigger)
- Primary schools show "Learner(s)", Secondary show "Student(s)" everywhere in Bursar
- All dashboard cards link to filtered records

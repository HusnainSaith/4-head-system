# Poultry ERP Complete Page, Money, Stock, and Account Flow Guide

This guide describes the current system implemented in the backend and frontend. Part I explains every page and accounting rule. Part II is a practical, numbered test script using example amounts. It tells the tester where to enter an amount, where it must be added, where it must be subtracted, and what must remain unchanged.

> **Start practical testing here:** [Part II — Complete Step-by-Step System Testing Guide](#part-ii--complete-step-by-step-system-testing-guide). Each test uses the format **Open page → Click action → Enter values → Expected additions → Expected deductions → Validation**.

## Practical testing index

| Feature/page | Step-by-step test |
|---|---|
| Starting balances | [Test preparation](#27-test-preparation-and-starting-balances) |
| Login, password, roles, access | [Authentication and access](#28-authentication-and-access-testing) |
| Owner and department dashboards | [Dashboard](#29-dashboard-testing) |
| Users, Roles, and Parties setup | [Master data](#30-master-data-setup-for-transaction-tests) |
| Brokerage Purchases | [Brokerage purchases](#31-testing-brokerage-purchases) |
| Brokerage Sales | [Brokerage sales](#32-testing-brokerage-sales) |
| Brokerage Stock and P&L | [Brokerage stock/report](#33-testing-brokerage-stock-and-report) |
| Supply Purchases and Sales | [Supply purchases/sales](#34-testing-supply-purchases-and-sales) |
| Supply → Shop transfer and settlement | [Internal transfer](#35-testing-supply-internal-transfer-and-settlement) |
| Supply Stock and P&L | [Supply stock/reports](#36-testing-supply-stock-and-reports) |
| Wastage Purchases, Sales, Stock, P&L | [Wastage](#37-testing-wastage-flow) |
| Shop Incoming, Dressing, Sales, Stock, P&L | [Fresh Chicken Shop](#38-testing-fresh-chicken-shop-flow) |
| Party receipts and payments | [Party statements](#39-testing-party-receipts-and-payments) |
| Vehicles, Fuel, Maintenance | [Vehicles](#40-testing-vehicles-fuel-and-maintenance) |
| Employees, Advances, Bonuses, Payroll | [Employees and payroll](#41-testing-employees-advances-bonuses-and-payroll) |
| Expenses | [Manual expenses](#42-testing-manual-expenses) |
| Cash, Bank, and statements | [Cash & Bank](#43-testing-cash--bank-pages) |
| Normal Investor | [Normal investor](#44-testing-a-normal-investor) |
| Shafique/Brother | [Shafique account](#45-testing-shafiquebrother-account) |
| Investor profit periods | [Profit periods](#46-testing-investor-profit-period-backend-flow) |
| Committees | [Committees](#47-testing-committees) |
| Zakat and Funds | [Zakat & Funds](#48-testing-zakat--funds) |
| Invoices and Notifications | [Invoices/notifications](#49-testing-invoices-and-notifications) |
| All six Reports pages | [Reports](#50-testing-all-reports) |
| Redirects, Back, Refresh, unknown pages | [Navigation](#51-testing-redirects-navigation-controls-refresh-and-back) |
| All ending calculations | [Final reconciliation](#52-final-complete-reconciliation) |

For the quickest answer to “where is an amount added or subtracted?”, use [Complete amount movement quick reference](#24-complete-amount-movement-quick-reference). For exact example values and rejected-transaction checks, use the linked practical test above.

## 1. The four balances must not be confused

The ERP tracks different kinds of balances. The same transaction can increase one balance and decrease another.

| Balance | Meaning | Increase example | Decrease example |
|---|---|---|---|
| Cash or bank | Money physically available in a selected drawer/account | Cash sale, investor deposit, customer receipt | Purchase payment, expense, salary, investor withdrawal |
| Party balance | Money owed by or to a party | Credit sale creates receivable | Customer receipt reduces receivable |
| Stock balance | Physical chicken quantity and weighted average cost (WAC) | Purchase or incoming transfer | Sale, transfer out, shrinkage/write-off |
| Profit/loss | Income minus COGS, operating expenses, and payroll | External sale revenue | Purchase/COGS, expense, payroll |

Important: an investor deposit increases department cash/bank, but it does **not** increase sales revenue or profit. It creates an equal investor-capital liability payable by the business.

## 2. Sign and calculation rules

### Cash and bank

`Current balance = opening balance + money in - money out`

- A debit to Cash/Bank means money comes in and the balance increases.
- A credit to Cash/Bank means money goes out and the balance decreases.
- Cash transactions must select the cash drawer for the same department.
- Bank transactions select a bank account and a method: cheque or mobile app.

### Party statements

`Party balance = debits - credits`

- Positive balance: party owes the business (receivable).
- Negative balance: business owes the party (payable).
- Credit sale increases a receivable.
- Credit purchase increases a payable.
- Receipt from a party reduces receivable.
- Payment to a party reduces payable.

### Stock

- Purchase/incoming transfer: quantity increases.
- Sale/outgoing transfer/write-off: quantity decreases.
- WAC is recalculated for incoming stock.
- A sale cannot exceed available stock.
- A write-off cannot exceed available stock.

### Profit and loss

Consolidated net profit is calculated as:

`External revenue + other income - COGS - operating expenses - payroll`

Internal department transfer revenue is shown separately and excluded from consolidated external revenue to prevent double counting.

## 3. Access and role flow

| Role | Main access |
|---|---|
| Owner | All pages, Users, Roles, financial management, and reports |
| Accountant | All management and financial pages except owner-only Users and Roles |
| Department staff | Assigned department, its parties, vehicles, employees, and expenses |
| Other limited roles | Dashboard or permissions explicitly assigned by the owner |

Department staff are restricted to their assigned department. Owner and Accountant can work across departments.

## 4. Authentication pages

### Sign in — `/login`

- Enter credentials to obtain an authenticated session.
- The logged-in role and department control visible navigation and API access.
- No money, party, stock, or profit balance changes.

### Forgot password — `/forgot-password`

- Requests a password-reset flow.
- No financial effect.

### Reset password — `/reset-password`

- Sets the new password using a valid reset token.
- No financial effect.

## 5. Dashboard — `/`

### Owner/Accountant dashboard

Shows:

- External revenue.
- Consolidated net profit.
- Current stock across departments.
- Total receivable from parties.
- Total payable to parties.
- Stock by department.
- Per-department revenue and gross profit.
- Links to operational pages and reports.

This page is read-only. Values originate from posted department transactions, ledger entries, expenses, payroll, and stock balances.

### Department dashboard

Shows only the assigned department:

- Current stock.
- Total receivable.
- Total payable.
- Quick link to the department entry pages.

The “today's purchases and sales” block is currently a placeholder and does not calculate a value.

## 6. Brokerage

### Brokerage Purchases — `/brokerage/purchases`

Use **Record purchase** to buy chicken from a Farm or Broker party.

Inputs include party, quantity, rate/kg, amount paid, payment method/account, date, vehicle, and description.

`Purchase total = quantity × rate/kg`

| Entry | Added/increased | Minus/decreased | No immediate change |
|---|---|---|---|
| Fully paid cash/bank purchase | Brokerage stock; Brokerage COGS | Selected Brokerage cash/bank by full total | Party payable |
| Partially paid purchase | Brokerage stock; COGS; remaining farm/broker payable | Cash/bank by entered amount | — |
| Fully credit purchase | Brokerage stock; COGS; full party payable | No cash/bank | — |

The outstanding formula is:

`Payable = total - amount paid`

The party statement shows the unpaid amount as **Business owes party**.

Cancellation:

- Reverses purchase ledger entries.
- Reverses stock received.
- Marks the purchase cancelled rather than silently deleting history.
- A purchase linked to an active/settled investment assignment must have that assignment cancelled first.

### Brokerage Sales — `/brokerage/sales`

Use **Record sale** to sell to a Customer or Broker party, or choose Supply department as an automatic internal destination.

`Sale total = quantity × sale rate/kg`

`Commission/margin per kg = sale rate - current Brokerage WAC`

| Entry | Added/increased | Minus/decreased |
|---|---|---|
| Fully paid external sale | Cash/bank; external revenue | Brokerage stock |
| Partial external sale | Cash/bank by amount received; party receivable by remainder; revenue by full total | Brokerage stock |
| Full credit external sale | Party receivable; revenue | Brokerage stock |

`Receivable = total - amount received`

#### Brokerage sale to Supply

Saving one transaction automatically creates both sides:

- Brokerage stock decreases.
- Brokerage records sale/revenue and a Supply internal party balance.
- Supply stock increases at the same quantity/rate.
- Supply receives an automatically generated purchase linked to the Brokerage sale.
- Cash/bank changes only if an actual settled amount is entered.
- Cancel the source Brokerage sale to reverse both the Brokerage and generated Supply sides.

### Brokerage Stock — `/brokerage/stock`

Shows quantity and WAC. Missing seeded balance rows are safely initialized at zero.

Use **Add Shrinkage** for dead/lost/damaged quantity:

- Stock quantity decreases.
- Write-off valuation uses current WAC.
- Operating expense increases by the valuation.
- Inventory value decreases.
- Cash/bank does not change because no payment occurs at write-off time.

### Brokerage Reports — `/brokerage/reports/profit-loss`

Read-only date-filtered totals for payable, receivable, revenue, COGS, operating expenses, payroll, and net profit.

- Purchases affect COGS.
- Sales affect revenue.
- Expenses/write-offs affect operating expense.
- Payroll affects payroll expense.
- Investor deposits and withdrawals do not count as profit or loss.

## 7. Supply

### Supply Purchases — `/supply/purchases`

Use **Record purchase** to buy from a Broker party.

- Stock increases by quantity.
- COGS/purchase cost increases by total.
- Paid amount decreases selected Supply cash/bank.
- Unpaid amount increases payable to the Broker party.
- Partial payment splits the same total between cash/bank and payable.
- Posted purchases cannot be overwritten; cancel and recreate.

An automatically generated purchase from Brokerage cannot be cancelled here. Cancel its source Brokerage sale.

### Supply External Sales — `/supply/sales`

Use **Record sale** to sell to a Shop Owner party.

- Stock decreases.
- Revenue increases by full sale total.
- Cash/bank increases by amount received.
- Remaining amount increases customer/shop-owner receivable.
- Sale is rejected if quantity exceeds Supply stock.
- Posted sale corrections use cancel and recreate.

### Supply Internal Transfers — `/supply/internal-transfers`

Use **New Internal Transfer** to send live stock from Supply to Fresh Chicken Shop.

On creation:

- Supply stock decreases.
- Shop live stock increases.
- Supply records internal revenue and a receivable from the Shop internal party.
- Shop records inventory and a payable to the Supply internal party.
- No cash/bank changes during the stock transfer itself.

Use **Settle Internal Transfer** when Shop pays Supply:

- Selected Supply cash/bank increases by settlement amount.
- Supply receivable from Shop decreases by the same amount.
- The transfer becomes partially settled or settled.
- Settlement cannot exceed remaining balance.

### Supply Stock — `/supply/stock`

Shows current quantity and WAC. **Add Shrinkage** decreases stock and inventory value and increases operating expense. It does not directly move cash.

### Supply Reports — `/supply/reports/profit-loss`

Shows:

- External-sales-only view.
- View including internal transfers.
- Revenue, COGS, expenses, payroll, and net profit.

Use the external-only view for consolidated business profit to avoid counting the same product twice inside the business.

## 8. Wastage

### Wastage Purchases — `/wastage/purchases`

Use **Record purchase** to buy wastage stock from a Shop Owner party.

- Wastage stock increases.
- Purchase/COGS increases.
- Paid amount decreases selected Wastage cash/bank.
- Unpaid remainder increases payable to the Shop Owner.
- Partial payment is supported.

### Wastage Sales — `/wastage/sales`

Use **Record sale** to sell wastage stock to a Factory party.

- Wastage stock decreases.
- Revenue increases by sale total.
- Received amount increases cash/bank.
- Unreceived remainder increases Factory receivable.
- Sale cannot exceed available stock.

### Wastage Stock — `/wastage/stock`

Shows quantity and WAC. **Add Shrinkage** decreases stock and records an operating expense at current WAC. No cash moves.

### Wastage Reports — `/wastage/reports/profit-loss`

Read-only date-filtered revenue, COGS, expenses, payroll, gross profit, and net profit.

## 9. Fresh Chicken Shop

### Incoming Transfers — `/shop/incoming-transfers`

Shows live-stock transfers received from Supply.

- Transfer creation is performed on Supply → Internal Transfers.
- This page is a receiving/history view.
- The transfer has already increased Shop live stock and Shop payable.
- No second amount should be entered here.

### Dressing Batches — `/shop/dressing-batches`

Converts live chicken into dressed chicken.

Inputs: live weight, dressed weight, batch date, and notes.

- Live stock decreases by live weight.
- Dressed stock increases by dressed weight.
- Dressed cost is derived from live WAC.
- Shrinkage is `live weight - dressed weight`.
- Processing loss increases operating expense and reduces inventory value.
- Dressed weight cannot exceed live weight.
- Cash/bank does not change.
- Posted quantities/date are immutable; reverse/delete an unconsumed batch and recreate.

### Shop Sales — `/shop/sales`

Sells dressed stock to a Customer.

- Dressed stock decreases.
- Revenue increases by full total.
- COGS increases by `quantity × dressed WAC`.
- Cash/bank increases by amount received.
- Remaining balance increases customer receivable.
- Profit margin per kg is `sale rate - WAC at sale`.

### Shop Stock — `/shop/stock`

Shows separate Live and Dressed quantities/WAC.

Write-off flow:

- Select Live or Dressed stock.
- Quantity decreases from that stock type.
- Operating expense increases by WAC valuation.
- No cash/bank movement.

### Shop Reports — `/shop/reports/profit-loss`

Shows Shop revenue, COGS, operating expense including processing loss, payroll, and net profit.

## 10. Parties

### Parties list — `/parties`

Functions:

- Search by name.
- Filter by party type and department.
- Create/edit a party.
- Link the party to allowed departments.
- Set the primary department.
- Open a party statement.

Party types include Customer, Farm, Broker, Shop Owner, Factory, Investor, internal department, and other configured types.

Creating a user does not by itself create a party account. Create/link the party record and then create an Investor account when appropriate.

#### Opening balance

- Positive opening balance: party owes business; receivable increases.
- Negative opening balance: business owes party; payable increases.
- Zero: no financial opening entry.
- Opening balance does not add or remove physical cash.

### Party statement — `/parties/:id`

Shows every debit/credit and running balance by department.

Use **Record receipt** when the party pays the business:

- Selected cash/bank increases.
- Party receivable decreases.

Use **Record payment** when the business pays the party:

- Party payable decreases.
- Selected cash/bank decreases.

Payments cannot exceed the valid outstanding direction/balance. Inter-department parties create mirrored entries so both department statements remain synchronized.

## 11. Vehicles

### Vehicles list — `/vehicles`

- Create and assign a vehicle to a department.
- Assign an eligible Driver user.
- Edit vehicle details.
- Deactivate rather than erase operational history.
- Creating/editing a vehicle has no financial effect.

### Vehicle details — `/vehicles/:id`

Shows master details and links to that vehicle's fuel and maintenance history. No direct financial entry.

### Fuel logs — `/vehicles/fuel-logs` and `/vehicles/:id/fuel-logs`

`Fuel cost = liters × rate/liter`

- Creates a Vehicle Fuel operating expense in the vehicle's department.
- Decreases the cash ledger offset by the calculated cost.
- Increases expense reports/P&L expense.
- Updating/deleting a posted source log should be handled carefully because the generated expense/ledger history is the accounting record.

### Maintenance logs — `/vehicles/maintenance-logs` and `/vehicles/:id/maintenance-logs`

- Creates a Vehicle Maintenance operating expense in the vehicle's department.
- Decreases the cash ledger offset by maintenance cost.
- Increases operating expenses.

Current implementation note: vehicle-generated system expenses post to the general cash ledger but do not select a specific cash-drawer ID. They affect accounting/P&L, but drawer-level statements cannot attribute them to one drawer.

## 12. Employees and Payroll

### Employees list — `/employees`

- Creates an employee profile linked to an active EMPLOYEE-role user in the same department.
- Stores salary/employment details.
- Activation/deactivation has no immediate financial effect.

### Employee detail — `/employees/:id`

Shows advances, bonuses, and salary account.

The dedicated routes `/employees/:id/advances` and `/employees/:id/bonuses` open the same employee workflow focused on those record types. Their financial rules are the advance and bonus rules below.

#### Record advance

Creating an advance starts it as pending and does not move cash.

Confirming advance payment:

- Employee advance asset increases.
- Selected department cash/bank decreases.
- The advance becomes confirmed.

During payroll recovery, the outstanding advance decreases and reduces net salary payable.

#### Record bonus

- Records bonus eligibility/history.
- No cash moves at the moment it is recorded.
- The bonus is included in the relevant salary run, increasing payroll expense and salary payable.

#### Salary account withdrawal

- Employee salary payable decreases.
- Selected cash/bank decreases.
- Oldest unpaid salary runs are allocated first unless paying a specific run.
- Partial withdrawal is allowed up to available accrued salary.

### Salary Runs — `/payroll/runs`

Shows employee, period, base salary, bonuses, advance deductions, net payable, and payment status.

### Run Payroll — `/payroll/runs/new`

`Net payable = base salary + bonuses - recovered advances`

When payroll is run:

- Payroll expense increases by base salary plus bonuses.
- Employee salary payable increases by net payable.
- Employee advance balance decreases by recovered advance amount.
- Cash/bank does not change until salary is actually paid.
- Duplicate employee/month/year runs are rejected.

### Salary Run Detail — `/payroll/runs/:id`

Use **Mark as Paid**:

- Salary payable decreases.
- Selected cash/bank decreases.
- Run becomes partially paid or fully paid.
- Payment cannot exceed remaining payable.

## 13. Expenses — `/expenses`

Use **Record expense** and select department, category, amount, date, payment method, and the cash/bank account.

- Operating expense increases.
- Selected cash/bank decreases by the same amount.
- Department P&L/net profit decreases.
- Expense and invoice/notification history are created.

Expense categories can be created and edited where allowed. System-generated categories cannot be edited.

## 14. Cash & Bank

### Cash & Bank dashboard — `/accounts`

Read-only live summary plus bank-account creation.

- Total Cash = sum of active cash drawers.
- Total Bank = sum of active bank accounts.
- Total Funds = Total Cash + Total Bank.
- Each card shows opening balance, money in, money out, and current balance.
- Adding a bank account with an opening balance increases that bank account's displayed opening funds.

Transactions are entered on their business pages, not directly on this dashboard:

| To add money | Use page/action |
|---|---|
| Customer/shop/factory pays | Party Statement → Record receipt, or record sale with amount received |
| Investor adds money | Investments → Investor adds amount |
| Committee payout comes in | Committees → Record payout |
| Internal Shop settlement comes in | Supply → Internal Transfers → Settle |
| Sale proceeds | Department Sales page |

| To remove money | Use page/action |
|---|---|
| Pay supplier/farm/broker | Party Statement → Record payment, or purchase with amount paid |
| Expense | Expenses → Record expense |
| Salary/advance | Employee or Payroll pages |
| Investor withdrawal | Investments → Pay / investor receives amount |
| Zakat/fund | Zakat & Funds → Record payment |
| Committee installment | Committees → Record installment |

### Bank statement — `/accounts/bank/:id/statement`

- Date and method filters.
- Shows all linked bank money in/out and running balance.
- Printable and downloadable as CSV.
- Read-only.

### Cash statement — `/accounts/cash/:departmentId/statement`

- Shows entries linked to the department cash drawer and running balance.
- Printable and downloadable as CSV.
- Read-only.

## 15. Investments — `/investments`

### Create investor account

- First create/link a party with Investor party type.
- Create an Investor account from that party.
- Standard investors and the Shafique/Brother account use the same audited capital ledger.
- Creating the account alone does not move money.

### Investor adds amount (deposit)

Enter department, amount, date, Cash/Bank method, selected account, reference, and notes.

- Selected department cash/bank increases.
- Investor account balance increases.
- Investor party payable increases: the business owes the investor.
- Profit/loss does not change.

Example: Rs 100,000 deposit to Brokerage Cash Drawer adds Rs 100,000 to that drawer and Rs 100,000 to the investor balance/payable.

### Pay / investor receives amount (withdrawal)

- Investor account balance decreases.
- Investor party payable decreases.
- Selected department cash/bank decreases.
- Withdrawal cannot exceed investor account balance.
- Profit/loss does not change.

### Add manual profit

- Investor account balance/payable increases.
- Retained earnings decreases by the allocated profit amount.
- Cash/bank does not change until the investor is paid.

### Add manual loss

- Investor account balance/payable decreases.
- Retained earnings increases by the loss adjustment.
- Cash/bank does not change.
- Loss cannot exceed investor balance.

### Shafique farm payable transfer

Available only on the Brother/Shafique investor account.

- Select department, Farm party, amount, date, reference, and notes.
- Farm payable decreases.
- Shafique investor balance/payable increases by the same amount.
- Cash/bank does not change.
- Farm and source payable must belong to the selected department.
- Transfer cannot exceed farm payable.

### Investor profit periods and distributions

Backend flow supports:

- Calculate a department/date profit period.
- Finalize it using active investor profit-share percentages.
- Finalization decreases retained earnings and creates investor-profit payable.
- Paying/distributing profit decreases investor-profit payable and selected cash/bank.
- Percentages cannot exceed 100% in total.

References on capital transactions must be unique when provided.

## 16. Committees — `/committees`

### New Committee

Stores department, installment amount, member count, payout position, and start date. No money moves.

### Record Installment

- Committee advance/contribution asset increases.
- Selected payment-method ledger decreases by installment amount.
- Recorded amount must equal configured installment amount.
- Installment count cannot exceed total members.

### Record Payout

- Cash/bank ledger increases by payout amount.
- Committee contribution asset decreases by total contributed.
- Any payout above total contribution becomes other income and increases profit.
- Committee becomes completed.
- Payout cannot be less than contributed total and cannot be recorded twice.

Current implementation note: Committee forms record Cash/Bank method but do not select a specific cash drawer/bank account ID. The general ledger changes, but a drawer/account-specific statement cannot attribute the entry.

## 17. Zakat & Funds — `/zakat-funds`

### Record payment

Select Zakat/Fund, department, amount, payment date, recipient/purpose, Cash/Bank account, optional reference, and notes.

- Selected department cash/bank decreases immediately.
- Operating expense increases immediately.
- Department and consolidated profit decrease.
- The yearly “Paid during year” total increases.
- Reference is optional, but if supplied it must be valid and unique.

### Allocate year-end balance to parties

Allocation methods:

- Equal.
- Manual amounts totaling the exact unallocated balance.
- Percentages totaling exactly 100%.

On allocation:

- “Still to allocate” decreases to zero for that allocated amount.
- Selected party payable balances are reduced/charged by their allocated shares.
- The earlier Zakat/Fund operating expense is credited so the cost is transferred from the business to selected parties.
- Cash/bank does not change at allocation time because cash already left when payments were recorded.

### Reverse

- Reverse year-end allocation first when necessary.
- Reversing a payment restores cash/bank and reverses operating expense.
- Reversing an allocation restores party balances and unallocated total.
- Original records remain with reversed status and reason.

## 18. Invoices — `/invoices`

- Lists printable documents generated from purchases, sales, transfers, expenses, payroll, and write-offs.
- Print retrieves or creates the document for its source transaction.
- Cancelling an invoice cancels only the printable document.
- Cancelling an invoice does **not** reverse its source transaction, stock, cash, party balance, or P&L.
- To reverse accounting, cancel/reverse from the original business page.

## 19. Notifications — `/notifications`

- Lists notifications generated by important business routes.
- Shows delivery/status/context.
- Supports retry/resend where available.
- Deleting a notification removes the message record only; it does not reverse the business transaction.
- No direct financial effect.

## 20. Reports

All report pages are read-only. Date/department filters determine included posted records.

### Consolidated P&L — `/reports/consolidated-profit-loss`

`Net profit = external revenue + other income - COGS - operating expenses - payroll`

- Excludes internal-transfer revenue from net external revenue.
- Includes all active departments.

### Partner Profit Share — `/reports/partner-profit-share`

- Displays consolidated profit and a fixed three-partner equal share.
- Current formula: `net profit ÷ 3`.
- It is a report calculation; it does not post money or party balances.

### Outstanding Balances — `/reports/outstanding-balances`

- Positive row = receivable from party.
- Negative row = payable to party.
- Can be filtered by department.
- Values come from all party-linked ledger entries including purchases, sales, payments, investor capital, internal departments, and allocations.

### Stock Summary — `/reports/stock-summary`

- Shows quantity, stock type, WAC, department, and movement history.
- Live balances come from stock-balance records.
- Read-only; use department transaction/write-off pages to change stock.

### Expense Breakdown — `/reports/expense-breakdown`

- Groups/filter expenses by date, department, and category.
- Includes manual and system-generated expenses.
- Does not create or pay an expense.

### Payroll Summary — `/reports/payroll-summary`

- Summarizes salary runs by date/department.
- Shows base salary, bonus, advance recovery, net payable, and payments.
- Read-only.

## 21. Users & Roles

### Users — `/users`

Owner-only functions:

- Search and filter by name, role, and department.
- Create user.
- Assign role and department.
- Activate/deactivate.
- Update salary/daily wage where supported.
- Assign feature/action permissions.
- Record resignation or soft-delete/deactivate.

Creating a user has no financial effect and does not automatically make the user a party, investor, employee, or driver record. Create the corresponding business record afterward.

### Roles — `/roles`

- Create/edit role name and description.
- Delete only where allowed and safe.
- Roles control access; they do not change balances.

## 22. Route aliases and non-business pages

- `/dashboard` redirects to `/`.
- `/brokerage`, `/supply`, `/wastage`, and `/shop` redirect to the first page in their department section.
- `/fresh-chicken-shop` is a legacy alias that redirects to `/shop/incoming-transfers`.
- `/dev/style-guide` exists only when development pages are explicitly enabled; it demonstrates UI components and has no business or financial effect.
- Any unknown route displays the Page Not Found screen and makes no changes.

## 23. Transaction correction and reversal rules

The system favors audit-safe reversals rather than overwriting posted financial history.

| Original record | Correct method |
|---|---|
| Purchase/sale | Cancel, reverse ledger/stock, then recreate |
| Brokerage-to-Supply generated purchase | Cancel source Brokerage sale |
| Dressing batch | Reverse/delete unconsumed batch, then recreate |
| Zakat/Fund payment | Reverse with reason; reverse related allocation first |
| Invoice | Invoice cancellation affects document only |
| Notification | Delete/retry affects notification only |

Never manually edit database totals. Cash, party, stock, and reports are derived from detailed posted records.

## 24. Complete amount movement quick reference

| Action page | Cash/Bank | Party/other liability | Stock | Profit/Loss |
|---|---:|---:|---:|---:|
| Paid purchase | Decrease | No payable for paid part | Increase | COGS increases |
| Credit purchase | No change | Payable increases | Increase | COGS increases |
| Paid sale | Increase | No receivable for paid part | Decrease | Revenue increases |
| Credit sale | No change | Receivable increases | Decrease | Revenue increases |
| Party receipt | Increase | Receivable decreases | No change | No new revenue |
| Party payment | Decrease | Payable decreases | No change | No new expense |
| Manual expense | Decrease | No change | No change | Expense increases |
| Stock write-off | No change | No change | Decrease | Expense increases |
| Investor deposit | Increase | Investor payable/balance increases | No change | No change |
| Investor withdrawal | Decrease | Investor payable/balance decreases | No change | No change |
| Manual investor profit | No change | Investor balance increases | No change | Retained earnings decreases |
| Manual investor loss | No change | Investor balance decreases | No change | Retained earnings increases |
| Shafique farm transfer | No change | Farm payable decreases; Shafique balance increases | No change | No change |
| Payroll run | No change | Salary payable increases | No change | Payroll expense increases |
| Salary payment | Decrease | Salary payable decreases | No change | No new expense |
| Employee advance confirmation | Decrease | Employee advance asset increases | No change | No immediate expense |
| Zakat/Fund payment | Decrease | Unallocated yearly total increases | No change | Expense increases |
| Zakat/Fund allocation | No change | Selected party balances decrease | No change | Earlier expense is reallocated/reversed |
| Committee installment | Decrease in general ledger | Committee asset increases | No change | No immediate expense |
| Committee payout | Increase in general ledger | Committee asset decreases | No change | Excess becomes other income |
| Internal stock transfer | No cash until settlement | Interdepartment receivable/payable increase | Source decreases; destination increases | Internal revenue excluded from consolidated external profit |

## 25. Recommended daily operating order

1. Create Users and assign roles/departments.
2. Create required Party records and link departments.
3. Create employee, vehicle, investor, or committee master records as needed.
4. Record department purchases and incoming transfers.
5. Record dressing batches where live stock becomes dressed stock.
6. Record sales with correct received amount and account.
7. Use Party Statement for later receipts/payments against credit balances.
8. Record expenses, fuel, maintenance, advances, and payroll.
9. Record investor deposits/withdrawals and Zakat/Fund payments.
10. Review Cash & Bank, Party Statements, Stock, and department P&L separately.
11. Review consolidated reports and outstanding balances.
12. Correct mistakes using cancellation/reversal flows, never database edits.

## 26. Reconciliation checklist

At day end, verify:

- Cash drawer physical money equals its Cash Statement closing balance.
- Bank statement balance equals the ERP Bank Statement.
- Every credit sale has a party receivable.
- Every credit purchase has a party payable.
- Customer receipts and supplier payments reduce the correct party balance.
- Investor deposits increase department cash/bank and investor payable by the same amount.
- Investor withdrawals decrease both by the same amount.
- Stock movement totals reconcile with current quantity.
- Write-offs have a reason and expense valuation.
- Salary payments do not exceed accrued salary.
- Zakat/Fund paid, allocated, and still-to-allocate totals reconcile.
- Cancelled/reversed records have matching reversal entries and do not disappear silently.

# Part II — Complete Step-by-Step System Testing Guide

Use this section as the acceptance test for the application. Perform it in a dedicated test database when possible. Every reference below is intentionally unique. If the database already contains one of these references, add the test date to it, for example `INV-DEP-001-20260813`.

## 27. Test preparation and starting balances

Before entering transactions:

1. Sign in as Owner.
2. Open **Cash & Bank**.
3. Write down the current balances of:
   - Brokerage Cash Drawer.
   - Supply Cash Drawer.
   - Wastage Cash Drawer.
   - Fresh Chicken Shop Cash Drawer.
   - The bank account used for testing.
4. Open each department's **Stock** page and write down quantity and WAC.
5. Open **Reports → Outstanding Balances** and write down current party balances.
6. Use parties created specifically for this test so old balances do not hide an error.

For every test, compare the balance **before** and **after**. Do not expect an absolute balance of Rs 100,000 if the account already contained money. Expect the old balance plus or minus the test amount.

## 28. Authentication and access testing

### Testing Sign in

1. Open `/login`.
2. Enter a valid Owner email and password.
3. Click **Sign in**.

Expected result:

- Dashboard opens.
- Owner can see all navigation sections.
- No cash, party, stock, or profit balance changes.

Validation tests:

- Enter a wrong password: login must be rejected.
- Open a protected URL while signed out: user must be redirected to Login.
- Sign out and verify the old session cannot access protected data.

### Testing Forgot and Reset Password

1. Open `/forgot-password`.
2. Submit a valid user email.
3. Use the valid reset token on `/reset-password`.
4. Set a new permitted password.

Expected result:

- New password works.
- Old password no longer works.
- No financial or stock record changes.

### Testing roles and department access

1. Sign in as Department Staff assigned to Supply.
2. Confirm Supply, Parties, Vehicles, Employees, and Expenses are available.
3. Try opening `/brokerage/purchases` directly.

Expected result:

- Supply staff sees only authorized department data.
- Brokerage route is rejected or redirected.
- Owner sees Users & Roles; Accountant does not see owner-only Users & Roles.

## 29. Dashboard testing

### Testing Owner Dashboard

1. Open `/`.
2. Record External Revenue, Net Profit, Current Stock, Total Receivable, and Total Payable.
3. Complete one Rs 10,000 cash sale later in this guide.
4. Return and click **Refresh**.

Expected result after that sale:

- External revenue increases by Rs 10,000.
- Selected department cash increases by Rs 10,000.
- Stock decreases by the sold quantity.
- Net profit changes according to revenue minus stock cost.

Important:

- An investor deposit must not increase External Revenue or Net Profit.
- A party receipt must not create revenue again; it only converts receivable into cash.

### Testing Department Dashboard

1. Sign in as department staff.
2. Open `/`.
3. Confirm stock, receivable, and payable show only the assigned department.
4. Click **Open department entry**.

Expected result:

- User reaches the correct department.
- Another department's balances are not included.
- The “Today's purchases and sales” placeholder does not change accounting.

## 30. Master-data setup for transaction tests

### Create test users — Users `/users`

Create these users with unique emails:

1. `Test Investor` with Investor role.
2. `Test Employee` with Employee role and Brokerage department.
3. `Test Driver` with Driver role and Brokerage department.

Expected result:

- Users appear in Users list and filters.
- Creating a user does not add cash, party balances, stock, or expenses.

Validation:

- Duplicate email is rejected.
- Deactivated user cannot sign in.
- Department and role filters return the correct users.

### Create and test roles — Roles `/roles`

1. Create a role named `TEST_VIEWER` if custom roles are allowed.
2. Add a description.
3. Edit the description.
4. Delete it only if it is unused.

Expected result:

- Role changes appear in the role list.
- No financial balance changes.
- Deleting a role assigned to users must be rejected or handled safely.

### Create test parties — Parties `/parties`

Create these parties with Opening balance `0` and link them to Brokerage:

- `Green Farm Test` — Farm.
- `Broker Test` — Broker.
- `Customer Test` — Customer.
- `Investor Test` — Investor, linked to Test Investor user.
- `Factory Test` — Factory, linked to Wastage.
- `Shop Owner Test` — Shop Owner, linked to Supply/Wastage as required.

Expected result:

- Every party is searchable by name.
- Party type and department filters work.
- Opening balance zero creates no money entry.

Opening balance test:

1. Create `Opening Receivable Test` with opening balance `10000`.
2. Create `Opening Payable Test` with opening balance `-7000`.

Expected result:

- Opening Receivable Test shows party owes business Rs 10,000.
- Opening Payable Test shows business owes party Rs 7,000.
- No cash or bank balance changes.

## 31. Testing Brokerage purchases

Use Brokerage → Purchases → **Record purchase**.

### Test A: fully paid purchase

Enter:

- Seller: Green Farm Test.
- Quantity: `100` kg.
- Rate/kg: `200`.
- Total expected: Rs 20,000.
- Payment method: Cash.
- Amount paid: `20000` or leave blank when the UI states blank means full amount.
- Cash drawer: Brokerage Cash Drawer.
- Reference/description: `BR-PUR-CASH-001` where supported.

Expected result:

- Brokerage stock increases by 100 kg.
- Brokerage cash decreases by Rs 20,000.
- Purchase/COGS increases by Rs 20,000.
- Green Farm payable does not increase for this fully paid purchase.
- Purchase invoice and notification are created.

### Test B: partially paid purchase

Enter:

- Seller: Broker Test.
- Quantity: `100` kg.
- Rate/kg: `200`.
- Total: Rs 20,000.
- Amount paid: `5000`.
- Payment method: Cash.
- Cash drawer: Brokerage Cash Drawer.

Expected result:

- Brokerage stock increases by 100 kg.
- Brokerage cash decreases by Rs 5,000.
- Broker Test payable increases by Rs 15,000.
- Purchase/COGS increases by full Rs 20,000.

### Test C: credit purchase

Enter:

- Seller: Green Farm Test.
- Quantity: `1000` kg.
- Rate/kg: `200`.
- Total: Rs 200,000.
- Payment method: Credit.
- Amount paid: `0`.

Expected result:

- Brokerage stock increases by 1,000 kg.
- Green Farm Test payable increases by Rs 200,000.
- Cash and bank remain unchanged.
- Purchase/COGS increases by Rs 200,000.

Validations:

- Farm and Broker parties must both be selectable.
- Zero/negative quantity or rate must be rejected.
- Paid amount above total must be rejected.
- Credit or partial purchase without a party must be rejected.

## 32. Testing Brokerage sales

Use Brokerage → Sales → **Record sale**.

### Test A: cash sale to Customer

Enter:

- Buyer: Customer Test.
- Quantity: `50` kg.
- Rate/kg: `250`.
- Total: Rs 12,500.
- Amount received: `12500`.
- Payment method: Cash.
- Cash drawer: Brokerage Cash Drawer.

Expected result:

- Brokerage stock decreases by 50 kg.
- Brokerage cash increases by Rs 12,500.
- Revenue increases by Rs 12,500.
- Customer receivable remains unchanged.
- Margin/commission per kg equals Rs 250 minus current WAC.

### Test B: partial sale to Broker

Enter:

- Buyer: Broker Test.
- Quantity: `40` kg.
- Rate/kg: `250`.
- Total: Rs 10,000.
- Amount received: `3000`.
- Payment method: Cash.

Expected result:

- Brokerage stock decreases by 40 kg.
- Cash increases by Rs 3,000.
- Broker Test receivable increases by Rs 7,000.
- Revenue increases by full Rs 10,000.

### Test C: automatic sale to Supply

Enter:

- Destination: Supply department automatic transfer.
- Quantity: `100` kg.
- Rate/kg: `220`.
- Payment method: Credit.

Expected result:

- Brokerage stock decreases by 100 kg.
- Supply stock increases by 100 kg.
- Brokerage internal receivable increases by Rs 22,000.
- Supply internal payable increases by Rs 22,000.
- A linked Supply purchase appears automatically.
- No cash/bank changes.
- Consolidated external revenue does not count this internal transfer as an outside sale.

Validations:

- Customer and Broker parties are selectable for external sales.
- Sale exceeding stock is rejected.
- Amount received above total is rejected.
- Cancelling the Brokerage-to-Supply sale reverses both stock sides and the generated Supply purchase.

## 33. Testing Brokerage stock and report

### Stock `/brokerage/stock`

1. Write down stock quantity and WAC.
2. Click **Add Shrinkage**.
3. Enter quantity `5` kg, a reason, and date.

Expected result:

- Brokerage stock decreases by 5 kg.
- Operating expense increases by `5 × current WAC`.
- Inventory value decreases by the same valuation.
- Cash/bank remains unchanged.
- Write-off invoice/notification appears.

Validation: entering more than available stock is rejected.

### Report `/brokerage/reports/profit-loss`

1. Select a date range containing the tests.
2. Compare purchase totals, sales, expenses, and payroll to source pages.

Expected result:

- Revenue contains external Brokerage sales.
- COGS/purchases contain posted purchases.
- Shrinkage appears in operating expense.
- Net profit equals revenue minus COGS, expense, and payroll shown by the report.

## 34. Testing Supply purchases and sales

### Supply cash purchase

Enter on `/supply/purchases`:

- Broker: Broker Test.
- Quantity: `100` kg.
- Rate: `210`.
- Amount paid: `21000`.
- Payment method/account: Supply Cash Drawer.

Expected result:

- Supply stock increases 100 kg.
- Supply cash decreases Rs 21,000.
- No Broker payable for the paid amount.
- Supply COGS increases Rs 21,000.

### Supply credit purchase

Enter the same type of purchase for Rs 15,000 with Credit.

Expected result:

- Supply stock increases.
- Broker payable increases Rs 15,000.
- Cash/bank does not change.

### Supply partial external sale

Enter on `/supply/sales`:

- Buyer: Shop Owner Test.
- Quantity: `40` kg.
- Rate: `260`.
- Total: Rs 10,400.
- Amount received: `4000`.
- Payment method: Cash.
- Cash drawer: Supply Cash Drawer.

Expected result:

- Supply stock decreases 40 kg.
- Supply cash increases Rs 4,000.
- Shop Owner receivable increases Rs 6,400.
- Revenue increases full Rs 10,400.

Validations:

- Purchase party must be an eligible Broker.
- Sale exceeding Supply stock is rejected.
- Posted records cannot be overwritten; use cancel and recreate.
- Generated purchase from Brokerage cannot be cancelled from Supply.

## 35. Testing Supply internal transfer and settlement

### Create transfer

Open `/supply/internal-transfers` and enter:

- Quantity: `50` kg.
- Internal rate: `230`.
- Total: Rs 11,500.
- Transfer date and an eligible Supply vehicle if required.

Expected result:

- Supply stock decreases 50 kg.
- Shop Live stock increases 50 kg.
- Supply receivable from Shop increases Rs 11,500.
- Shop payable to Supply increases Rs 11,500.
- Cash/bank remains unchanged.
- Transfer appears on `/shop/incoming-transfers`.

### Partially settle transfer

Click **Settle**, enter:

- Amount: `4000`.
- Payment method: Cash.
- Cash drawer: Supply Cash Drawer.

Expected result:

- Supply cash increases Rs 4,000.
- Supply receivable from Shop decreases from Rs 11,500 to Rs 7,500.
- Transfer shows Partially Settled and remaining Rs 7,500.

Validation: settlement Rs 7,501 at this point must be rejected without changing cash or receivable.

## 36. Testing Supply stock and reports

### Supply Stock `/supply/stock`

Record 3 kg shrinkage.

Expected result:

- Supply stock decreases 3 kg.
- Operating expense increases by `3 × WAC`.
- Cash remains unchanged.

### Supply Report `/supply/reports/profit-loss`

Expected result:

- External view includes Supply external sales only.
- Including Internal Transfers view additionally shows internal activity.
- Consolidated report uses external-only revenue to avoid double counting.

## 37. Testing Wastage flow

### Wastage purchase

On `/wastage/purchases`, enter:

- Seller: Shop Owner Test.
- Quantity: `100` kg.
- Rate: `20`.
- Total: Rs 2,000.
- Amount paid: `500` cash from Wastage Cash Drawer.

Expected result:

- Wastage stock increases 100 kg.
- Wastage cash decreases Rs 500.
- Shop Owner payable increases Rs 1,500.
- COGS increases Rs 2,000.

### Wastage sale

On `/wastage/sales`, enter:

- Buyer: Factory Test.
- Quantity: `50` kg.
- Rate: `30`.
- Total: Rs 1,500.
- Amount received: `600` cash.

Expected result:

- Wastage stock decreases 50 kg.
- Wastage cash increases Rs 600.
- Factory receivable increases Rs 900.
- Revenue increases Rs 1,500.

### Wastage Stock and Report

1. Record 2 kg shrinkage on `/wastage/stock`.
2. Open `/wastage/reports/profit-loss`.

Expected result:

- Stock decreases 2 kg.
- Operating expense increases by 2 × WAC.
- Report includes the purchase, sale, and shrinkage in the chosen period.

## 38. Testing Fresh Chicken Shop flow

### Incoming Transfers `/shop/incoming-transfers`

1. Find the Rs 11,500 Supply transfer created earlier.

Expected result:

- Quantity/rate/source match Supply transfer.
- Shop Live stock already includes the 50 kg.
- Do not enter another receipt; this page must not duplicate stock or money.

### Dressing batch `/shop/dressing-batches`

Enter:

- Live weight: `40` kg.
- Dressed weight: `30` kg.
- Batch date: test date.

Expected result:

- Shop Live stock decreases 40 kg.
- Shop Dressed stock increases 30 kg.
- Shrinkage shows 10 kg.
- Processing loss expense uses the lost 10 kg at live WAC.
- Cash/bank remains unchanged.

Validation:

- Dressed weight 41 kg against 40 kg live must be rejected.
- Batch using more Live stock than available must be rejected.

### Shop partial sale `/shop/sales`

Enter:

- Customer: Customer Test.
- Quantity: `10` kg dressed.
- Rate: `400`.
- Total: Rs 4,000.
- Amount received: `1500`.
- Payment method: Cash.
- Cash drawer: Shop Cash Drawer.

Expected result:

- Dressed stock decreases 10 kg.
- Shop cash increases Rs 1,500.
- Customer receivable increases Rs 2,500.
- Revenue increases Rs 4,000.
- COGS increases by `10 × dressed WAC`.

### Shop Stock and Report

1. On `/shop/stock`, write off 1 kg Dressed stock.
2. Open `/shop/reports/profit-loss`.

Expected result:

- Dressed stock decreases 1 kg.
- Expense increases by dressed WAC.
- Report contains Shop sale revenue, COGS, processing loss, write-off, and payroll if present.

## 39. Testing party receipts and payments

### Receive from Customer

Open Customer Test statement `/parties/:id` after the Rs 2,500 Shop receivable.

Click **Record receipt** and enter:

- Department: Fresh Chicken Shop.
- Amount: `1000`.
- Payment method: Cash.
- Cash drawer: Shop Cash Drawer.
- Reference: `PTY-REC-001`.

Expected result:

- Customer receivable decreases from Rs 2,500 to Rs 1,500.
- Shop cash increases Rs 1,000.
- Revenue does not increase again.

### Pay Green Farm partially

Open Green Farm Test statement after the Rs 200,000 credit purchase.

Click **Record payment** and enter:

- Department: Brokerage.
- Amount: `50000`.
- Payment method: Cash or Bank.
- Selected account: Brokerage account.
- Reference: `PTY-PAY-001`.

Expected result:

- Green Farm payable decreases from Rs 200,000 to Rs 150,000.
- Selected cash/bank decreases Rs 50,000.
- COGS does not increase again.

Validations:

- Receipt over receivable is rejected.
- Payment over payable is rejected.
- Wrong department/account combination is rejected.
- Duplicate reference is rejected where the payment reference is unique.

## 40. Testing vehicles, fuel, and maintenance

### Vehicle master `/vehicles` and `/vehicles/:id`

1. Create `TEST-VEH-001` in Brokerage.
2. Assign Test Driver.
3. Open vehicle details.
4. Edit a nonfinancial detail.

Expected result:

- Vehicle appears in Brokerage vehicle selectors.
- Supply cannot use the Brokerage vehicle.
- No financial balance changes from master-data edits.

### Fuel log `/vehicles/:id/fuel-logs`

Enter:

- Liters: `20`.
- Rate/liter: `300`.
- Expected total: Rs 6,000.
- Date and odometer.

Expected result:

- Fuel log total is Rs 6,000.
- Brokerage Vehicle Fuel operating expense increases Rs 6,000.
- General Brokerage cash ledger decreases Rs 6,000.
- Stock and party balances do not change.

### Maintenance log `/vehicles/:id/maintenance-logs`

Enter maintenance cost `5000`.

Expected result:

- Vehicle Maintenance expense increases Rs 5,000.
- General department cash ledger decreases Rs 5,000.
- No stock or party balance changes.

Also verify the directory pages `/vehicles/fuel-logs` and `/vehicles/maintenance-logs` list the records.

## 41. Testing employees, advances, bonuses, and payroll

### Create employee `/employees`

1. Select Test Employee user.
2. Department: Brokerage.
3. Base salary: `50000`.
4. Save and open `/employees/:id`.

Expected result:

- Employee exists with Rs 50,000 base salary.
- No cash/payroll entry yet.

### Employee advance `/employees/:id/advances`

1. Click **Record Advance**.
2. Amount: `10000`.
3. Save.

Expected before confirmation:

- Advance is pending.
- Cash/bank unchanged.

Confirm payment using Brokerage Cash Drawer.

Expected after confirmation:

- Brokerage cash decreases Rs 10,000.
- Employee advance asset/outstanding increases Rs 10,000.

### Employee bonus `/employees/:id/bonuses`

Record bonus:

- Amount: `5000`.
- Date inside payroll month.

Expected result:

- Bonus record appears.
- Cash remains unchanged now.
- Bonus will be included in that month's payroll run.

### Run payroll `/payroll/runs/new`

Use:

- Base salary: Rs 50,000.
- Bonus: Rs 5,000.
- Recover advances: Yes.

Expected calculation:

- Gross payroll expense: `50,000 + 5,000 = Rs 55,000`.
- Advance recovered: Rs 10,000.
- Net salary payable: `55,000 - 10,000 = Rs 45,000`.
- Cash/bank remains unchanged until paid.
- Payroll expense increases Rs 55,000.
- Employee advance outstanding becomes zero.
- Employee salary payable increases Rs 45,000.

Validation: a second run for the same employee/month/year is rejected.

### Partial salary payment `/payroll/runs/:id`

Click **Mark as Paid** and enter:

- Amount: `20000`.
- Payment method: Cash.
- Cash drawer: Brokerage Cash Drawer.

Expected result:

- Brokerage cash decreases Rs 20,000.
- Salary payable decreases from Rs 45,000 to Rs 25,000.
- Run becomes Partially Paid.
- Payroll expense remains Rs 55,000; payment must not create expense again.

Validation: payment above Rs 25,000 remaining is rejected.

## 42. Testing manual expenses

Open `/expenses` and record:

- Department: Brokerage.
- Category: a valid operating category.
- Amount: `3000`.
- Payment method: Cash.
- Cash drawer: Brokerage Cash Drawer.
- Description/reference: `EXP-TEST-001`.

Expected result:

- Brokerage cash decreases Rs 3,000.
- Brokerage operating expense increases Rs 3,000.
- Brokerage and consolidated net profit decrease Rs 3,000.
- Expense invoice and notification appear.
- Party and stock balances remain unchanged.

Validation: missing department, category, positive amount, date, or payment account is rejected.

## 43. Testing Cash & Bank pages

### Dashboard `/accounts`

After completing an investor deposit of Rs 100,000:

- Brokerage Cash Drawer must increase by Rs 100,000 from its immediately previous value.
- Total Cash and Total Funds must increase by Rs 100,000.
- Net Profit must not increase.

After a Rs 25,000 investor withdrawal:

- Selected cash/bank decreases Rs 25,000.
- Total Funds decreases Rs 25,000.

### Add bank account

Create:

- Bank: Test Bank.
- Title: Poultry ERP Test.
- Opening balance: `50000`.

Expected result:

- Bank account appears with Rs 50,000 opening balance.
- Total Bank/Total Funds includes Rs 50,000.
- Opening balance is not revenue or profit.

### Statements

1. Open `/accounts/cash/:departmentId/statement` for Brokerage.
2. Find investor deposit under Investor Capital as money in.
3. Find investor withdrawal as money out.
4. Open `/accounts/bank/:id/statement` and test date/method filters.
5. Test Print and CSV.

Expected result:

- Running balance equals opening plus debits minus credits.
- Filters do not alter stored balances.
- Printing/exporting has no financial effect.

## 44. Testing a normal investor

### 1. Create the investor account

1. Ensure Test Investor user exists.
2. Ensure Investor Test party is linked to that user and Brokerage.
3. Open `/investments`.
4. Click **Create investor account**.
5. Select Investor Test party.
6. Account type: Investor.

Expected result:

- Investor appears in the account list.
- Initial account balance is Rs 0 unless the party has an existing external/opening balance.
- No cash moves by creating the account.

### 2. Deposit

Select the investor and click **Add transaction**.

Enter:

- Action: Investor adds amount.
- Department: Brokerage.
- Amount: `100000`.
- Payment method: Cash.
- Cash drawer: Brokerage Cash Drawer.
- Reference: `INV-DEP-001`.

Expected result:

- Investor balance: Rs 100,000.
- Selected Brokerage cash balance increases by Rs 100,000.
- Investor party statement shows Business owes investor Rs 100,000.
- History shows Deposit +Rs 100,000.
- Brokerage revenue/net profit does not change.

### 3. Add manual profit

Enter:

- Action: Add manual profit.
- Department: Brokerage.
- Amount: `10000`.
- Reference: `INV-PROFIT-001`.

Expected result:

- Investor balance: `100,000 + 10,000 = Rs 110,000`.
- Investor payable increases Rs 10,000.
- Cash/bank remains unchanged.
- Retained earnings decreases Rs 10,000.

### 4. Add manual loss

Enter:

- Action: Add manual loss.
- Amount: `5000`.
- Reference: `INV-LOSS-001`.

Expected result:

- Investor balance: `110,000 - 5,000 = Rs 105,000`.
- Investor payable decreases Rs 5,000.
- Cash/bank remains unchanged.

### 5. Pay investor partially

Enter:

- Action: Pay / investor receives amount.
- Amount: `25000`.
- Payment method: Cash or Bank.
- Select the account.
- Reference: `INV-WITHDRAW-001`.

Expected result:

- Investor balance: `105,000 - 25,000 = Rs 80,000`.
- Selected cash/bank balance decreases Rs 25,000.
- Investor payable decreases Rs 25,000.
- No new expense is created.

### 6. Investor validations

Try withdrawing Rs 80,001.

Expected result:

- Transaction rejected.
- Investor remains Rs 80,000.
- Cash/bank remains unchanged.

Reuse `INV-WITHDRAW-001`.

Expected result:

- Duplicate reference rejected.
- No balance changes.

Also verify:

- Cash deposit requires selected cash drawer.
- Bank deposit/withdrawal requires bank, cheque/app method, and cheque number when cheque is used.
- Inactive investor cannot add capital.

## 45. Testing Shafique/Brother account

### 1. Create Shafique

Follow the same user and party steps, then create the investor account with:

- Account type: Shafique / Brother.

Expected result:

- Only one Brother account is allowed.
- Farm Transfer action appears only on this account.
- Creating the account does not move cash.

### 2. Create farm payable

Use the Rs 200,000 credit Brokerage purchase from Green Farm Test described earlier.

Expected farm payable before transfer:

- Rs 200,000 if no payment was recorded against it.

If the Rs 50,000 party-payment test was already performed, use another fresh Farm party/purchase or expect Rs 150,000 before transfer.

### 3. Transfer part of farm payable to Shafique

Select Shafique and click **Add transaction**.

Enter:

- Action: Transfer farm payable to Shafique.
- Department: Brokerage, the same department as the farm purchase.
- Farm: Green Farm Test.
- Amount: `50000`.
- Reference: `SHAF-MED-001`.

Expected result from a Rs 200,000 starting payable:

- Green Farm payable decreases from Rs 200,000 to Rs 150,000.
- Shafique investor balance increases from Rs 0 to Rs 50,000.
- Shafique history shows Farm transfer +Rs 50,000.
- Source column shows Green Farm Test.
- Cash/bank remains unchanged.
- Profit/loss remains unchanged.

### 4. Add Shafique normal investment

Enter:

- Action: Investor adds amount.
- Department: Brokerage.
- Amount: `100000`.
- Payment method: Cash.
- Cash drawer: Brokerage Cash Drawer.
- Reference: `SHAF-DEP-001`.

Expected result:

- Shafique balance: `50,000 + 100,000 = Rs 150,000`.
- Brokerage cash increases Rs 100,000.

### 5. Add profit

Record manual profit:

- Amount: `2000`.
- Reference: `SHAF-PROFIT-001`.

Expected result:

- Shafique balance: `150,000 + 2,000 = Rs 152,000`.
- Cash/bank unchanged.

### 6. Pay Shafique partially

Record withdrawal/payment:

- Amount: `30000`.
- Payment method/account: Brokerage Cash Drawer or Bank.
- Reference: `SHAF-WITHDRAW-001`.

Expected result:

- Shafique balance: `152,000 - 30,000 = Rs 122,000`.
- Selected cash/bank decreases Rs 30,000.

### 7. Shafique validations

Confirm:

- Farm transfer is unavailable on a standard investor.
- Transfer above selected farm payable is rejected.
- Farm payable from another department cannot be transferred in Brokerage.
- Withdrawal above Rs 122,000 is rejected.
- Duplicate references are rejected.
- Failed attempts leave farm, Shafique, and cash/bank balances unchanged.

## 46. Testing investor profit-period backend flow

Where the profit-period controls/API are exposed:

1. Calculate a period for Brokerage with a valid start and end date.
2. Finalize it.
3. Verify active investors receive allocation using configured percentages.
4. Pay part of an allocation using Cash/Bank.

Expected result:

- Calculation alone does not move cash.
- Finalization reduces retained earnings and increases investor-profit payable.
- Distribution decreases selected cash/bank and investor-profit payable.
- A duplicate date period is rejected.
- Total active percentages above 100% are rejected.
- Distribution above remaining allocation is rejected.

## 47. Testing Committees

### Create committee

Enter:

- Department: Brokerage.
- Name: Test Committee.
- Installment: `10000`.
- Members: `3`.
- Payout position: `2`.

Expected result:

- Committee appears Active.
- No cash moves.

### Record two installments

Record Rs 10,000 twice using Cash.

Expected result after two:

- General Brokerage cash ledger decreases Rs 20,000.
- Committee contribution/advance asset increases Rs 20,000.
- Committee current amount reflects contributions according to page sign convention.

### Record payout

Enter:

- Payout amount: `22000`.
- Recorded contributed total: Rs 20,000.
- Payment method: Cash.

Expected result:

- General cash ledger increases Rs 22,000.
- Committee asset decreases Rs 20,000.
- Other income increases Rs 2,000.
- Committee becomes Completed.

Validations:

- Installment other than configured Rs 10,000 is rejected.
- More installments than members are rejected.
- Payout below contribution total is rejected.
- Second payout is rejected.

## 48. Testing Zakat & Funds

### Record Zakat payment

Open `/zakat-funds`, click **Record payment**, and enter:

- Account type: Zakat.
- Department: Brokerage.
- Amount: `3000`.
- Recipient/purpose: Test Recipient.
- Payment method: Cash.
- Cash account: Brokerage Cash Drawer.
- Reference: `ZAKAT-001`.

Expected result:

- Brokerage cash decreases Rs 3,000.
- Operating expense increases Rs 3,000.
- Paid During Year increases Rs 3,000.
- Still To Allocate increases Rs 3,000.
- Net profit decreases Rs 3,000 until year-end allocation transfers it to parties.

### Record Fund payment

Repeat with:

- Type: Fund.
- Amount: `2000`.
- Reference: `FUND-001`.

Expected result:

- Selected cash/bank decreases Rs 2,000.
- Fund paid/unallocated total increases Rs 2,000.

### Allocate Zakat year-end amount

Allocate Rs 3,000 equally to three selected partner parties.

Expected result:

- Each party is charged Rs 1,000.
- Allocated to Parties becomes Rs 3,000.
- Still To Allocate becomes Rs 0 for Zakat/year/department.
- Cash/bank does not change during allocation.
- Earlier operating expense is credited/reallocated Rs 3,000.

### Reverse tests

1. Try reversing the payment while allocation exists.
2. Reverse allocation with a reason.
3. Reverse payment with a reason.

Expected result:

- Step 1 is rejected.
- Allocation reversal restores party balances and Still To Allocate.
- Payment reversal restores Brokerage cash Rs 3,000 and reverses expense.
- Records remain visible as Reversed.

Validations:

- Duplicate reference rejected.
- Cash drawer from another department rejected.
- Manual allocations must total exact outstanding amount.
- Percentage allocations must total exactly 100%.

## 49. Testing Invoices and Notifications

### Invoices `/invoices`

1. Find the test purchase, sale, expense, payroll, or write-off invoice.
2. Print it.
3. Cancel the invoice.

Expected result:

- Print view contains correct source amount/party/department.
- Invoice becomes Cancelled.
- Source transaction remains posted.
- Cash, stock, party, and P&L balances do not change when only invoice is cancelled.

### Notifications `/notifications`

1. Find notifications generated by test routes.
2. Test Retry/Resend where available.
3. Delete one notification.

Expected result:

- Status/context updates correctly.
- Source transaction remains unchanged.
- Deleting notification does not change cash, party, stock, or P&L.

## 50. Testing all Reports

Use the same date range containing all test transactions.

### Consolidated P&L `/reports/consolidated-profit-loss`

Expected checks:

- External sales from Brokerage, Supply, Wastage, and Shop are included.
- Internal Brokerage→Supply and Supply→Shop activity is not double-counted as external revenue.
- Manual expenses, Zakat/Fund payments, write-offs, fuel, maintenance, and processing loss appear in expenses.
- Payroll appears once at accrual, not again at payment.
- Investor deposits/withdrawals are excluded from profit.

### Partner Profit Share `/reports/partner-profit-share`

Expected result:

- Each of three report partners equals Consolidated Net Profit ÷ 3.
- Viewing the report creates no payable and moves no money.

### Outstanding Balances `/reports/outstanding-balances`

Expected checks:

- Credit-sale customers show receivable.
- Credit-purchase farms/brokers show payable.
- Receipts/payments reduce the correct rows.
- Investor capital appears as business payable to investor.
- Shafique farm transfer decreases Farm payable and increases Shafique payable.

### Stock Summary `/reports/stock-summary`

Expected checks:

- Department quantities match Stock pages.
- Live and Dressed Shop stock are separate.
- Purchases/transfers increase stock.
- Sales/write-offs/dressing consumption decrease the correct stock.

### Expense Breakdown `/reports/expense-breakdown`

Expected checks:

- Manual expense Rs 3,000 appears.
- Fuel Rs 6,000 and maintenance Rs 5,000 appear in their categories.
- Stock shrinkage and processing loss appear.
- Filters by date, department, and category reconcile to source records.

### Payroll Summary `/reports/payroll-summary`

Expected checks:

- Base salary Rs 50,000.
- Bonus Rs 5,000.
- Advance deduction Rs 10,000.
- Net payable Rs 45,000.
- Paid Rs 20,000 and remaining Rs 25,000 after partial payment.

## 51. Testing redirects, navigation controls, Refresh, and Back

1. Open `/dashboard`: it must redirect to `/`.
2. Open `/brokerage`, `/supply`, `/wastage`, and `/shop`: each must redirect to its first child page.
3. Open `/fresh-chicken-shop`: it must redirect to Shop Incoming Transfers.
4. Open a nonexistent route: Page Not Found must appear.
5. On every business page, click **Refresh** and verify current server data reloads.
6. Open a detail/statement page and click **Back**.

Expected result:

- Redirects reach correct pages.
- Refresh does not duplicate a transaction.
- Back returns to previous/list page.
- Navigation actions do not alter money or stock.
- `/dev/style-guide`, when enabled in development, has no business effect.

## 52. Final complete reconciliation

After all tests, perform these calculations:

1. For each cash drawer:
   `Ending = starting + all receipts/deposits - all payments/withdrawals`.
2. For each party:
   `Ending receivable/payable = opening + credit transactions - settlements`, using the party-statement sign displayed by the application.
3. For each stock:
   `Ending kg = starting + purchases + transfers in - sales - transfers out - write-offs - processing consumption + dressed output where applicable`.
4. For each investor:
   `Ending = opening + deposits + manual profit + farm transfers - manual loss - withdrawals`.
5. For salary:
   `Remaining salary = base + bonuses - advance recovery - salary withdrawals`.
6. For Zakat/Fund:
   `Still to allocate = active payments - active allocations`.
7. For profit:
   `Net = external revenue + other income - COGS - operating expenses - payroll`.

The system passes acceptance only when:

- Every successful transaction changes all expected balances once.
- Every rejected transaction changes no balance.
- No internal transfer is counted twice in consolidated external revenue.
- Cash movements always appear in the selected cash/bank statement when an account selector was used.
- Party and investor statements agree with their summary cards.
- Cancellation/reversal restores the accounting effect while retaining audit history.

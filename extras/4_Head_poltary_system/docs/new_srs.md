Software Requirements Specification
Poultry Business Management System
Multi-Department Operations, Ledger Accounting & Partner Reporting Platform
Document Version: 1.1
Status: Approved for Development
Date: July 15, 2026
Prepared for: Client (Poultry Business — Brokerage, Supply, Wastage & Fresh Chicken Shop Operations)
Target Stack: NestJS (Repository Pattern) + PostgreSQL

Table of Contents

1. Introduction
   1.1 Purpose
   This Software Requirements Specification (SRS) defines the functional, data, and architectural requirements for a Poultry Business Management System (the “System”). The System is being built as a first version (MVP) for a single business with a small internal user base — the client/owner and a small number of trusted staff. While the user-facing application is intentionally kept simple, the underlying data model and accounting logic are designed to industry-grade standards so that financial records remain accurate, auditable, and extendable as the business grows.
   This document is the single source of truth for what is being built. It is intended to be detailed enough that a development team can design the database, build the API, and implement every screen and workflow without further clarification from the client on core logic.
   1.2 Scope
   The System will digitize and centralize the record-keeping and financial operations of a poultry business that operates across four distinct but related departments:
   Brokerage Department — buys poultry from farms, sells onward at a commission.
   Supply Department — buys poultry via brokers, sells to chicken shop owners at a commission.
   Wastage Department — buys poultry waste from chicken shops, sells to factories at a commission.
   Fresh Chicken Shop Department — buys chicken internally from the Supply Department, sells fresh chicken retail to customers at a profit margin.
   Each department maintains its own purchases, sales, party accounts (farms/brokers/shop owners/customers/factories), vehicles, fuel & maintenance logs, employees, salary/advance/bonus records, and expenses. A centralized expense and reporting layer rolls all departments into one consolidated financial picture, including an equal three-way partner profit split.
   1.3 Intended Audience
   The client/business owner — to review and approve business logic and reports.
   The development team — as the implementation blueprint for backend (NestJS/PostgreSQL) and frontend.
   QA/testers — as the basis for test case design (unit, integration, e2e).
   Future maintainers — as the architectural and data-model reference.
   1.4 Definitions & Abbreviations
   Term
   Meaning
   Department / Head
   One of the four business units: Brokerage, Supply, Wastage, Fresh Chicken Shop.
   Party
   Any external or internal entity the business transacts with: farm, broker, shop owner, customer, factory, or another department.
   Commission / Margin
   The amount added by the client on top of the purchase rate when reselling; the department's gross profit per unit.
   Ledger / Account Statement
   A running record of debits and credits against a party or department, used to determine balances owed or owing.
   Internal Transfer
   A stock and value movement of chicken from the Supply Department to the Fresh Chicken Shop Department, booked as a real internal sale/purchase.
   Stock / Inventory
   The running quantity (in kg) of poultry product held by a department at a point in time.
   Weighted Average Cost (WAC)
   An inventory valuation method where the cost of stock is the running average cost per kg of all purchases to date.
   Advance
   Money paid to an employee ahead of their normal salary cycle, deducted from a future salary payment.
   Bonus
   An additional, non-recurring payment to an employee on top of base salary.
   Soft Delete
   Marking a record inactive (e.g., via a deletedAt timestamp) instead of physically removing it from the database, to preserve audit history.
   Audit Trail
   A record of who created/modified/deleted a row and when, kept for every financially significant table.
   JWT
   JSON Web Token — used for authenticating API requests.
   CRUD
   Create, Read, Update, Delete — the basic data operations exposed by the API.
   MVP
   Minimum Viable Product — the first version of the software, scoped intentionally small.

1.5 Business Context Overview
The client runs a single poultry business with three equal partners, organizationally divided into four departments. Although each department trades a similar underlying commodity (poultry/poultry products), the trading relationships differ:
Department
Buys From
Sells To
Margin Type
Brokerage
External poultry farms
External buyers
Commission per kg
Supply
Brokers (external)
Chicken shop owners
Commission per kg
Wastage
Chicken shop owners (waste)
Factories
Commission per kg
Fresh Chicken Shop
Supply Department (internal)
End customers
Profit margin per kg

The Fresh Chicken Shop's supplier is another department within the same business, not an external party. Section 3.4 and 8.3 detail exactly how this internal transfer is recorded so that it behaves like a real sale for Supply and a real purchase for the Shop, while the consolidated business report does not double count the same chicken as “external revenue” twice. 2. Overall Description
2.1 Product Perspective
This is a new, standalone, internally-used web application. It is not replacing an existing digital system — the client currently tracks these operations manually (registers/ledgers). There is no integration requirement with external accounting software, banks, or government systems in this MVP. The System is a single-tenant application built for one business only; multi-company/multi-tenant support is explicitly out of scope.
2.2 User Roles & Permissions
The MVP uses a small, fixed set of roles. Permissions are enforced at the API layer via JWT-encoded role claims and NestJS guards.
Role
Description
Typical Permissions
Owner / Admin
The client. Full system access.
Full CRUD on all modules, all departments, all financial data, user management, all reports.
Accountant
Trusted staff handling books and payments.
Full CRUD on transactions, ledgers, salaries, expenses. Cannot manage system users or roles. Can view all reports.
Department Staff (optional, per department)
Staff entering day-to-day records for one department only.
Create/Read/Update purchases, sales, vehicle logs, and expenses scoped to their own department only. No access to other departments' data, no access to salary or partner reports.

Role-based access is scoped at the API layer using a departmentId claim/assignment for Department Staff, so a Brokerage staff member cannot read or write Supply, Wastage, or Fresh Chicken Shop data. Owner and Accountant roles are not department-scoped.
2.3 Departments as First-Class Entities
Departments are modeled as a fixed reference table (not user-creatable in the MVP, since the business always has exactly these four), but all transactional tables carry a departmentId so reporting, filtering, and access control are consistent and queryable across the whole system.
2.4 Assumptions
Single currency throughout (no multi-currency support needed).
Single unit of measure: kilograms (kg) for all purchases, sales, and stock.
Single physical location/business; no branch or warehouse-level breakdown beyond department.
Internet connectivity is available where the System is used (no offline-first requirement for MVP).
The client and staff will input data themselves; there is no public-facing customer portal.
Historical paper records are not being bulk-migrated into the System for MVP; the System starts recording from go-live date forward (an opening-balance entry mechanism is provided per party/account so existing balances can be carried in).
2.5 Constraints
Tech stack is fixed: NestJS (backend, repository pattern, feature modules) + PostgreSQL (database).
All monetary values must use the DECIMAL/NUMERIC type (never floating point) to avoid rounding errors in financial calculations.
All financially significant tables must support soft delete and audit trail (createdBy, updatedBy, createdAt, updatedAt, deletedAt).
Authentication is JWT-based; no third-party SSO requirement for MVP.
2.6 Out of Scope for MVP
To keep the first version simple, as requested, the following are explicitly excluded. They are noted here so they can be consciously planned for in a later phase rather than accidentally built now:
Multi-currency support.
Multiple units of measure (count/crates) — system is kg-only.
Mobile native apps (web-responsive only).
Partner drawing/withdrawal tracking — MVP only reports each partner's 1/3 share of net profit; it does not move money or track partner capital accounts.
Full formal double-entry general ledger with trial balance / balance sheet generation — MVP uses a light chart of accounts (Section 3) sufficient for receivables, payables, cash/bank and expense tracking, not full statutory financial statements.
Automated bank reconciliation or payment gateway integration.
Multi-tenant / multi-business support.
Barcode/RFID-based inventory tracking.
Customer-facing storefront or online ordering for the Fresh Chicken Shop. 3. Accounting & Financial Design Strategy
This section defines the financial logic of the System. It is the most important section of this document: getting this model right means every report — balances owed, profit per department, partner shares — is automatically correct and consistent, rather than re-derived by ad-hoc queries that can drift out of sync.
3.1 Light Chart of Accounts
Rather than a full statutory general ledger, the System uses a light chart of accounts: a fixed set of account categories that every transaction posts against. This gives accurate, queryable balances (cash on hand, bank balance, who owes the business, who the business owes, expenses by category) without the overhead of a full accounting package.
Account Category
Examples
Nature
Cash
Petty cash, cash in hand per department
Asset
Bank
Business bank account(s)
Asset
Accounts Receivable
One sub-account per external party (shop owner, customer, buyer) who owes the business money
Asset
Accounts Payable
One sub-account per external party (farm, broker, shop owner selling waste) the business owes money to
Liability
Revenue
Sales revenue, one bucket per department
Income
Cost of Goods Sold (COGS)
Cost of stock sold, one bucket per department
Expense
Operating Expense
Fuel, maintenance, rent, utilities, misc — categorized (Section 3.6, 5.9)
Expense
Payroll
Salaries, advances, bonuses
Expense / Asset (advance is a recoverable asset until offset)

Every party (farm, broker, shop owner, customer, factory) is also a CRM-style record with its own running balance, which is simply the net of its Accounts Receivable and Accounts Payable postings. This is what powers the “Shop owners' accounts” and “Customer accounts” requirements per department.
3.2 Ledger / Transaction Posting Model
Every financial event in the System creates one or more rows in a single central ledger_entries table (Section 5.2). This is a light/simplified form of double-entry: each entry records an account, a party (nullable), a department, a debit or credit amount, and a reference back to the source transaction (purchase, sale, expense, salary payment, etc.). This guarantees:
Every party balance is always derivable by summing their ledger entries — never stored as a mutable cached number that can drift.
Every department's cash/bank position is always derivable the same way.
A full, immutable audit trail of money movement exists for every transaction type.
Posting rules by event type:
Event
Debit
Credit
Purchase (on credit)
Inventory/COGS (department)
Accounts Payable (supplier party)
Purchase (paid cash/bank)
Inventory/COGS (department)
Cash / Bank
Payment made to supplier
Accounts Payable (supplier party)
Cash / Bank
Sale (on credit)
Accounts Receivable (buyer party)
Revenue (department)
Sale (cash/bank received)
Cash / Bank
Revenue (department)
Payment received from buyer
Cash / Bank
Accounts Receivable (buyer party)
Expense paid
Operating Expense (category, department)
Cash / Bank
Salary paid
Payroll Expense (department)
Cash / Bank
Advance paid to employee
Employee Advance (asset, recoverable)
Cash / Bank
Advance recovered (next salary run)
Payroll Expense (gross salary)
Cash/Bank (net) + Employee Advance (recovered amount)
Bonus paid
Payroll Expense (department)
Cash / Bank

3.3 Stock / Inventory Valuation — Weighted Average Cost
Each department (Brokerage, Supply, Wastage, Fresh Chicken Shop) maintains its own independent running stock balance in kilograms, valued using the Weighted Average Cost (WAC) method:
On each purchase: new WAC = (existing stock value + new purchase value) ÷ (existing stock qty + new purchase qty).
On each sale or internal transfer out: stock quantity decreases by the quantity sold; the COGS booked for that sale is quantity × current WAC at the time of sale (not the original purchase rate, since stock from multiple purchases at different rates may be mixed).
On wastage/spoilage write-off (Section 3.5): stock quantity decreases with no corresponding sale revenue; the value written off is quantity × current WAC, booked as a Wastage Loss expense.
WAC was chosen over FIFO/LIFO because poultry stock is not batch-tracked in this MVP (no per-batch IDs requested) and WAC is the simplest method that still produces accurate, defensible COGS — appropriate for a first version.
3.4 Internal Department Transfer: Supply → Fresh Chicken Shop
The Fresh Chicken Shop's only supplier is the Supply Department. Per the confirmed business decision, this is recorded as a real internal sale, not a silent stock move:
An Internal Transfer record is created with a quantity (kg) and an internal transfer rate (price per kg), set by the user at time of transfer — this may equal Supply's normal external selling rate, or a different internally-agreed rate.
On the Supply Department's books: stock decreases by the transferred quantity at Supply's current WAC (COGS); Revenue is booked at quantity × internal transfer rate; an Accounts Receivable entry is created against a special internal party record representing “Fresh Chicken Shop Department.”
On the Fresh Chicken Shop Department's books: stock increases by the transferred quantity at the internal transfer rate (this becomes the Shop's purchase cost, feeding its own WAC); an Accounts Payable entry is created against a special internal party record representing “Supply Department.”
When the Shop settles this internal payable (in cash/bank, recorded as an internal settlement), both the Shop's payable and Supply's receivable against each other are cleared together.
Consolidated, whole-business reporting (Section 9) nets out internal transfers so that the same chicken is not counted as external revenue twice — the consolidated Total Revenue figure excludes inter-department transfer revenue, while each department's individual department-level report still shows it (since it is real activity from that department's point of view).
3.5 Wastage / Spoilage Accounting (Within Brokerage, Supply & Fresh Chicken Shop)
Separate from the dedicated Wastage Department (a distinct revenue-generating business line buying waste from shops and selling to factories), the other three departments can experience inventory loss — dead birds, spoilage, weight loss in transit. Per the confirmed business decision, this is tracked explicitly:
A Stock Write-Off record is created per department: quantity (kg), reason (e.g., Spoilage, Mortality, Transit Loss, Other), optional note, date.
This reduces that department's stock quantity exactly like a sale, but with zero revenue.
The value lost (quantity × current WAC) is booked as a Wastage Loss expense under that department's Operating Expenses, so it correctly reduces departmental profit and is visible in expense reports — distinguishing genuine commercial loss from a department's other costs.
3.6 Salary, Advance & Bonus Accounting
Every department manages its own employees, but the underlying salary structure and accounting treatment is identical and shared across all four departments (Section 5.8):
Each employee has a base monthly salary and belongs to exactly one department.
Advances are recorded as they are paid out during the month, against an employee, with a date and amount. An advance is a recoverable asset (Employee Advance account) until offset.
Bonuses are recorded as one-off additional payments, with a date, amount, and optional reason.
A monthly Salary Run, per employee, computes: Net Payable = Base Salary + Bonuses (for that period) − Advances (outstanding, taken in or carried into that period). The salary run produces a payslip-style record and the corresponding ledger postings (Section 3.2).
Salary expense is attributed to the employee's department, so each department's profit calculation correctly includes its own payroll cost.
3.7 Partner Profit Sharing
There are three partners with equal (1/3 each) ownership. Per the confirmed business decision, the MVP does not track partner capital accounts or money withdrawals — it produces a Partner Profit Share Report:
Consolidated Net Profit for a chosen period = Total External Revenue (all departments, excluding internal transfer revenue) − Total COGS − Total Operating Expenses (including wastage losses) − Total Payroll Expense.
Each partner's share = Consolidated Net Profit ÷ 3.
The report is read-only output; it does not create any ledger postings or change any balances. A later phase can extend this into real partner drawing accounts if the business requires it.
3.8 Worked Numeric Example — Full Cycle
To make the model concrete, a simplified worked example across one day:
Step
Event
Effect
1
Brokerage buys 500kg from Farm A at Rs. 380/kg, on credit
Brokerage stock +500kg @ WAC 380. Accounts Payable (Farm A) +Rs. 190,000.
2
Brokerage sells 500kg to a buyer at Rs. 400/kg (Rs. 20 commission), cash
Brokerage stock −500kg. COGS Rs. 190,000. Revenue Rs. 200,000. Cash +Rs. 200,000. Brokerage gross profit = Rs. 10,000.
3
Supply buys 1000kg via Broker B at Rs. 390/kg, on credit
Supply stock +1000kg @ WAC 390. Accounts Payable (Broker B) +Rs. 390,000.
4
Supply transfers 400kg internally to Fresh Chicken Shop at Rs. 410/kg
Supply stock −400kg, COGS Rs. 156,000, Revenue Rs. 164,000, Receivable (Shop) +Rs. 164,000. Shop stock +400kg @ WAC 410, Payable (Supply) +Rs. 164,000.
5
Supply sells remaining 600kg to Shop Owner C at Rs. 410/kg, on credit
Supply stock −600kg, COGS Rs. 234,000, Revenue Rs. 246,000, Receivable (Shop Owner C) +Rs. 246,000.
6
Fresh Chicken Shop sells 400kg retail at Rs. 430/kg, cash
Shop stock −400kg, COGS Rs. 164,000, Revenue Rs. 172,000, Cash +Rs. 172,000. Shop gross profit = Rs. 8,000.
7
Wastage Dept buys 200kg waste from Shop Owner C at Rs. 40/kg, cash
Wastage stock +200kg @ WAC 40. Cash −Rs. 8,000.
8
Wastage Dept sells 200kg to Factory X at Rs. 55/kg, on credit
Wastage stock −200kg, COGS Rs. 8,000, Revenue Rs. 11,000, Receivable (Factory X) +Rs. 11,000.

Consolidated external revenue for the day = Step 2 (200,000) + Step 5 (246,000) + Step 6 (172,000) + Step 8 (11,000) = Rs. 629,000. Note Step 4's internal transfer revenue (164,000) is excluded from the consolidated figure since it is intra-business, not external sales — but it remains fully visible in Supply's own department report. 4. System Architecture
4.1 Tech Stack
Layer
Technology
Backend Framework
NestJS (Node.js / TypeScript)
Database
PostgreSQL
ORM / Query Layer
TypeORM or Prisma (repository pattern wraps either choice — see 4.3)
Authentication
JWT (access token; refresh token recommended for session longevity)
API Style
RESTful JSON API
Testing
Jest (unit), Jest + test DB (integration), Supertest (e2e) — see Section 11

4.2 High-Level Module Architecture
The backend is organized into NestJS feature modules, each owning its own controllers, services, repositories, and entities. Shared/cross-cutting modules provide common building blocks consumed by the department modules.
Shared / Core Modules
AuthModule — login, JWT issuance/validation, guards, role decorators.
UsersModule — system users (Owner, Accountant, Department Staff).
DepartmentsModule — fixed reference data for the four departments.
PartiesModule — shared party records (farms, brokers, shop owners, customers, factories) with type discrimination.
LedgerModule — the central ledger_entries table, posting service used by every other module.
InventoryModule — per-department stock balance and WAC calculation service, stock write-offs.
VehiclesModule — vehicles, fuel logs, maintenance logs (shared structure, department-scoped).
EmployeesModule — employees, salary runs, advances, bonuses (shared structure, department-scoped).
ExpensesModule — centralized expense categories and expense entries, department-scoped.
ReportsModule — cross-department and per-department financial reports, partner profit share.
AuditModule — shared audit interceptor/subscriber applied to all financially significant entities.
Department Modules
BrokerageModule — Brokerage purchases, sales; composes PartiesModule, LedgerModule, InventoryModule.
SupplyModule — Supply purchases, sales to shops, internal transfers out to Fresh Chicken Shop.
WastageModule — Wastage purchases (from shops), sales (to factories).
FreshChickenShopModule — internal purchases (from Supply), retail sales to customers, inventory.
Department modules do not duplicate vehicle/employee/expense logic — they consume the shared modules, passing their own departmentId. This keeps the four department modules thin (purchase/sale logic + their specific party types) while guaranteeing identical, consistent behavior for vehicles, payroll, and expenses everywhere, as required.
4.3 Repository Pattern & Layering
Each module follows a strict layered structure:
Controller — HTTP routing, request validation (DTOs with class-validator), auth guards. No business logic.
Service — business logic and orchestration (e.g., “record a sale” = create sale row + decrement stock + post ledger entries, wrapped in a DB transaction).
Repository — data access abstraction over the ORM; one repository per entity/aggregate. Services depend on repository interfaces, not directly on the ORM, so persistence concerns stay isolated and testable/mockable.
Entity — the TypeORM/Prisma model mapped to its PostgreSQL table.
Multi-table operations (e.g., a sale that touches the sales table, inventory table, and ledger_entries table) are wrapped in a single database transaction at the service layer so the system can never end up in a partially-posted state.
4.4 Auth & Security
JWT-based authentication; tokens carry userId, role, and (for Department Staff) departmentId.
Passwords hashed with bcrypt/argon2; never stored or logged in plain text.
Role guards (RolesGuard) and a DepartmentScopeGuard enforce the access matrix in Section 2.2.
All write endpoints require authentication; no anonymous access.
Input validation via DTOs on every endpoint (class-validator) to reject malformed or out-of-range financial values before they reach the service layer.
4.5 Database Conventions
Convention
Rule
Money columns
DECIMAL(14,2) — never FLOAT/REAL. Quantities in kg use DECIMAL(12,3) to allow fractional kg.
Primary keys
UUID (gen_random_uuid()) for all tables — avoids exposing sequential business volume and simplifies future multi-instance use.
Soft delete
deletedAt TIMESTAMPTZ NULL on every financially significant table; default queries filter deletedAt IS NULL.
Audit columns
createdAt, updatedAt (TIMESTAMPTZ, auto-managed), createdBy, updatedBy (UUID FK to users) on every financially significant table.
Timestamps
All TIMESTAMPTZ (timezone-aware), stored in UTC.
Foreign keys
Always indexed; ON DELETE RESTRICT for financial references (never cascade-delete a party/department that has transaction history).
Naming
snake_case for tables/columns in PostgreSQL; camelCase in TypeScript entities (ORM handles mapping).
Enums
PostgreSQL ENUM types (or CHECK constraints) for fixed value sets: department type, party type, transaction status, payment method, etc.

5. Database Design
   This section defines every table in the System: its columns, types, and constraints. All tables additionally include the standard audit columns (createdAt, updatedAt, createdBy, updatedBy, deletedAt) described in Section 4.5 unless explicitly noted as pure reference/lookup tables, which omit createdBy/updatedBy/deletedAt for simplicity. Primary keys are UUID on every table unless noted.
   5.1 Entity Overview
   Tables fall into five groups:
   Core/Shared — users, departments, parties, ledger, accounts.
   Department Transactional — purchases & sales per department (Brokerage, Supply, Wastage, Fresh Chicken Shop) plus the Supply→Shop internal transfer.
   Inventory — per-department running stock + stock write-offs.
   Shared Operational — vehicles, fuel logs, maintenance logs, employees, salary runs, advances, bonuses, expenses.
   Audit — a generic audit log capturing all create/update/delete activity.
   5.2 Core / Shared Tables
   5.2.1 users
   Column
   Type
   Constraints
   Notes
   id
   UUID
   PK
   gen_random_uuid()
   full_name
   VARCHAR(150)
   NOT NULL

email
VARCHAR(150)
NOT NULL, UNIQUE
Login identifier
password_hash
VARCHAR(255)
NOT NULL
bcrypt/argon2 hash
role
ENUM('owner','accountant','department_staff')
NOT NULL
See Section 2.2
department_id
UUID
FK → departments.id, NULLABLE
Set only for department_staff role
phone
VARCHAR(30)
NULLABLE

is_active
BOOLEAN
NOT NULL DEFAULT true
Disable login without deleting
created_at / updated_at / deleted_at
TIMESTAMPTZ
see 4.5

5.2.2 departments
Reference table, fixed at 4 rows, seeded at setup.
Column
Type
Constraints
Notes
id
UUID
PK

code
ENUM('brokerage','supply','wastage','fresh_chicken_shop')
NOT NULL, UNIQUE
Stable code used in business logic
name
VARCHAR(100)
NOT NULL
Display name
created_at
TIMESTAMPTZ
DEFAULT now()

5.2.3 parties
A unified table for every external entity the business transacts with, discriminated by type. Internal “virtual parties” representing departments (used for internal transfer postings, Section 3.4) are also rows here with party_type = 'internal_department'.
Column
Type
Constraints
Notes
id
UUID
PK

party_type
ENUM('farm','broker','shop_owner','customer','factory','internal_department')
NOT NULL
Discriminator
name
VARCHAR(150)
NOT NULL

phone
VARCHAR(30)
NULLABLE

address
VARCHAR(255)
NULLABLE

linked_department_id
UUID
FK → departments.id, NULLABLE
Set only when party_type = internal_department
primary_department_id
UUID
FK → departments.id, NULLABLE
Which department this party is mainly associated with, for filtering (e.g. a shop owner under Supply)
opening_balance
DECIMAL(14,2)
NOT NULL DEFAULT 0
Carried-in balance at go-live; positive = party owes business
notes
TEXT
NULLABLE

created_at / updated_at / deleted_at
TIMESTAMPTZ
see 4.5

Using one polymorphic parties table (rather than separate farms/brokers/shop_owners/customers/factories tables) means the ledger, accounts-receivable, and accounts-payable logic is written once and works identically for every party type — directly serving the “keep it simple” goal while remaining correct.
5.2.4 chart_of_accounts
Reference table seeded at setup; represents the account categories from Section 3.1.
Column
Type
Constraints
Notes
id
UUID
PK

code
ENUM('cash','bank','accounts_receivable','accounts_payable','revenue','cogs','operating_expense','payroll_expense','employee_advance')
NOT NULL, UNIQUE

name
VARCHAR(100)
NOT NULL

account_nature
ENUM('asset','liability','income','expense')
NOT NULL
Determines debit/credit sign convention

5.2.5 ledger_entries
The central posting table described in Section 3.2. Every financial event in the system writes one or more rows here. Immutable once created (corrections are made via a reversing entry, never an UPDATE, to preserve the audit trail).
Column
Type
Constraints
Notes
id
UUID
PK

department_id
UUID
FK → departments.id, NOT NULL
Which department this entry belongs to
account_id
UUID
FK → chart_of_accounts.id, NOT NULL

party_id
UUID
FK → parties.id, NULLABLE
Set for receivable/payable entries
entry_type
ENUM('debit','credit')
NOT NULL

amount
DECIMAL(14,2)
NOT NULL, CHECK (amount > 0)

entry_date
DATE
NOT NULL
Business date, may differ from created_at
source_type
ENUM('purchase','sale','internal_transfer','payment','expense','salary','advance','bonus','stock_writeoff','opening_balance')
NOT NULL
What kind of transaction generated this entry
source_id
UUID
NOT NULL
PK of the source transaction row (polymorphic reference)
description
VARCHAR(255)
NULLABLE
Free-text memo
created_at / created_by
TIMESTAMPTZ / UUID
see 4.5
No updated_at/deleted_at — entries are immutable

Indexing: composite index on (department_id, entry_date), (party_id), and (source_type, source_id) since balance and statement queries filter on these constantly.
5.3 Inventory Tables (Shared Structure, Department-Scoped)
5.3.1 stock_balances
One row per department, holding the current running quantity and weighted average cost. Updated transactionally alongside every purchase, sale, internal transfer, and write-off.
Column
Type
Constraints
Notes
id
UUID
PK

department_id
UUID
FK → departments.id, NOT NULL, UNIQUE
One row per department
quantity_kg
DECIMAL(12,3)
NOT NULL DEFAULT 0, CHECK (quantity_kg >= 0)
Current stock on hand
weighted_avg_cost
DECIMAL(14,2)
NOT NULL DEFAULT 0
Current cost per kg
updated_at
TIMESTAMPTZ
auto

5.3.2 stock_movements
An append-only log of every change to stock_balances, for audit and reconstruction (stock_balances is a derivable cache; this table is the source of truth, mirroring the ledger_entries pattern).
Column
Type
Constraints
Notes
id
UUID
PK

department_id
UUID
FK → departments.id, NOT NULL

movement_type
ENUM('purchase_in','sale_out','transfer_in','transfer_out','writeoff_out','opening_stock')
NOT NULL

quantity_kg
DECIMAL(12,3)
NOT NULL, CHECK (quantity_kg > 0)
Always positive; direction implied by movement_type
rate_per_kg
DECIMAL(14,2)
NOT NULL
Purchase rate, or WAC at time of sale/transfer/writeoff
resulting_wac
DECIMAL(14,2)
NOT NULL
Snapshot of WAC after this movement
source_type
ENUM('purchase','sale','internal_transfer','stock_writeoff','opening_balance')
NOT NULL

source_id
UUID
NOT NULL
Polymorphic reference to source transaction
movement_date
DATE
NOT NULL

created_at / created_by
TIMESTAMPTZ / UUID
see 4.5

5.3.3 stock_writeoffs
Wastage/spoilage within Brokerage, Supply, or Fresh Chicken Shop (Section 3.5). Note: this is distinct from the Wastage Department's own purchase/sale business, which uses wastage_purchases / wastage_sales (Section 5.5).
Column
Type
Constraints
Notes
id
UUID
PK

department_id
UUID
FK → departments.id, NOT NULL, CHECK department in (brokerage, supply, fresh_chicken_shop)

quantity_kg
DECIMAL(12,3)
NOT NULL, CHECK (quantity_kg > 0)

reason
ENUM('spoilage','mortality','transit_loss','other')
NOT NULL

note
VARCHAR(255)
NULLABLE

writeoff_date
DATE
NOT NULL

valuation_amount
DECIMAL(14,2)
NOT NULL
quantity_kg × WAC at time of writeoff, snapshotted
created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

5.4 Brokerage Department Tables
5.4.1 brokerage_purchases
Column
Type
Constraints
Notes
id
UUID
PK

farm_party_id
UUID
FK → parties.id (party_type=farm), NOT NULL

quantity_kg
DECIMAL(12,3)
NOT NULL, CHECK (> 0)

rate_per_kg
DECIMAL(14,2)
NOT NULL, CHECK (> 0)
Farm's rate
total_amount
DECIMAL(14,2)
NOT NULL
quantity_kg × rate_per_kg, generated/validated
payment_method
ENUM('cash','bank','credit')
NOT NULL
credit = on Accounts Payable
amount_paid
DECIMAL(14,2)
NOT NULL DEFAULT 0
Allows partial payment at time of purchase
purchase_date
DATE
NOT NULL

vehicle_id
UUID
FK → vehicles.id, NULLABLE
Which vehicle collected this purchase
notes
VARCHAR(255)
NULLABLE

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

5.4.2 brokerage_sales
Column
Type
Constraints
Notes
id
UUID
PK

buyer_party_id
UUID
FK → parties.id, NOT NULL
Onward buyer
quantity_kg
DECIMAL(12,3)
NOT NULL, CHECK (> 0)

rate_per_kg
DECIMAL(14,2)
NOT NULL, CHECK (> 0)
Selling rate (purchase rate + commission)
commission_per_kg
DECIMAL(14,2)
NOT NULL
rate_per_kg − WAC at sale time, snapshotted for reporting
total_amount
DECIMAL(14,2)
NOT NULL

payment_method
ENUM('cash','bank','credit')
NOT NULL

amount_received
DECIMAL(14,2)
NOT NULL DEFAULT 0

sale_date
DATE
NOT NULL

vehicle_id
UUID
FK → vehicles.id, NULLABLE

notes
VARCHAR(255)
NULLABLE

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

Brokerage's own employees, vehicles, fuel/maintenance logs, and expenses use the shared tables in Section 5.7–5.9, filtered by department_id = Brokerage. The same applies to every department below — their dedicated tables here cover only what's unique to that department's trade (purchases/sales/parties).
5.5 Supply Department Tables
5.5.1 supply_purchases
Column
Type
Constraints
Notes
id
UUID
PK

broker_party_id
UUID
FK → parties.id (party_type=broker), NOT NULL

quantity_kg
DECIMAL(12,3)
NOT NULL, CHECK (> 0)

rate_per_kg
DECIMAL(14,2)
NOT NULL, CHECK (> 0)
Agreed broker rate
total_amount
DECIMAL(14,2)
NOT NULL

payment_method
ENUM('cash','bank','credit')
NOT NULL

amount_paid
DECIMAL(14,2)
NOT NULL DEFAULT 0

purchase_date
DATE
NOT NULL

vehicle_id
UUID
FK → vehicles.id, NULLABLE

notes
VARCHAR(255)
NULLABLE

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

5.5.2 supply_sales
Sales from Supply to external chicken shop owners. (The Supply → Fresh Chicken Shop internal movement uses the separate internal_transfers table, 5.5.3, not this table.)
Column
Type
Constraints
Notes
id
UUID
PK

shop_owner_party_id
UUID
FK → parties.id (party_type=shop_owner), NOT NULL

quantity_kg
DECIMAL(12,3)
NOT NULL, CHECK (> 0)

rate_per_kg
DECIMAL(14,2)
NOT NULL, CHECK (> 0)

commission_per_kg
DECIMAL(14,2)
NOT NULL
Snapshotted at sale time
total_amount
DECIMAL(14,2)
NOT NULL

payment_method
ENUM('cash','bank','credit')
NOT NULL

amount_received
DECIMAL(14,2)
NOT NULL DEFAULT 0

sale_date
DATE
NOT NULL

vehicle_id
UUID
FK → vehicles.id, NULLABLE

notes
VARCHAR(255)
NULLABLE

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

5.5.3 internal_transfers
Implements the Supply → Fresh Chicken Shop internal sale described in Section 3.4. Generalized with a from/to department pair in case a similar internal flow is needed in a later phase, though MVP only uses Supply → Fresh Chicken Shop.
Column
Type
Constraints
Notes
id
UUID
PK

from_department_id
UUID
FK → departments.id, NOT NULL
Supply, in MVP
to_department_id
UUID
FK → departments.id, NOT NULL
Fresh Chicken Shop, in MVP
quantity_kg
DECIMAL(12,3)
NOT NULL, CHECK (> 0)

internal_rate_per_kg
DECIMAL(14,2)
NOT NULL, CHECK (> 0)
Agreed internal transfer price
total_amount
DECIMAL(14,2)
NOT NULL

settlement_status
ENUM('unsettled','partially_settled','settled')
NOT NULL DEFAULT 'unsettled'

amount_settled
DECIMAL(14,2)
NOT NULL DEFAULT 0

transfer_date
DATE
NOT NULL

vehicle_id
UUID
FK → vehicles.id, NULLABLE

notes
VARCHAR(255)
NULLABLE

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

5.6 Wastage Department Tables
5.6.1 wastage_purchases
Buying poultry waste from chicken shop owners. Reuses party_type = 'shop_owner' — a shop owner can sell waste to the Wastage Department and separately buy chicken from Supply; both relationships key off the same parties row, but balances are tracked per department via department-scoped ledger entries.
Column
Type
Constraints
Notes
id
UUID
PK

shop_owner_party_id
UUID
FK → parties.id (party_type=shop_owner), NOT NULL

quantity_kg
DECIMAL(12,3)
NOT NULL, CHECK (> 0)

rate_per_kg
DECIMAL(14,2)
NOT NULL, CHECK (> 0)

total_amount
DECIMAL(14,2)
NOT NULL

payment_method
ENUM('cash','bank','credit')
NOT NULL

amount_paid
DECIMAL(14,2)
NOT NULL DEFAULT 0

purchase_date
DATE
NOT NULL

vehicle_id
UUID
FK → vehicles.id, NULLABLE

notes
VARCHAR(255)
NULLABLE

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

5.6.2 wastage_sales
Column
Type
Constraints
Notes
id
UUID
PK

factory_party_id
UUID
FK → parties.id (party_type=factory), NOT NULL

quantity_kg
DECIMAL(12,3)
NOT NULL, CHECK (> 0)

rate_per_kg
DECIMAL(14,2)
NOT NULL, CHECK (> 0)

commission_per_kg
DECIMAL(14,2)
NOT NULL
Snapshotted at sale time
total_amount
DECIMAL(14,2)
NOT NULL

payment_method
ENUM('cash','bank','credit')
NOT NULL

amount_received
DECIMAL(14,2)
NOT NULL DEFAULT 0

sale_date
DATE
NOT NULL

vehicle_id
UUID
FK → vehicles.id, NULLABLE

notes
VARCHAR(255)
NULLABLE

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

5.7 Fresh Chicken Shop Department Tables
5.7.1 shop_purchases
Internal purchases from Supply are recorded via internal_transfers (5.5.3) from the Shop's receiving side — the Shop does not need a separate purchases table, since its only source is the internal transfer. This table is reserved for the rare case of a direct external purchase if the business ever needs it, and is not used by the primary MVP flow (see Section 8.3).
Column
Type
Constraints
Notes
id
UUID
PK

source_type
ENUM('internal_transfer','external')
NOT NULL DEFAULT 'internal_transfer'

external_party_id
UUID
FK → parties.id, NULLABLE
Only set if source_type = external
quantity_kg
DECIMAL(12,3)
NOT NULL, CHECK (> 0)

rate_per_kg
DECIMAL(14,2)
NOT NULL, CHECK (> 0)

purchase_date
DATE
NOT NULL

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

5.7.2 shop_sales
Column
Type
Constraints
Notes
id
UUID
PK

customer_party_id
UUID
FK → parties.id (party_type=customer), NOT NULL

quantity_kg
DECIMAL(12,3)
NOT NULL, CHECK (> 0)

rate_per_kg
DECIMAL(14,2)
NOT NULL, CHECK (> 0)

profit_margin_per_kg
DECIMAL(14,2)
NOT NULL
rate_per_kg − WAC at sale time, snapshotted
total_amount
DECIMAL(14,2)
NOT NULL

payment_method
ENUM('cash','bank','credit')
NOT NULL

amount_received
DECIMAL(14,2)
NOT NULL DEFAULT 0

sale_date
DATE
NOT NULL

notes
VARCHAR(255)
NULLABLE

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

5.8 Shared: Vehicles, Fuel & Maintenance
Per the confirmed business decision, each vehicle is dedicated to exactly one department (no cross-department sharing). The structure below is shared code used by all four departments.
5.8.1 vehicles
Column
Type
Constraints
Notes
id
UUID
PK

department_id
UUID
FK → departments.id, NOT NULL
Owning department — fixed, not shared
registration_number
VARCHAR(30)
NOT NULL, UNIQUE

vehicle_type
VARCHAR(50)
NULLABLE
e.g., Mazda Truck, Pickup, Loader
driver_name
VARCHAR(100)
NULLABLE

is_active
BOOLEAN
NOT NULL DEFAULT true

notes
VARCHAR(255)
NULLABLE

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

5.8.2 vehicle_fuel_logs
Column
Type
Constraints
Notes
id
UUID
PK

vehicle_id
UUID
FK → vehicles.id, NOT NULL

fuel_date
DATE
NOT NULL

liters
DECIMAL(8,2)
NOT NULL, CHECK (> 0)

rate_per_liter
DECIMAL(10,2)
NOT NULL, CHECK (> 0)

total_amount
DECIMAL(12,2)
NOT NULL

odometer_reading
DECIMAL(10,1)
NULLABLE

payment_method
ENUM('cash','bank')
NOT NULL

notes
VARCHAR(255)
NULLABLE

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

5.8.3 vehicle_maintenance_logs
Column
Type
Constraints
Notes
id
UUID
PK

vehicle_id
UUID
FK → vehicles.id, NOT NULL

maintenance_date
DATE
NOT NULL

maintenance_type
VARCHAR(100)
NOT NULL
e.g., Oil Change, Tyre Replacement, Repair
description
VARCHAR(255)
NULLABLE

cost
DECIMAL(12,2)
NOT NULL, CHECK (>= 0)

vendor_name
VARCHAR(100)
NULLABLE

payment_method
ENUM('cash','bank')
NOT NULL

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

Fuel and maintenance costs post to the Operating Expense account under the vehicle's department (Section 3.2/3.6 posting pattern), category = 'Vehicle Fuel' / 'Vehicle Maintenance', so they automatically appear in that department's expense and profit reports.
5.9 Shared: Employees, Salary, Advance & Bonus
5.9.1 employees
Column
Type
Constraints
Notes
id
UUID
PK

department_id
UUID
FK → departments.id, NOT NULL
Each employee belongs to exactly one department
full_name
VARCHAR(150)
NOT NULL

designation
VARCHAR(100)
NULLABLE
e.g., Driver, Helper, Salesman
phone
VARCHAR(30)
NULLABLE

cnic_or_id_number
VARCHAR(30)
NULLABLE

base_salary
DECIMAL(12,2)
NOT NULL, CHECK (>= 0)
Monthly base
joining_date
DATE
NOT NULL

is_active
BOOLEAN
NOT NULL DEFAULT true

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

5.9.2 employee_advances
Column
Type
Constraints
Notes
id
UUID
PK

employee_id
UUID
FK → employees.id, NOT NULL

amount
DECIMAL(12,2)
NOT NULL, CHECK (> 0)

advance_date
DATE
NOT NULL

reason
VARCHAR(255)
NULLABLE

recovery_status
ENUM('outstanding','partially_recovered','fully_recovered')
NOT NULL DEFAULT 'outstanding'

amount_recovered
DECIMAL(12,2)
NOT NULL DEFAULT 0

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

5.9.3 employee_bonuses
Column
Type
Constraints
Notes
id
UUID
PK

employee_id
UUID
FK → employees.id, NOT NULL

amount
DECIMAL(12,2)
NOT NULL, CHECK (> 0)

bonus_date
DATE
NOT NULL

reason
VARCHAR(255)
NULLABLE
e.g., Eid Bonus, Performance Bonus
created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

5.9.4 salary_runs
One row per employee per pay period, generated by the monthly salary run process (Section 8.6).
Column
Type
Constraints
Notes
id
UUID
PK

employee_id
UUID
FK → employees.id, NOT NULL

period_month
SMALLINT
NOT NULL, CHECK (1-12)

period_year
SMALLINT
NOT NULL

base_salary
DECIMAL(12,2)
NOT NULL
Snapshotted from employee at run time
total_bonuses
DECIMAL(12,2)
NOT NULL DEFAULT 0
Sum of bonuses in period
total_advances_deducted
DECIMAL(12,2)
NOT NULL DEFAULT 0
Sum of advances recovered this run
net_payable
DECIMAL(12,2)
NOT NULL
base_salary + total_bonuses − total_advances_deducted
payment_status
ENUM('pending','paid')
NOT NULL DEFAULT 'pending'

paid_date
DATE
NULLABLE

payment_method
ENUM('cash','bank')
NULLABLE

created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

UNIQUE
(employee_id, period_month, period_year)
Constraint
Prevents double salary run for same period

5.10 Shared: Centralized Expense Management
5.10.1 expense_categories
Seeded with common categories; new categories can be added by the Owner/Accountant.
Column
Type
Constraints
Notes
id
UUID
PK

name
VARCHAR(100)
NOT NULL, UNIQUE
e.g., Rent, Utilities, Office Supplies, Vehicle Fuel, Vehicle Maintenance, Wastage Loss, Miscellaneous
is_system_generated
BOOLEAN
NOT NULL DEFAULT false
true for Vehicle Fuel/Maintenance/Wastage Loss, auto-posted by other modules

5.10.2 expenses
Column
Type
Constraints
Notes
id
UUID
PK

department_id
UUID
FK → departments.id, NOT NULL
Every expense belongs to one department for accurate per-department profit
category_id
UUID
FK → expense_categories.id, NOT NULL

amount
DECIMAL(12,2)
NOT NULL, CHECK (> 0)

expense_date
DATE
NOT NULL

payment_method
ENUM('cash','bank')
NOT NULL

description
VARCHAR(255)
NULLABLE

source_type
ENUM('manual','vehicle_fuel','vehicle_maintenance','stock_writeoff')
NOT NULL DEFAULT 'manual'
Distinguishes user-entered vs system-generated expenses
source_id
UUID
NULLABLE
FK to originating row when source_type ≠ manual
created_at / created_by / updated_at / updated_by / deleted_at
see 4.5

Vehicle fuel/maintenance entries (5.8.2, 5.8.3) and stock write-offs (5.3.3) automatically create a corresponding row here (source_type set accordingly) so that the Expenses module gives the client one single, centralized view of every cost across the business, fulfilling the General Requirement in the original brief, without requiring duplicate manual entry.
5.11 Audit Log
5.11.1 audit_logs
A generic, append-only log capturing all create/update/delete actions on financially significant tables, in addition to the per-row createdBy/updatedBy columns. Useful for “who changed what, when” investigations beyond the latest state.
Column
Type
Constraints
Notes
id
UUID
PK

table_name
VARCHAR(100)
NOT NULL

record_id
UUID
NOT NULL

action
ENUM('create','update','delete')
NOT NULL

changed_by
UUID
FK → users.id, NOT NULL

changes
JSONB
NULLABLE
Before/after diff of changed fields
created_at
TIMESTAMPTZ
DEFAULT now()

6. Functional Requirements
   Requirements are grouped by department, then by the shared modules each department relies on. Each requirement is phrased so it can be turned directly into an acceptance test.
   6.1 Brokerage Department
   FR-BR-1: User can record a purchase from a farm, specifying farm, quantity (kg), rate/kg, payment method, and amount paid; system computes total and updates Brokerage stock & WAC.
   FR-BR-2: User can record a sale to a buyer, specifying buyer, quantity (kg), selling rate/kg; system computes commission/kg as selling rate − current WAC, validates quantity ≤ available stock, and updates stock.
   FR-BR-3: User can view, edit (with audit trail), and soft-delete purchase/sale records, subject to role permissions.
   FR-BR-4: User can view a running account statement (ledger) for any farm or buyer party, showing all transactions and current balance.
   FR-BR-5: User can record outgoing payments to farms and incoming payments from buyers against outstanding balances (full or partial).
   FR-BR-6: User can manage Brokerage vehicles, fuel logs, and maintenance logs (shared module, Section 6.6).
   FR-BR-7: User can manage Brokerage employees and run salaries with advances/bonuses (shared module, Section 6.7).
   FR-BR-8: User can record Brokerage-specific expenses and stock write-offs (spoilage/mortality/transit loss).
   FR-BR-9: System provides a Brokerage department profit report for any date range: Revenue − COGS − Operating Expenses − Payroll = Net Profit.
   6.2 Supply Department
   FR-SU-1: User can record a purchase from a broker (quantity, rate, payment method); updates Supply stock & WAC.
   FR-SU-2: User can record a sale to a shop owner (quantity, rate); system computes commission/kg, validates available stock, updates stock.
   FR-SU-3: User can record an internal transfer of stock to the Fresh Chicken Shop Department, specifying quantity and internal transfer rate; system books it as a real sale on Supply's side (Section 3.4) and validates available stock.
   FR-SU-4: User can record settlement (payment) of internal transfer balances between Supply and Fresh Chicken Shop.
   FR-SU-5: User can view, edit, and soft-delete purchase/sale/transfer records, subject to role permissions.
   FR-SU-6: User can view a running account statement for any broker or shop owner party.
   FR-SU-7: User can record payments to brokers and from shop owners.
   FR-SU-8: User can manage Supply vehicles, fuel logs, maintenance logs, employees, salaries, expenses, and stock write-offs (shared modules).
   FR-SU-9: System provides a Supply department profit report including and excluding internal transfer activity, so the client can see both the department's own performance and its external-only contribution to consolidated profit.
   6.3 Wastage Department
   FR-WA-1: User can record a waste purchase from a shop owner (quantity, rate); updates Wastage stock & WAC.
   FR-WA-2: User can record a sale to a factory (quantity, rate); system computes commission/kg, validates stock, updates stock.
   FR-WA-3: User can view, edit, and soft-delete purchase/sale records, subject to role permissions.
   FR-WA-4: User can view a running account statement for any shop owner (waste-selling) or factory party.
   FR-WA-5: User can record payments to shop owners and from factories.
   FR-WA-6: User can manage Wastage vehicles, fuel logs, maintenance logs, employees, salaries, and expenses (shared modules).
   FR-WA-7: System provides a Wastage department profit report for any date range.
   6.4 Fresh Chicken Shop Department
   FR-FC-1: User can view incoming stock received via internal transfer from Supply (read access into internal_transfers scoped to this department).
   FR-FC-2: User can record a retail sale to a customer (quantity, rate); system computes profit margin/kg as selling rate − current WAC, validates stock, updates stock.
   FR-FC-3: User can view, edit, and soft-delete sale records, subject to role permissions.
   FR-FC-4: User can view a running account statement for any customer (for customers who buy on credit).
   FR-FC-5: User can record payments received from customers.
   FR-FC-6: User can manage Fresh Chicken Shop employees, salaries, and expenses (shared modules); vehicles only if the shop operates its own delivery vehicle.
   FR-FC-7: User can record stock write-offs (spoilage) specific to retail-held stock.
   FR-FC-8: User can view current stock-on-hand (kg) and WAC at any time.
   FR-FC-9: System provides a Fresh Chicken Shop profit report for any date range.
   6.5 Centralized Expense Management
   FR-EX-1: User can record a manual expense against any department and category, with amount, date, payment method, and description.
   FR-EX-2: User can manage (add/rename) expense categories.
   FR-EX-3: System automatically creates expense records from vehicle fuel logs, vehicle maintenance logs, and stock write-offs (source_type tagging, Section 5.10.2) so no double entry is required.
   FR-EX-4: User can view all expenses across the whole business, filterable by department, category, and date range.
   FR-EX-5: User can view a total expense breakdown (by department, by category) for any date range.
   6.6 Vehicle Management (Shared)
   FR-VH-1: User can register a vehicle under exactly one department.
   FR-VH-2: User can record a fuel log entry against a vehicle (liters, rate, date, odometer); system computes total cost and posts an Operating Expense under the vehicle's department.
   FR-VH-3: User can record a maintenance log entry against a vehicle (type, description, cost, vendor); system posts an Operating Expense under the vehicle's department.
   FR-VH-4: User can view a full fuel and maintenance history per vehicle, with running total cost.
   FR-VH-5: User can deactivate (soft-delete) a vehicle without losing its history.
   6.7 Employee & Salary Management (Shared)
   FR-EM-1: User can register an employee under exactly one department, with base salary.
   FR-EM-2: User can record an advance against an employee at any time.
   FR-EM-3: User can record a bonus against an employee at any time.
   FR-EM-4: User can run a monthly salary run per employee (or in batch, per department), which computes net payable per Section 3.6, marks outstanding advances as recovered up to the deducted amount, and produces a payslip-style record.
   FR-EM-5: User can mark a salary run as paid, specifying date and payment method.
   FR-EM-6: User can view an employee's full history: base salary changes, advances, bonuses, and salary runs.
   FR-EM-7: User can view a department's total payroll cost for any date range.
   6.8 Reporting Module
   FR-RP-1: System provides a per-department Profit & Loss summary (Revenue, COGS, Gross Profit, Operating Expenses, Payroll, Net Profit) for any date range.
   FR-RP-2: System provides a consolidated whole-business Profit & Loss summary across all departments, correctly excluding internal transfer revenue from the external revenue total (Section 3.7).
   FR-RP-3: System provides a Partner Profit Share report: consolidated net profit ÷ 3, for any date range.
   FR-RP-4: System provides a Party Statement report: full transaction and payment history with running balance, for any party.
   FR-RP-5: System provides an Outstanding Balances report: all parties with a non-zero receivable or payable balance, business-wide or per department.
   FR-RP-6: System provides a Stock Summary report: current quantity and WAC per department, plus a movement history for any date range.
   FR-RP-7: System provides an Expense Breakdown report (by department, by category) for any date range.
   FR-RP-8: System provides a Payroll Summary report (by department, by employee) for any date range.
7. CRUD / API Operation Catalog
   All endpoints are prefixed with /api/v1. All write operations require a valid JWT and are subject to the role/department guards defined in Section 2.2 and 4.4. List endpoints support pagination (?page, ?limit), date-range filters (?from, ?to), and department filters (?departmentId) where applicable. Standard response envelope and error format are assumed consistent across all modules.
   7.1 Convention
   GET /resource — list (paginated, filterable)
   GET /resource/:id — retrieve one
   POST /resource — create
   PATCH /resource/:id — partial update
   DELETE /resource/:id — soft delete
   Action-style endpoints (e.g., posting a payment, running payroll) are modeled as POST /resource/:id/action-name
   7.2 Auth & Users
   Method
   Endpoint
   Description
   POST
   /auth/login
   Authenticate, returns JWT access (+refresh) token
   POST
   /auth/refresh
   Exchange refresh token for new access token
   GET
   /users
   List system users (Owner only)
   POST
   /users
   Create a system user (Owner only)
   PATCH
   /users/:id
   Update user (role, active status) (Owner only)
   DELETE
   /users/:id
   Deactivate user (Owner only)

7.3 Parties
Method
Endpoint
Description
GET
/parties?type=&departmentId=
List parties, filterable by type and department
GET
/parties/:id
Retrieve a party
POST
/parties
Create a party (farm/broker/shop_owner/customer/factory)
PATCH
/parties/:id
Update party details
DELETE
/parties/:id
Soft delete party
GET
/parties/:id/statement
Full ledger statement & running balance for this party
POST
/parties/:id/payments
Record a payment to/from this party

7.4 Brokerage Module
Method
Endpoint
Description
GET/POST
/brokerage/purchases
List / create Brokerage purchases
GET/PATCH/DELETE
/brokerage/purchases/:id
Retrieve / update / soft-delete a purchase
GET/POST
/brokerage/sales
List / create Brokerage sales
GET/PATCH/DELETE
/brokerage/sales/:id
Retrieve / update / soft-delete a sale
GET
/brokerage/stock
Current stock & WAC for Brokerage
POST
/brokerage/stock/writeoffs
Record a stock write-off
GET
/brokerage/reports/profit-loss
Brokerage P&L for a date range

7.5 Supply Module
Method
Endpoint
Description
GET/POST
/supply/purchases
List / create Supply purchases
GET/PATCH/DELETE
/supply/purchases/:id
Retrieve / update / soft-delete a purchase
GET/POST
/supply/sales
List / create Supply sales to shop owners
GET/PATCH/DELETE
/supply/sales/:id
Retrieve / update / soft-delete a sale
GET/POST
/supply/internal-transfers
List / create internal transfers to Fresh Chicken Shop
GET/PATCH
/supply/internal-transfers/:id
Retrieve / update a transfer
POST
/supply/internal-transfers/:id/settle
Record settlement against an internal transfer balance
GET
/supply/stock
Current stock & WAC for Supply
POST
/supply/stock/writeoffs
Record a stock write-off
GET
/supply/reports/profit-loss
Supply P&L (external-only and total) for a date range

7.6 Wastage Module
Method
Endpoint
Description
GET/POST
/wastage/purchases
List / create Wastage purchases (from shop owners)
GET/PATCH/DELETE
/wastage/purchases/:id
Retrieve / update / soft-delete a purchase
GET/POST
/wastage/sales
List / create Wastage sales (to factories)
GET/PATCH/DELETE
/wastage/sales/:id
Retrieve / update / soft-delete a sale
GET
/wastage/stock
Current stock & WAC for Wastage
GET
/wastage/reports/profit-loss
Wastage P&L for a date range

7.7 Fresh Chicken Shop Module
Method
Endpoint
Description
GET
/shop/incoming-transfers
List internal transfers received from Supply
GET/POST
/shop/sales
List / create retail sales to customers
GET/PATCH/DELETE
/shop/sales/:id
Retrieve / update / soft-delete a sale
GET
/shop/stock
Current stock & WAC for Fresh Chicken Shop
POST
/shop/stock/writeoffs
Record a stock write-off
GET
/shop/reports/profit-loss
Fresh Chicken Shop P&L for a date range

7.8 Vehicles (Shared)
Method
Endpoint
Description
GET/POST
/vehicles?departmentId=
List / register vehicles
GET/PATCH/DELETE
/vehicles/:id
Retrieve / update / deactivate a vehicle
GET/POST
/vehicles/:id/fuel-logs
List / record fuel log entries
PATCH/DELETE
/vehicles/fuel-logs/:id
Update / soft-delete a fuel log entry
GET/POST
/vehicles/:id/maintenance-logs
List / record maintenance log entries
PATCH/DELETE
/vehicles/maintenance-logs/:id
Update / soft-delete a maintenance log entry

7.9 Employees & Payroll (Shared)
Method
Endpoint
Description
GET/POST
/employees?departmentId=
List / register employees
GET/PATCH/DELETE
/employees/:id
Retrieve / update / deactivate an employee
GET/POST
/employees/:id/advances
List / record advances
GET/POST
/employees/:id/bonuses
List / record bonuses
POST
/payroll/runs
Run salary calculation for a period (single employee or whole department)
GET
/payroll/runs?period=&departmentId=
List salary runs
POST
/payroll/runs/:id/pay
Mark a salary run as paid

7.10 Expenses (Shared)
Method
Endpoint
Description
GET/POST
/expenses?departmentId=&categoryId=
List / record expenses
GET/PATCH/DELETE
/expenses/:id
Retrieve / update / soft-delete an expense
GET/POST
/expense-categories
List / create expense categories

7.11 Reports
Method
Endpoint
Description
GET
/reports/consolidated-profit-loss
Whole-business P&L, internal transfers excluded from external revenue
GET
/reports/partner-profit-share
Net profit ÷ 3 per partner, for a date range
GET
/reports/outstanding-balances?departmentId=
All non-zero party balances
GET
/reports/stock-summary
Stock quantity & WAC per department
GET
/reports/expense-breakdown
Expenses grouped by department and category
GET
/reports/payroll-summary
Payroll grouped by department and employee

8. Core Business Workflows
   These describe the step-by-step system behavior for each major business process, including the underlying ledger and stock effects from Section 3 — i.e., exactly what the backend service layer must orchestrate inside a single transaction.
   8.1 Brokerage Purchase → Sale Cycle
   User selects/creates a Farm party, enters quantity and rate; selects payment method.
   System validates inputs (positive quantity/rate), computes total_amount.
   System creates brokerage_purchases row; creates a stock_movements row (purchase_in); recalculates and updates stock_balances (quantity + WAC) for Brokerage.
   System posts ledger entries: debit Inventory/COGS, credit Cash/Bank (if paid) and/or Accounts Payable for the farm (if credit/partial).
   Later, user records a sale: selects buyer, enters quantity (≤ current stock) and selling rate; system computes commission/kg = rate − current WAC.
   System creates brokerage_sales row; stock_movements (sale_out) at current WAC; updates stock_balances.
   System posts ledger entries: debit Cash/Bank and/or Accounts Receivable (buyer), credit Revenue.
   Brokerage profit report reflects updated Revenue, COGS, and gross profit immediately.
   8.2 Supply Purchase → Sale to Shop Cycle
   Identical pattern to 8.1, with Broker as the purchase-side party and Shop Owner as the sale-side party, posting to Supply's own stock_balances and ledger entries scoped to the Supply department.
   8.3 Internal Transfer: Supply → Fresh Chicken Shop
   User (typically working from the Supply module) creates an internal_transfers record: quantity, internal_rate_per_kg; system validates quantity ≤ Supply's current stock.
   System computes total_amount = quantity × internal_rate_per_kg.
   Supply side: stock_movements (transfer_out) at Supply's current WAC; stock_balances for Supply decreases. Ledger: debit COGS (Supply), credit Revenue (Supply); debit/credit Accounts Receivable against the internal party record for Fresh Chicken Shop.
   Fresh Chicken Shop side: stock_movements (transfer_in) at internal_rate_per_kg; stock_balances for Fresh Chicken Shop increases, recalculating Shop's WAC. Ledger: debit Inventory/COGS (Shop) is implicit in WAC; credit/debit Accounts Payable against the internal party record for Supply.
   Both postings happen inside one database transaction so stock and ledgers on both sides are always consistent — the transfer can never exist on one side only.
   When cash/bank settlement occurs between the two departments, user posts a settlement against the internal_transfers record (or a batch of them); this clears the matching receivable (Supply) and payable (Shop) together.
   Fresh Chicken Shop can now sell this stock to customers, per Section 8.5.
   8.4 Wastage Purchase → Sale to Factory Cycle
   Identical pattern to 8.1, with Shop Owner as the purchase-side party (selling waste) and Factory as the sale-side party, posting to Wastage's own stock_balances and ledger entries.
   8.5 Fresh Chicken Shop Retail Sale Cycle
   Stock arrives via internal transfer (8.3); Shop's stock_balances and WAC are already current.
   User selects/creates a Customer party, enters quantity (≤ current Shop stock) and selling rate.
   System computes profit_margin_per_kg = rate − current Shop WAC.
   System creates shop_sales row; stock_movements (sale_out); updates stock_balances for Fresh Chicken Shop.
   System posts ledger entries: debit Cash/Bank and/or Accounts Receivable (customer), credit Revenue (Fresh Chicken Shop).
   8.6 Salary, Advance & Bonus Cycle
   Throughout the month, user records employee_advances and employee_bonuses as they occur; advances immediately post a ledger entry (debit Employee Advance asset, credit Cash/Bank).
   At period end, user triggers a salary run for an employee or a whole department.
   System sums total_bonuses for the period and total outstanding employee_advances to be deducted; computes net_payable = base_salary + total_bonuses − total_advances_deducted.
   System creates a salary_runs row (status pending); marks the deducted advances' recovery_status/amount_recovered accordingly.
   User marks the run as paid, recording date and payment method; system posts ledger entries: debit Payroll Expense (gross: base + bonuses) under the employee's department, credit Cash/Bank (net payable) and credit Employee Advance (the recovered portion, clearing that asset).
   8.7 Expense Recording Cycle
   Manual: user records an expense directly (department, category, amount, date, payment method); system posts debit Operating Expense, credit Cash/Bank.
   Automatic: a vehicle fuel/maintenance log, or a stock write-off, triggers the owning module to create a linked expenses row (source_type set, source_id pointing back) and post the same ledger entries — the user never has to double-enter these.
   8.8 Partner Profit Report Generation
   User selects a date range and requests the Partner Profit Share report.
   System sums Revenue across all departments for the range, excluding internal_transfers revenue (Section 3.4–3.7).
   System sums COGS, Operating Expenses (including system-generated wastage-loss and vehicle expenses), and Payroll Expense across all departments for the range.
   System computes Consolidated Net Profit = Total Revenue − Total COGS − Total Operating Expenses − Total Payroll.
   System divides by 3 and displays each partner's equal share. This is a read-only report; no ledger postings are created.
9. Reporting & Dashboard Requirements
   The MVP dashboard is intentionally minimal — a small set of high-value views rather than an extensive BI suite, consistent with the client's request for simplicity.
   9.1 Owner/Accountant Dashboard
   Today's snapshot: total purchases, total sales, and cash/bank movement across all departments.
   Per-department mini cards: current stock (kg), today's revenue, today's gross profit.
   Outstanding balances summary: total receivables and total payables, business-wide.
   Quick links into each department's purchase/sale entry forms.
   9.2 Department Staff Dashboard (if applicable)
   Scoped entirely to their own department: today's purchases/sales, current stock, quick entry forms.
   No visibility into other departments, payroll figures, or partner profit data.
   9.3 Report Outputs
   Report
   Filters
   Output
   Department P&L
   Department, date range
   Revenue, COGS, gross profit, expenses, payroll, net profit
   Consolidated P&L
   Date range
   Whole-business P&L, internal transfers excluded from external revenue
   Partner Profit Share
   Date range
   Consolidated net profit and each partner's 1/3 share
   Party Statement
   Party, date range
   Transaction history with running balance
   Outstanding Balances
   Department (optional)
   All parties with non-zero receivable/payable
   Stock Summary
   Department (optional), date range
   Current quantity & WAC, movement history
   Expense Breakdown
   Department, category, date range
   Total and itemized expenses
   Payroll Summary
   Department, date range
   Total payroll cost, per-employee breakdown

All reports should be exportable to at least one common format (CSV or PDF) so the client can share figures externally (e.g., with partners or an external accountant) without needing System access. 10. Non-Functional Requirements
10.1 Performance
List/report endpoints should respond within 1.5 seconds for typical data volumes expected in an MVP (single business, a few hundred transactions/month).
Stock balance and ledger balance lookups must be backed by appropriate indexes (Section 5.2.5, 5.3.1) to remain fast as transaction history grows.
10.2 Reliability & Data Integrity
All multi-table financial operations (purchase, sale, transfer, salary run, expense posting) must be wrapped in database transactions — partial writes must never occur.
ledger_entries and stock_movements are append-only; corrections happen via reversing/adjusting entries, never destructive updates, preserving a fully reconstructable history.
Soft delete only — no hard deletes on financially significant tables, ensuring historical reports remain accurate even after a record is removed from active views.
10.3 Security
All passwords hashed (bcrypt/argon2); JWTs signed with a strong secret/key, short-lived access tokens with refresh rotation.
Role and department-based authorization enforced server-side on every endpoint, never trusted from the client.
All financial inputs validated server-side (positive amounts, valid dates, valid foreign keys) regardless of client-side validation.
10.4 Usability
Forms for purchases/sales follow one consistent layout pattern across all four departments so users only need to learn the pattern once.
Critical actions (recording a sale, running payroll) show a clear confirmation/summary before committing.
10.5 Maintainability
Strict adherence to the repository pattern and feature-module boundaries (Section 4) so each department module can be modified independently without risk to others.
Shared logic (ledger posting, stock/WAC calculation, vehicle and payroll modules) lives in one place only, consumed by all four departments — no duplicated business logic.
10.6 Scalability (Forward-Looking)
Although MVP is single-business/single-tenant, the schema's consistent use of department_id and the polymorphic parties table make a future multi-branch or multi-tenant extension feasible without a full redesign. 11. Testing Strategy
Per the project's standing engineering mandate, every feature is verified across three layers before being considered complete, with a zero-failure bar — no feature ships with a known-failing test.
11.1 Unit Tests (Jest)
Service-layer logic in isolation, with repositories mocked: WAC recalculation, commission/margin calculation, salary run net-payable calculation, ledger posting rule selection.
Edge cases: zero/negative quantity rejection, selling more than available stock, double-running payroll for the same period, partial payment handling.
11.2 Integration Tests (Jest + Test Database)
Real PostgreSQL (test instance) exercising the full repository → service flow: recording a purchase actually updates stock_balances and creates the right ledger_entries rows.
Transaction rollback behavior: a failure partway through a multi-step operation (e.g., internal transfer) leaves no partial data on either side.
Cross-module flows: internal transfer correctly updates both Supply and Fresh Chicken Shop's stock and ledgers in one operation.
11.3 End-to-End Tests (Supertest)
Full HTTP request/response cycles against a running test instance of the API, covering the primary workflows in Section 8 (purchase → sale, internal transfer, salary run, expense recording).
Auth and authorization: requests without a valid JWT are rejected; Department Staff cannot access another department's endpoints; role-restricted endpoints reject lower-privileged roles.
Report endpoints return mathematically correct aggregates against known seeded data (e.g., the worked example in Section 3.8 can be used as a canonical e2e fixture).
11.4 Completion Criteria
A feature is considered done only when: (1) unit tests for its service logic pass, (2) integration tests confirm correct database state after the operation, (3) at least one e2e test exercises it via the real API surface, and (4) all three suites pass with zero failures in CI before merge. 12. Appendix: Glossary & Open Questions
12.1 Glossary
See Section 1.4 for the primary glossary of business and technical terms used throughout this document.
12.2 Open Items for Client Confirmation
The following small items were not explicitly specified in the original brief and were resolved with reasonable MVP defaults in this document. They are flagged here in case the client wants to adjust them before development begins:
Opening balances: each party and each department's stock can be seeded with an opening_balance / opening stock figure at go-live so existing manual-ledger balances carry forward (Section 5.2.3, 5.3). Please confirm this is sufficient, or whether a bulk historical import is actually needed.
Expense categories list (Section 5.10.1) is seeded with common defaults (Rent, Utilities, Office Supplies, Vehicle Fuel, Vehicle Maintenance, Wastage Loss, Miscellaneous) — client may add/rename categories freely; please confirm if any specific categories should be pre-added.
Fresh Chicken Shop vehicle usage was left optional (FR-FC-6) since the brief did not explicitly list vehicle management for this department the way it did for the other three; please confirm if the Shop also needs vehicle tracking.
Report export format defaulted to CSV/PDF (Section 9.3); please confirm preference if one is required over the other.
12.3 Document Control
Version
Date
Change
1.0
June 21, 2026
Initial draft covering all four departments, accounting strategy, database design, functional requirements, API catalog, workflows, and testing strategy.

1.1
July 15, 2026
Approved addendum: Fresh Chicken Shop live-to-dressed sale flow and universal shrinkage across all departments.

---

# SRS Addendum v1.2 (authoritative)

## Fresh Chicken Shop: Live to Dressed Stock Processing (Batch Model) and Universal Shrinkage

**Status:** Final locked addendum dated July 15, 2026. This section supersedes v1.1 wherever the designs conflict.

### Locked workflow

- Dressing is a separate batch operation, not part of a retail sale.
- Fresh Chicken Shop maintains independent `live` and `dressed` stock pools with separate quantity and WAC.
- Supply transfers received by the Shop enter live stock.
- A dressing batch validates `0 < dressed_weight_kg <= live_weight_kg <= available live stock`, consumes the full live weight, and produces dressed stock at the snapshotted live WAC.
- The backend derives shrinkage and processing-loss value. It appends `dressing_out`/`dressing_in` stock movements and posts Processing Loss against Inventory atomically. It posts no Revenue or COGS for dressing.
- Retail sales accept `quantity_kg` and `rate_per_kg`, consume dressed stock only, and use the dressed WAC for backend-derived COGS and profit margin.
- Brokerage, Supply, and Wastage use `stock_type=standard`; the Shop uses `live` and `dressed`.
- Manual shrinkage is available in all four departments. Shop shrinkage requires the live or dressed pool and must not duplicate normal dressing loss.

### Required schema

`shop_dressing_batches` stores UUID id/department, positive live and dressed DECIMAL weights, generated shrinkage, snapshotted live WAC, dressed cost per kg, processing-loss amount, batch date, notes, and standard audit/soft-delete columns. `stock_balances`, `stock_movements`, and `stock_writeoffs` add `stock_type ENUM('standard','live','dressed')`; stock balances are unique by `(department_id, stock_type)`. Movement types add `dressing_out` and `dressing_in`.

### Functional requirements

- **FR-FC-2:** retail sales consume dressed stock only.
- **FR-FC-10:** create an atomic live-to-dressed Dressing Batch with processing-loss recognition.
- **FR-FC-11:** display live and dressed quantity/WAC independently.
- **FR-FC-12:** dressing history shows date, live/dressed weight, yield, and loss with date filtering.
- **FR-FC-13:** Shop write-off requires live/dressed pool selection.
- **FR-WA-8:** Wastage supports standard stock write-offs.
- **FR-UI-1:** all four stock screens share a persistent Add Shrinkage action.

### API

| Method           | Endpoint                         | Purpose                                        |
| ---------------- | -------------------------------- | ---------------------------------------------- | ------------------------- | ----------------------- |
| GET/POST         | `/shop/dressing-batches`         | List/create batches                            |
| GET/PATCH/DELETE | `/shop/dressing-batches/:id`     | Read/update/soft-delete batch                  |
| GET              | `/shop/stock?type=live\|dressed` | Pool-specific stock; omitted type returns both |
| GET/POST         | `/shop/sales`                    | Sales from dressed stock                       |
| GET              | `/shop/reports/processing-yield` | Date-range yield/loss summary                  |
| POST             | `/{brokerage                     | supply                                         | wastage}/stock/writeoffs` | Standard-pool shrinkage |
| POST             | `/shop/stock/writeoffs`          | Live/dressed shrinkage                         |

### Canonical example

Starting at 400kg live at Rs.410 WAC: 250kg live to 190kg dressed leaves 150kg live, produces 190kg dressed at Rs.410, and records Rs.24,600 Processing Loss. Sales of 70kg at Rs.600 and 120kg at Rs.590 create total Revenue Rs.112,800 and COGS Rs.77,900. A separate 10kg live spoilage records Rs.4,100 Wastage Loss. Net contribution is Rs.6,200. Internal transfer revenue remains excluded from consolidated external revenue.

---

# SRS Addendum v1.1 (superseded by v1.2 above)

## Fresh Chicken Shop: Live-to-Dressed Weight Sale Flow and Universal Shrinkage

**Parent Document:** Poultry Business Management System SRS v1.0 (June 21, 2026)  
**Status:** Approved — extends Sections 3.5, 5.3.3, 5.7.2, 6.4, 7.7, and 8.5  
**Approval date:** July 15, 2026

## A1. Purpose

This addendum adds two pieces of business logic not covered in v1.0:

1. Fresh Chicken Shop sales capture the live weight removed from stock, dressed weight actually sold, and dressed-weight sale rate. The live/dressed difference is automatically recorded as processing loss.
2. Manual stock shrinkage/write-off is available to all four departments, including Wastage, through the same visible “Add Shrinkage” workflow.

The approved design retains the NestJS repository pattern, PostgreSQL, WAC valuation, the central ledger, immutable stock movements, transactional posting, and shared frontend components established by v1.0.

## A2. Confirmed Decisions

- Dressing is tied to one sale. One sale record contains live weight, dressed weight, and rate; there is no separate dressed-stock pool or batch-dressing workflow.
- The live/dressed gap is a visible, system-generated “Processing Loss” operating expense at the current Shop WAC.
- Wastage receives the same manual shrinkage/write-off capability as Brokerage, Supply, and Fresh Chicken Shop.

There are no open decisions in this addendum.

## A3. Fresh Chicken Shop Live-to-Dressed Sale

### A3.1 Transaction flow (replaces Section 8.5)

1. Stock received by the Shop through an internal Supply transfer remains live-weight Inventory at the Shop’s running WAC.
2. The sale form collects, in this order:
   - `live_weight_kg`: live-basis stock pulled for the sale;
   - `dressed_weight_kg`: sellable weight after processing;
   - `rate_per_kg`: selling rate per dressed kg.
3. The server validates `0 < dressed_weight_kg <= live_weight_kg <= current Shop stock` while holding an inventory lock. The backend is authoritative even when the UI displays current availability.
4. The server derives, never trusts from the client:
   - `shrinkage_kg = live_weight_kg - dressed_weight_kg`;
   - `total_amount = dressed_weight_kg × rate_per_kg`;
   - `cogs_amount = dressed_weight_kg × locked current WAC`;
   - `processing_loss_amount = shrinkage_kg × locked current WAC`;
   - `gross_profit_amount = total_amount - cogs_amount - processing_loss_amount`.
5. Shop stock decreases by `live_weight_kg`, not dressed weight.
6. The immutable stock ledger receives two movements for the same sale:
   - `sale_out` for `dressed_weight_kg` at the snapshotted WAC;
   - `processing_loss_out` for `shrinkage_kg` at the same WAC (omitted only when shrinkage is exactly zero).
     Their total always reconciles to the live weight removed.
7. Ledger posting is:
   - debit Cash/Bank and/or Accounts Receivable; credit Shop Revenue for `total_amount`;
   - debit Shop COGS; credit Inventory for `cogs_amount`;
   - debit Shop Operating Expense; credit Inventory for `processing_loss_amount`.
8. A system-generated Processing Loss expense record links to the sale so expense and consolidated reporting include it without manual entry.
9. Sale, stock balance, stock movements, expense, ledger entries, receivable, and audit fields are committed in one database transaction. Any failure rolls the whole operation back.

### A3.2 Worked example

Shop stock is 200kg live at WAC Rs. 410/kg. The user records 60kg live, 45kg dressed, at Rs. 480 per dressed kg.

| Field                     |                               Result |
| ------------------------- | -----------------------------------: |
| Revenue                   |                45 × 480 = Rs. 21,600 |
| Dressed COGS              |                45 × 410 = Rs. 18,450 |
| Processing loss           |                 15 × 410 = Rs. 6,150 |
| Total live stock consumed |                                 60kg |
| Gross profit              | 21,600 − 18,450 − 6,150 = Rs. -3,000 |
| Break-even dressed rate   |      (60 × 410) ÷ 45 = Rs. 546.67/kg |

The UI must show a live preview of revenue, dressed COGS, processing-loss cost, gross profit, and estimated break-even dressed rate. This preview is advisory; persisted amounts always come from the backend’s locked WAC calculation.

### A3.3 `shop_sales` schema (replaces Section 5.7.2)

| Column                 | Type          | Constraint / meaning                                        |
| ---------------------- | ------------- | ----------------------------------------------------------- |
| id                     | UUID          | primary key                                                 |
| department_id          | UUID          | Fresh Chicken Shop FK, not null                             |
| customer_party_id      | UUID          | parties FK, nullable for walk-in cash sale                  |
| live_weight_kg         | DECIMAL(12,3) | not null, greater than zero                                 |
| dressed_weight_kg      | DECIMAL(12,3) | not null, greater than zero and no greater than live weight |
| shrinkage_kg           | DECIMAL(12,3) | stored generated value: live minus dressed                  |
| rate_per_kg            | DECIMAL(14,2) | positive, applied to dressed weight                         |
| wac_at_sale            | DECIMAL(16,4) | server snapshot at posting time                             |
| total_amount           | DECIMAL(14,2) | dressed weight × rate                                       |
| cogs_amount            | DECIMAL(14,2) | dressed weight × WAC                                        |
| processing_loss_amount | DECIMAL(14,2) | shrinkage × WAC                                             |
| gross_profit_amount    | DECIMAL(14,2) | revenue − COGS − processing loss                            |
| payment_method         | ENUM          | `cash`, `bank`, or `credit`                                 |
| amount_received        | DECIMAL(14,2) | default zero                                                |
| outstanding_amount     | DECIMAL(14,2) | server-derived receivable                                   |
| sale_date              | DATE          | required                                                    |
| notes                  | VARCHAR(255)  | optional                                                    |
| audit columns          | standard      | created/updated/deleted and actor fields                    |

`quantity_kg` and `profit_margin_per_kg` are removed. Historical rows migrate as live weight = dressed weight, shrinkage = zero, with WAC and total gross profit derived from their existing values.

### A3.4 Functional requirements

- **FR-FC-2 (revised):** Record a retail sale using live weight, dressed weight, and dressed-weight rate, with server validation of both weight relationships and available stock.
- **FR-FC-2a:** Reduce stock by full live weight and automatically post the live/dressed gap as Processing Loss at WAC.
- **FR-FC-2b:** Display a live, clearly labeled profit and break-even preview before confirmation. Do not send derived accounting values from the client.

### A3.5 API change

`POST /shop/sales` requires `liveWeightKg`, `dressedWeightKg`, `ratePerKg`, `paymentMethod`, and `saleDate`; customer, amount received, and notes remain optional under the existing payment rules. Responses expose the persisted live, dressed, shrinkage, WAC, revenue, COGS, processing loss, and gross-profit snapshots.

## A4. Universal Shrinkage Across All Departments

### A4.1 Scope

Brokerage, Supply, Wastage, and Fresh Chicken Shop stock pages each display a persistent “+ Add Shrinkage” button to authorized users. It opens one shared form containing quantity kg, reason, optional note, and date.

Shop manual shrinkage is only for loss outside normal dressing (for example pre-sale spoilage, mortality, or theft). Normal dressing loss is generated by the Shop sale and must not be manually entered again.

### A4.2 Data and posting

`stock_writeoffs.department_id` accepts all four departments. Reasons remain `spoilage`, `mortality`, `transit_loss`, and `other`. Valuation remains `quantity_kg × locked current WAC`.

Each write-off atomically:

- validates sufficient department stock;
- reduces the stock balance;
- appends a `writeoff_out` stock movement;
- creates a system-generated Wastage Loss expense for that department;
- debits Operating Expense and credits Inventory;
- stores the WAC valuation and audit linkage.

### A4.3 Functional requirements

- **FR-WA-8:** Authorized users can write off Wastage stock with identical behavior to the other departments.
- **FR-BR-8 / FR-SU-8 / FR-FC-7:** Existing write-off behavior remains, with a visible one-click stock-page action.
- **FR-UI-1:** All four pages reuse one shared responsive, validated shrinkage form; department-staff access remains backend- and route-scoped.

### A4.4 API catalog

| Method | Endpoint                     | Status                 |
| ------ | ---------------------------- | ---------------------- |
| POST   | `/brokerage/stock/writeoffs` | existing, standardized |
| POST   | `/supply/stock/writeoffs`    | existing, standardized |
| POST   | `/shop/stock/writeoffs`      | existing, standardized |
| POST   | `/wastage/stock/writeoffs`   | new                    |

## A5. Updated Section 3.8 Example

If the Shop receives 400kg live at WAC Rs. 410/kg and sells 300kg dressed at Rs. 600/kg, stock falls by 400kg, revenue is Rs. 180,000, dressed COGS is Rs. 123,000, processing loss is Rs. 41,000, and Shop gross profit is Rs. 16,000. A separate 5kg spoiled write-off would reduce stock another 5kg and create a Rs. 2,050 Wastage Loss expense; it is not part of the dressing loss.

Consolidated revenue and partner-share methodology are unchanged. Internal Supply transfers remain excluded from consolidated external revenue, while the Shop’s COGS and processing-loss inputs now follow the split defined above.

---

# SRS Addendum v1.3

## A6. Brokerage to Supply Automatic Internal Sale

### A6.1 Business flow

An authorized Brokerage user may record a sale with destination `supply`.
That single command atomically creates the Brokerage sale, reduces Brokerage
stock, creates a linked Supply purchase, increases Supply stock at the agreed
Brokerage sale rate, and posts the two departments' internal receivable and
payable entries. A failure in any step rolls back every step.

The linked Supply purchase is read-only and is uniquely identified by
`source_brokerage_sale_id`. It can be cancelled only through the source
Brokerage sale. Cancellation first verifies that Supply still holds enough of
the transferred stock; stock already consumed by Supply sales prevents an
unsafe reversal.

### A6.2 Accounting and reporting

- Brokerage records internal sale revenue and a receivable against Supply.
- Supply records inventory and a payable against Brokerage.
- The internal Brokerage sale is excluded from consolidated external revenue.
- The original farm acquisition remains the consolidated inventory cost;
  internal movement does not duplicate consolidated COGS.
- Supply may sell any portion of the received stock to separate shop-owner
  parties at independently entered rates.

### A6.3 Functional requirements

- **FR-BS-1:** One Brokerage-to-Supply request is all-or-nothing.
- **FR-BS-2:** Each mirrored Supply purchase links to exactly one Brokerage sale.
- **FR-BS-3:** Brokerage stock decreases and Supply stock increases by the exact same quantity.
- **FR-BS-4:** Supply controls its later shop-owner allocation quantities and rates.
- **FR-BS-5:** Internal Brokerage revenue never inflates consolidated external revenue.

---

# SRS Addendum v1.4

## A7. Investor-Funded Farm Purchase Settlements

### A7.1 Business flow

An Owner or Accountant may assign a completely unpaid Brokerage credit purchase
from a farm to one investor. The assignment always covers 100% of the purchase;
partially paid purchases and partial assignments are rejected. The farm payable
is cleared and the principal is transferred to the investor's payable balance.

For a medicine set-off, the investor represents the person whose medicine
receivable from the farm is used by the business. This assignment always gives
the investor a 2% profit on the full purchase amount. A standard investment uses
an explicitly recorded fixed percentage and an outcome of profit or loss.

### A7.2 Accounting and settlement

- Profit increases the investor payable and posts an operating expense.
- Loss reduces the investor payable and posts other income.
- Investor payments reduce both the assignment balance and the investor party
  payable, using a selected cash drawer or bank account.
- Generic party payments cannot settle investor balances because every payment
  must remain linked to its assignment.
- An unpaid assignment may be cancelled, which reverses its ledger entries and
  restores the complete farm payable. An assignment with payments cannot be
  cancelled.
- A linked Brokerage purchase cannot be cancelled until its investment
  assignment has been cancelled.

### A7.3 Access and API catalog

Only Owner and Accountant roles can access or mutate investment records.

| Method | Endpoint                     | Purpose                            |
| ------ | ---------------------------- | ---------------------------------- |
| GET    | `/investments`               | List and filter assignments        |
| GET    | `/investments/summary`       | Return principal/return balances   |
| GET    | `/investments/:id`           | Return assignment and payments     |
| POST   | `/investments`               | Assign a complete farm purchase    |
| PATCH  | `/investments/:id`           | Update reference and notes         |
| POST   | `/investments/:id/payments`  | Pay an active investor balance     |
| POST   | `/investments/:id/cancel`    | Reverse an unpaid assignment       |

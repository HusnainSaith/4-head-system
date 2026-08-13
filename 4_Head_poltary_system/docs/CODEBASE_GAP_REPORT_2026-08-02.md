# Poultry BMS Codebase Analysis & SRS Gap Report

**Audit date:** 2026-08-02  
**Baseline:** `new_srs.md` v1.1 plus authoritative Addendum v1.2 and v1.3/A6  
**Scope:** Backend, frontend, migrations, and tests; read-and-report only

## 1. Executive Summary

- Estimated functional completion is **approximately 82%**: all core department transaction modules exist, stock/WAC flows, dressing batches, universal shrinkage, Brokerage-to-Supply automation, payroll, reports, invoices, notifications, and desktop operation are represented in code.
- The highest financial-integrity risk is **database enforcement**. Many quantity/rate fields rely on DTO/service validation without corresponding database `CHECK` constraints; direct SQL or future code paths can persist invalid values.
- The highest security risk is **incomplete department-level authorization**. `DepartmentScopeGuard` checks the route prefix against `user.departmentType`, but it does not validate body/query/record `departmentId`, and shared controllers such as expenses, vehicles, parties, inventory, and employees do not consistently use it.
- The authoritative v1.2 batch design is implemented: separate live/dressed stock pools, dressing batches, dressed-only retail sales, and processing loss. The prompt's request to require the superseded A3.3 live/dressed columns on `shop_sales` conflicts with authoritative v1.2; this audit correctly treats the v1.2 batch schema as controlling.
- Internal Supply-to-Shop and Brokerage-to-Supply flows are transactional. Consolidated reporting filters `destinationType = 'external'`, excluding A6 internal Brokerage revenue, and separately excludes internal-transfer source entries.
- Repository layering is only partial. Controllers are generally thin, but numerous services use `DataSource`, `EntityManager.getRepository`, or injected TypeORM repositories directly, bypassing repository interfaces.
- No repository-wide “46 checks” framework was found. The checklist below therefore uses the complete SRS FR set, as the prompt directs.
- The most urgent next action is to **close department-scope authorization on every shared read/write path**, followed immediately by database constraints and end-to-end authorization/rollback tests.

## 2. Verification Checklist Status

No canonical 46-check artifact exists; repository searches found only phase/personnel-specific checklists. Status below is the authoritative FR cross-check.

| Requirement | Status | Evidence / gap |
|---|---|---|
| FR-BR-1,2 | Done | Purchase/sale transactions, WAC and stock validation in `brokerage.service.ts`; DTO positivity in `brokerage.dto.ts:185-303`. |
| FR-BR-3 | Partial | Edit/cancel paths exist, but financial mutation policy is inconsistent; cancellation uses reversals while ordinary updates remain allowed. |
| FR-BR-4,5 | Done | Party statement/payment flows in `parties.service.ts`; centralized ledger statement at `ledger.service.ts:48-63`. |
| FR-BR-6,7,8,9 | Done | Shared vehicles/employees/expenses/write-off/report modules; Brokerage shrinkage UI in `BrokerageStockPage.tsx:20-28`. |
| FR-SU-1,2 | Done | Transactional purchase/sale flows at `supply.service.ts:113-193,309-387`. |
| FR-SU-3,4 | Done | Atomic transfer at `supply.service.ts:489-575`; settlement at `:663-700`. |
| FR-SU-5 | Partial | Soft-delete/reversal exists at `supply.service.ts:255-274,449-461`; editing financial documents remains a policy deviation. |
| FR-SU-6,7,8,9 | Done | Party payments, shared modules, write-offs, and internal/external report views exist. |
| FR-WA-1,2 | Done | Purchase/sale service and stock/WAC flows exist in `wastage.service.ts`. |
| FR-WA-3 | Partial | CRUD/soft-delete behavior exists but immutable correction policy is not uniformly enforced. |
| FR-WA-4,5,6,7,8 | Done | Party/shared/report flows and standard write-off endpoint/UI exist; `WastageStockPage.tsx:25-29`. |
| FR-FC-1 | Done | Incoming transfer listing is exposed by Shop/Supply flow. |
| FR-FC-2 | Done | Under authoritative v1.2, retail sales consume dressed stock via `fresh-chicken-shop.service.ts:52-152`. |
| FR-FC-3 | Partial | Sale reversal exists (`fresh-chicken-shop.service.ts:225-247`); direct editing remains available. |
| FR-FC-4,5,6,7,8,9 | Done | Party payments, shared modules, pool-aware write-off, stock and P&L endpoints exist. |
| FR-FC-10 | Done | Atomic dressing transaction and server validation at `fresh-chicken-shop.service.ts:341-371`; schema checks in `shop-dressing-batch.entity.ts:4-9`. |
| FR-FC-11,12,13 | Done | Pool display/history/summary and pool-required write-off UI exist in `ShopStockPage.tsx:38-96`. |
| FR-EX-1,2,4,5 | Done | Manual categories/expenses and report filtering exist. |
| FR-EX-3 | Partial | Vehicle and write-off generated expenses exist, but comprehensive rollback coverage is not demonstrated for every source. |
| FR-VH-1-5 | Done | Vehicle/fuel/maintenance CRUD, generated expenses and soft deletion exist. |
| FR-EM-1-5,7 | Done | Employees, advances, bonuses, payroll and payments exist; payroll controller delegates at `employees.controller.ts:148-149`. |
| FR-EM-6 | Partial | Current employee financial history exists, but explicit base-salary change history was not located. |
| FR-RP-1-3 | Done | Department/consolidated/partner reports exist; external revenue drives profit/share at `reports.service.ts:16-58`. |
| FR-RP-4-8 | Done | Party statement, balances, stock, expense and payroll reports exist. |
| FR-UI-1 | Done | One shared `StockWriteoffDialog.tsx:48-138` is used by all four stock screens. |
| FR-BS-1-4 | Done | A6 linkage migration and transaction flow exist; unique FK at `1786100000000-AddBrokerageSupplyFlow.ts:24-43`. |
| FR-BS-5 | Done | Reports filter Brokerage `destinationType = 'external'` at `reports.repository.ts:92-93,155-156`. |
| Committee/Kameti | Missing | No committee/kameti model, service, endpoint, UI, or posting rules were found. |
| Shared overhead allocation | Missing | Rent can be a normal expense category, but no allocation rule/split workflow exists. |

## 3. Critical Issues

### C1. Department staff scope is not record-safe

`DepartmentScopeGuard` derives the required department solely from URL prefixes and compares it with `user.departmentType` (`src/common/guards/department-scope.guard.ts:29-45`). It never checks a request body's `departmentId`, query filters, or the department of an existing record. Shared controllers—including expenses (`expenses.controller.ts:25`), vehicles (`vehicles.controller.ts:22`), parties (`parties.controller.ts:27`), stock movements (`stock-movement.controller.ts:17`) and employees (`employees.controller.ts:37`)—do not apply the scope guard. **Impact:** a Department Staff account may read or mutate another department's data if service-level checks are absent.

### C2. Positive financial/quantity constraints are not consistently enforced by PostgreSQL

Transaction entities define `DECIMAL` precision correctly, but most purchase/sale/write-off entities lack entity-level/database `CHECK` constraints for `quantity_kg > 0`, positive rates, and received/paid bounds. The dressing table is a good exception (`shop-dressing-batch.entity.ts:4-9`). **Impact:** invalid financial rows can enter through migrations, scripts, bugs, or endpoints whose DTO validation changes.

### C3. Financial foreign-key deletion behavior is incompletely explicit

Many entity relations use `@ManyToOne(() => Department/Party)` without `onDelete: 'RESTRICT'`, e.g. `brokerage-sale.entity.ts:31-39`, `stock-movement.entity.ts:24-25`, and `ledger-entry.entity.ts:25-40`. PostgreSQL normally defaults to `NO ACTION`, which is restrictive in effect, but the SRS explicitly requires `RESTRICT` and migrations are inconsistent. `party_departments.party_id` uses `ON DELETE CASCADE` (`1785800000000-AddPartyDepartmentsAndSalaryAccounts.ts:6-10`); this is not a financial transaction row but still erases relationship history. **Impact:** schema behavior is less explicit/auditable than required and future regenerated migrations can drift.

### C4. Financial table audit coverage is incomplete

`AuditBaseEntity` correctly supplies created/updated/deleted actor/time columns (`audit-base.entity.ts:8-22`), but `stock_balances` has none (`stock-balance.entity.ts:12-46`), `party_payments` has only `created_at` in its migration, and `ledger_entries`/`stock_movements` intentionally have only created fields. Append-only tables may legitimately omit update/delete columns, but `stock_balances` is financially significant and mutable. **Impact:** balance changes cannot be attributed directly at the row level.

### C5. No journal/group balancing invariant in the light ledger

`LedgerService.post()` resolves and saves an array atomically when passed a transaction manager (`ledger.service.ts:23-46`), but `ledger_entries` has no journal/group ID or database rule requiring total debits to equal credits (`ledger-entry.entity.ts:14-93`). Call sites construct posting arrays independently. **Impact:** a future erroneous call can create unbalanced accounting entries with no database rejection.

## 4. Schema Deviations

| Table | Expected | Actual | Severity |
|---|---|---|---|
| All transaction tables | Positive quantity/rate checks | Mostly DTO/service-only; dressing batch has DB checks | Critical |
| `stock_balances` | Audit trail on financially significant mutable table | Quantity/WAC and unique `(departmentId, stockType)`, but no audit columns | Moderate |
| `party_payments` | Full standard audit/soft delete | Migration has `created_at` only; entity is not `AuditBaseEntity` | Moderate |
| `ledger_entries` | Append-only audit record | Correctly append-only, but no journal grouping/balance constraint | Moderate |
| `stock_movements` | Append-only with `stock_type` | Correct enum and movement types; no update/delete methods found in inventory repository | Compliant |
| `stock_writeoffs` | Department + stock type + full audit | Implemented with `AuditBaseEntity`, standard/live/dressed enum | Compliant |
| `stock_balances` | Unique `(department_id, stock_type)` | `@Unique(['departmentId','stockType'])` at `stock-balance.entity.ts:13` | Compliant |
| `shop_dressing_batches` | Full v1.2 batch schema/checks | Required weights, generated shrinkage, WAC/cost/loss, date, notes, audit implemented | Compliant |
| `shop_sales` | v1.2 batch-model retail sale: dressed `quantity_kg`, rate, WAC, margin | Implemented at `shop-sale.entity.ts:39-57`; correct for authoritative v1.2. It intentionally does not match superseded A3.3. | Compliant to v1.2 |
| `internal_transfers` | Cross-department linkage/financial fields | From/to department UUIDs and financial fields implemented | Compliant |
| `supply_purchases` | Unique optional source Brokerage sale FK, delete restricted | Unique partial index and `ON DELETE RESTRICT` | Compliant |
| Party/department transaction FKs | Explicit `ON DELETE RESTRICT` | Often implicit `NO ACTION`; some ancillary links use CASCADE/SET NULL | Moderate |
| Monetary columns | `DECIMAL/NUMERIC`, never float | Core financial entities use decimal/numeric; no core money FLOAT/REAL located | Compliant |

## 5. Accounting Logic Findings

| Area | Status | Evidence |
|---|---|---|
| Ledger posting rules | Implemented with deviation | Central `LedgerService.post()` exists (`ledger.service.ts:23-46`), but account selection remains distributed across department services, so global rule consistency requires auditing every call site. |
| WAC purchases | Implemented correctly | Inventory purchase paths update stock through shared inventory service; transaction services pass the same manager. |
| WAC sales/write-offs | Implemented correctly | Sales snapshot current WAC, e.g. Supply `supply.service.ts:309-313`; Shop `fresh-chicken-shop.service.ts:82-95`. |
| Supply→Shop internal transfer | Implemented correctly | Entire operation is in one transaction (`supply.service.ts:489-575`); source type is separately excluded from consolidated results. |
| Dressing batch validation | Implemented correctly | Server checks dressed ≤ live and shared inventory logic checks availability (`fresh-chicken-shop.service.ts:341-371`). |
| Dressing accounting | Implemented correctly | Shared processing produces dressing movements and processing loss; no sale revenue/COGS is created by the batch itself. |
| Dressed-only retail sale | Implemented correctly | Shop sale uses dressed stock and current dressed WAC (`fresh-chicken-shop.service.ts:52-95`). |
| Brokerage→Supply A6 | Implemented correctly | One-to-one FK migration plus atomic service path; Supply source purchase cannot be independently cancelled (`supply.service.ts:264`). |
| A6 cancellation stock safety | Implemented | Cancellation/reversal logic and dedicated e2e specification exist (`test/e2e/brokerage-supply-flow.e2e-spec.ts`). Runtime DB suite was not executed in this audit. |
| Consolidated external revenue | Implemented correctly | Repository filters destination type to external (`reports.repository.ts:92-93,155-156`); partner share uses external revenue (`reports.service.ts:16-58`). |
| Salary run | Implemented with deviation | Payroll logic exists and unit tests pass; services directly access TypeORM repositories at `employees.service.ts:500-613`. |
| Committee/Kameti | Not implemented | No asset/receivable, installments, payout settlement, or profit-only revenue posting found. |
| House rent/shared overhead | Partial | Rent is supported as a manual expense category; no shared allocation mechanism exists. |

## 6. Architecture & Pattern Compliance

### Module inventory

All required SRS modules have corresponding code: Auth, Users, Departments, Parties, Ledger, Inventory, Vehicles, Employees, Expenses, Reports, Audit (under `common`), Brokerage, Supply, Wastage, and Fresh Chicken Shop. The ORM is TypeORM with PostgreSQL, matching SRS §4.1 (`package.json`, `src/config/database.config.ts`).

Undocumented/additional modules include accounting, common approvals/attachments, fleet, invoices, master-data, notifications, permissions, role-permissions, roles, settlements, and transactions. Several duplicate/legacy vehicle service/repository trees also exist under `modules/vehicles`, `modules/services`, and `modules/repositories`, increasing maintenance risk.

### Layering

- Controllers are generally thin and delegate to services; no material accounting calculations were located in controllers.
- Brokerage, Supply, Wastage, Shop, Parties, Employees, Expenses, Reports, Inventory and Vehicles expose repository classes/interfaces.
- Strict separation fails because services use `DataSource` and direct repositories. Examples: `parties.service.ts:178-236,336,572`, `employees.service.ts:500-613`, `invoices.service.ts:93,126,229-244`, `vehicles.service.ts:171`, and `notifications.service.ts:24-25`.
- Multi-table purchase, sale, transfer, dressing and payroll/withdrawal paths use TypeORM transactions in the main services. Transaction propagation depends on each repository call accepting the passed `EntityManager`; this is implemented in core inventory/ledger repositories.

### Security

- JWT is globally registered via `APP_GUARD` in `app.module.ts:96-114`; explicit public auth endpoints use `@Public()`.
- Passwords use bcrypt comparison/hash (`auth.service.ts:82,104,255`), `password_hash` is `select:false` (`user.entity.ts:25-26`), and login strips it (`auth.service.ts:109`).
- DTO validation is extensive for positive quantities and monetary values, and a global validation pipe is configured. Coverage is not universal for every update DTO.
- Department scoping is the principal authorization gap described in C1.

### Data integrity

- Ledger entries and stock movements are modeled append-only and have no exposed update/delete repository operations.
- Correction paths commonly call `LedgerService.reverseSource()` (`ledger.service.ts:92-123`) rather than editing ledger rows.
- Soft delete is common for transactional master records. Some ancillary relations use hard cascade, and several financial documents still support ordinary update endpoints, weakening immutability expectations.

## 7. Feature Completion Matrix

| Feature group | Completion | Notes |
|---|---:|---|
| Brokerage | 90% | Core cycle and A6 implemented; correction/edit policy and DB checks remain. |
| Supply | 92% | Core cycle, settlement and Shop transfer implemented transactionally. |
| Wastage | 90% | Core cycle and universal shrinkage implemented. |
| Fresh Chicken Shop | 94% | Authoritative v1.2 batch/pool model implemented. |
| Expenses | 85% | Manual/generated expenses and reports exist; no shared-overhead allocator. |
| Vehicles | 88% | Core requirements implemented; duplicate legacy layers remain. |
| Employees/payroll | 86% | Payroll, deferred salary account/withdrawals implemented; explicit salary-change history unclear. |
| Reports | 90% | Core SRS reports and internal revenue exclusions implemented. |
| Invoice PDF | Done with deviation | PDF generation uses pdfmake, not Puppeteer (`pdf.service.ts:3-5,151-152`). Functional requirement is met; implementation technology differs from the known-pending wording. |
| SMTP notifications | Done/config-dependent | Mailer/Nodemailer sending exists (`notifications.service.ts:4,74`); real delivery depends on environment SMTP configuration. |
| Committee/Kameti | 0% | Not modeled. |
| House rent | 50% | Can be a department expense; no recurring/shared allocation feature. |

## 8. Testing Coverage Summary

- **Backend unit run:** 17/17 suites passed, 60/60 tests passed on 2026-08-02 (`npm test -- --runInBand`). Covered services include employees, supply, parties, invoices, vehicles, Shop, inventory, notifications, ledger, reports, auth and guards.
- **Frontend unit/component run:** 41/41 files passed, 173/173 tests passed (`npm test -- --run`).
- WAC, payroll, dressing and ledger helper tests exist. The Shop canonical dressing example is represented in `fresh-chicken-shop.service.spec.ts:35-40`.
- Integration/e2e files exist for auth, department sales, Brokerage/Supply/Wastage/Shop cycles, internal transfers, payroll, A6 Brokerage-to-Supply and v1.2 Shop live/dressed flows.
- The database-backed suites were not executed because this audit did not provision or alter a test PostgreSQL database. Their existence is not proof they currently pass.
- Missing high-value demonstrated coverage: shared-controller department-scope attacks, database `CHECK` rejection, unbalanced ledger rejection (no invariant exists), and failure injection at every step of all five multi-table workflows.

## 9. Double-Entry Migration Readiness

**Assessment: Medium-to-High effort.**

- Positive: posting persistence is centralized in `LedgerService.post()` and accepts entry arrays with an optional transaction manager (`ledger.service.ts:23-46`). Reversals are also centralized (`:92-123`).
- Negative: account-code/debit/credit selection is distributed across every business service. Adding hierarchical accounts alone is moderate, but introducing formal balanced journals would require modifying all posting call sites.
- There is no journal header/group ID in `ledger_entries`, no transaction-wide balanced-entry constraint, and no explicit journal status/posting lifecycle.
- Entry arrays are saved together when the caller supplies the same manager, but “together” does not mean “balanced”; the service never verifies debit totals equal credit totals.
- Cached drift risks include mutable `stock_balances` quantity/WAC and transaction snapshot fields. These are operationally necessary, but reconciliation jobs against immutable stock movements/ledger entries are not evident.
- A separate `accounting` module already contains `journal-entry.entity.ts`, `ledger.entity.ts`, and `account.entity.ts`, but it is parallel to the SRS light ledger rather than a demonstrated replacement. Two accounting models increase migration complexity unless consolidated.

## 10. Recommended Next Steps

1. Enforce department scope in shared controllers/services using the authenticated user's assigned `departmentId`; add cross-department read/write e2e tests before other feature work.
2. Add PostgreSQL `CHECK` constraints for positive quantities/rates, nonnegative paid/received amounts, and payment bounds across every financial table; verify existing data before migration.
3. Make all financial Party/Department FKs explicitly `ON DELETE RESTRICT` and document justified exceptions for purely ancillary link tables.
4. Decide and enforce one correction policy: posted purchases/sales should be reversed/reposted rather than freely updated or soft-deleted.
5. Add audit attribution/versioning for `stock_balances` or a mandatory reconciliation trail from immutable movements.
6. Run all database integration/e2e suites against a disposable PostgreSQL instance and publish exact pass/fail results, including forced rollback tests.
7. Consolidate duplicate vehicle/repository/service trees and require services to use repository interfaces consistently.
8. Add ledger batch/journal grouping and debit-equals-credit validation before attempting hierarchical chart-of-accounts work.
9. Specify Committee/Kameti accounting before implementation: installments should debit a committee receivable/asset, payout should clear it, and only excess proceeds should be income.
10. Specify shared-overhead allocation rules (fixed percentage, usage-based, or manual split) before adding recurring house-rent distribution.

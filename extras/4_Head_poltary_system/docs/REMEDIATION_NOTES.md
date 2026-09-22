# Remediation Notes

## Phase 0 - Parallel accounting module

**Decision:** case (a), unused dead code.

The removed `src/modules/accounting` tree consisted of undecorated placeholder
classes. Its modules were empty, the live `AppModule` did not import them, no
controller or frontend endpoint referenced them, and no production workflow
read or wrote the placeholder models. Runtime accounting uses
`src/modules/ledger` and `chart_of_accounts`.

Legacy tests and imports tied only to that placeholder implementation were
removed or redirected to the live departments module. Historical migrations
were retained because migration history must remain stable.

## Phase 1 - Department isolation

The shared department guard now enforces the authenticated department for
department staff, rejects spoofed department identifiers, and verifies direct
record identifiers against their owning department. Owner and accountant roles
retain cross-department access. The guard is applied to expenses, employees,
parties, stock movements, vehicles, and committees.

## Phase 2 - Database integrity and auditability

Migration `1786400000000` adds financial CHECK constraints, explicit restrictive
foreign keys, party-payment audit fields, and stock-balance update metadata. The
read-only `scripts/check-financial-integrity.ts` preflight reports invalid rows
without modifying data.

## Phase 3 - Balanced light ledger

`LedgerService.post()` rejects any batch whose debit and credit totals differ,
before resolving accounts or persisting entries. Existing party opening-balance
and internal-transfer postings were corrected so every posting remains balanced.
This is a light-ledger safeguard; it does not introduce a full double-entry
accounting subsystem.

## Phase 4 - Committee / Kameti

Committees support create/list/read/update-before-first-installment, fixed
installments, one payout, automatic completion, and position reporting. Normal
contributions remain an advance; only payout excess is posted to `other_income`.
Client-provided contribution totals are verified against server-recomputed
installments.

## Phase 5 - Shared expense allocation

Expense allocations support equal, percentage, and manual splits. The header,
splits, generated ordinary department expenses, and balanced ledger postings are
created in one transaction. Deletion reverses generated ledger entries and
soft-deletes the generated records. Because reports consume ordinary expense
rows, allocated rent and similar shared costs appear in existing department and
consolidated reports without a parallel reporting path.

## Verification (2026-08-02)

- Backend unit tests: 71 passed.
- Department-scope and committee HTTP tests: 6 passed.
- Frontend tests: 173 passed.
- Backend and frontend production builds: passed.
- Database migrations: all 46 applied.
- Financial integrity preflight: zero violations in all 12 checked tables.

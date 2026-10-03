# Department partner accounts

For equal partners, select **Equal partners** and then **Save equal shares**. This stores exact equal ownership (one-third each for three partners), rather than rounded percentages. Custom percentages remain available. Apply the `AddEqualPartnerShares1789400000000` migration when updating an existing installation. Monetary allocations can differ by one paisa when the total cannot be divided exactly.

Run `npm run migration:run` before starting the updated backend. No ownership percentages are inferred or seeded.

Assign users the `partner` role and their business department. On **Reports → Partner Profit Share**, an owner enters every partner's percentage and saves the department configuration. Percentages support four decimal places and must total exactly 100%. Saving creates a partner financial account or reuses the user's existing linked account without changing its type or transaction history. Department ownership is determined by the user's role, not the existing account's type.

Profit and loss are continuously calculated from the department profit-and-loss report. Both positive and negative amounts are allocated with integer monetary arithmetic and deterministic largest-remainder rounding. Accruals are included in party balances, department balances, outstanding reports, and statements alongside recorded payments. They are derived amounts rather than duplicate immutable journal postings; they do not move cash or inflate operating expenses.

All historical transactions are included. Current membership and current percentages apply to the entire selected history. Changing membership or percentages therefore recalculates historical entitlements. Disabling login or deactivating a department does not end ownership; changing the partner role or department does. Missing partners, missing accounts, and incomplete percentage totals leave the department amount visibly unallocated until configuration is corrected.

Only owners can save ownership through `PUT /reports/partner-shares/:departmentId`; the existing owner/accountant permissions govern report access. Configuration changes are transactional, lock the department and current partner users, and record the updating user and timestamp.

Regression checks: `npm test -- --runInBand reports.service.spec.ts partner-configuration.spec.ts partner-balances.spec.ts ledger.service.spec.ts`. Frontend: `npm test -- src/features/reports/components/ReportPages.test.tsx src/features/reports/reportsApi.test.ts`.

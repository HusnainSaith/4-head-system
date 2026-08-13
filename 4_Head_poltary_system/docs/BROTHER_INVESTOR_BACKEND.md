# Unified Investor and Shafique Accounts

Owner and Accountant users manage investor records. An investor first needs a normal active user linked to a party whose type is `investor`; an investor profile is then created from that party. Standard accounts default to a zero percentage. The single Shafique/Brother profile retains the configured 2% default for compatibility, but profit and loss can also be entered manually.

## Account transactions

All account changes use:

```http
POST /investors/:investorId/transactions
```

Common fields are `departmentId`, positive two-decimal `amount`, `transactionDate`, and optional `reference` and `notes`. References are case-insensitively unique.

The party ledger is the authoritative investor balance. Investor cards, withdrawal/loss validation, reports, and party statements therefore include the party opening balance and any other valid party-ledger adjustments. A party receivable reduces the investor payable; a party payable increases it. Investor parties remain blocked from the generic Party payment endpoint so payments cannot be recorded twice.

- `deposit`: increases the investor balance and debits the selected cash/bank account. `paymentMethod` plus its exact account fields are required.
- `withdrawal`: decreases the investor balance and credits the selected cash/bank account. Partial withdrawals are allowed but cannot exceed the current balance.
- `profit`: manually increases the investor balance and transfers the amount from retained earnings.
- `loss`: manually decreases the investor balance and transfers the amount to retained earnings. It cannot make the account negative.
- `farm_transfer`: available only for the Shafique/Brother profile. It debits the selected farm's Accounts Payable in the selected department and credits Shafique's investor account by the exact same amount. It cannot exceed that farm's department-specific payable.

Example:

```json
{
  "action": "farm_transfer",
  "departmentId": "DEPARTMENT_UUID",
  "farmPartyId": "FARM_PARTY_UUID",
  "amount": "50000.00",
  "transactionDate": "2026-08-12",
  "reference": "MED-104"
}
```

## Reads and safeguards

- `GET /investors` returns each profile with `accountBalance`.
- `GET /investors/:id/ledger` returns the append-only account history, department, farm source where applicable, and before/after balance snapshots.
- Investor rows are locked during financial writes, so simultaneous requests cannot spend the same balance.
- Duplicate references, over-withdrawals, over-losses, invalid farm types, non-Brother farm transfers, and transfers above the farm payable are rejected.
- Every accepted transaction writes balanced general-ledger entries in the same database transaction.

Schema migration: `1787300000000-UnifyInvestorAccounts.ts`.

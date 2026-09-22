# Party Settlement Balance Fix - Implementation Complete

## Issue Identified

The party-to-party settlement feature had a critical bug in the ledger entry logic that prevented balances from being correctly reduced.

### Root Cause

The original implementation was posting **both entries as debits**:
```typescript
// INCORRECT (original code)
{
  accountCode: 'accounts_payable',
  partyId: payablePartyId,
  entryType: 'debit',  // ❌ WRONG
  amount: settlementAmount,
}
{
  accountCode: 'accounts_receivable',
  partyId: receivablePartyId,
  entryType: 'debit',  // ❌ WRONG
  amount: settlementAmount,
}
```

This violated the double-entry accounting principle and failed to reduce the balances correctly.

## Balance Convention

The system uses this convention:
- **Positive balance = Payable** (we owe them)
- **Negative balance = Receivable** (they owe us)

The ledger balance is calculated as: **balance = debit - credit**

## Correct Implementation

To settle both parties:

1. **Reduce Payable Balance (positive)**: Credit accounts_payable
   - Payable Party: +10,000 → 0
   - Entry: Credit accounts_payable by 10,000
   - Effect: 10,000 - 10,000 = 0 ✓

2. **Reduce Receivable Balance (negative)**: Debit accounts_receivable
   - Receivable Party: -10,000 → 0
   - Entry: Debit accounts_receivable by 10,000
   - Effect: 10,000 - 10,000 = 0 ✓

### Fixed Code

```typescript
await this.ledgerService.post(
  [
    {
      departmentId: dto.departmentId,
      accountCode: 'accounts_payable',
      partyId: dto.payablePartyId,
      entryType: 'credit',  // ✓ CORRECT
      amount: dto.settlementAmount.toFixed(2),
      entryDate: new Date(settlementDate),
      sourceType: 'party_adjustment',
      sourceId: saved.id,
      description: `Settlement with ${receivableParty.name}`,
      createdBy: actorId,
    },
    {
      departmentId: dto.departmentId,
      accountCode: 'accounts_receivable',
      partyId: dto.receivablePartyId,
      entryType: 'debit',  // ✓ CORRECT
      amount: dto.settlementAmount.toFixed(2),
      entryDate: new Date(settlementDate),
      sourceType: 'party_adjustment',
      sourceId: saved.id,
      description: `Settlement with ${payableParty.name}`,
      createdBy: actorId,
    },
  ],
  manager,
);
```

## Example Walkthrough

**Before Settlement:**
```
Party A (Payable):     +10,000
Party B (Receivable):  -10,000
```

**Settlement Transaction:**
```
Payable Party:     Party A
Receivable Party:  Party B
Settlement Amount: 10,000
```

**Ledger Entries Posted:**
```
1. Credit accounts_payable (Party A) by 10,000
   - Reduces Party A's payable balance
   - Calculation: 10,000 - 10,000 = 0

2. Debit accounts_receivable (Party B) by 10,000
   - Reduces Party B's receivable balance
   - Calculation: 10,000 - 10,000 = 0
```

**After Settlement:**
```
Party A (Payable):     0
Party B (Receivable):  0
Cash/Bank:             Unchanged
```

## Validation Rules

The implementation enforces:

1. ✓ Payable party must have positive balance (> 0)
2. ✓ Receivable party must have negative balance (< 0)
3. ✓ Settlement amount ≤ min(payable balance, abs(receivable balance))
4. ✓ Payable and receivable parties must be different
5. ✓ No cash or bank accounts involved
6. ✓ Atomic transaction (all-or-nothing)

## Reversal Support

The reversal mechanism uses `ledgerService.reverseSource()` which:
- Finds all ledger entries for the settlement
- Creates offsetting entries (debit ↔ credit)
- Restores original balances
- Marks settlement as 'reversed'

## Files Modified

- `src/modules/parties/parties.service.ts`
  - Fixed `createPartySettlement()` method
  - Added comprehensive documentation
  - Corrected ledger entry types

## Testing Checklist

- [ ] Create settlement with valid payable and receivable parties
- [ ] Verify both balances reduce to zero
- [ ] Verify cash/bank balances unchanged
- [ ] Test settlement amount validation
- [ ] Test reversal restores original balances
- [ ] Test edit scenario (delete + recreate)
- [ ] Verify ledger entries are balanced (debits = credits)
- [ ] Verify settlement history shows correct entries

## API Endpoints

**Create Settlement:**
```
POST /parties/settlements
{
  "payablePartyId": "uuid",
  "receivablePartyId": "uuid",
  "settlementAmount": 10000,
  "departmentId": "uuid",
  "settlementDate": "2026-07-12",
  "reference": "REF-001",
  "notes": "Settlement notes"
}
```

**Reverse Settlement:**
```
POST /parties/settlements/:id/reverse
{
  "reversalReason": "Reason for reversal"
}
```

**Get Settlement History:**
```
GET /parties/:id/settlements?departmentId=uuid
```

## Frontend Components

The frontend already has proper UI components:
- `PartySettlementDialog.tsx` - Form for creating settlements
- `PartySettlementPage.tsx` - Dashboard with history
- `PartySettlementHistory.tsx` - Settlement records display

All validation and balance display logic is correctly implemented.

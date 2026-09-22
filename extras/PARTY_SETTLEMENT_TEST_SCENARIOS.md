# Party Settlement Balance Fix - Test Scenarios

## Test Environment Setup

### Prerequisites
- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:5173`
- Database with test data

### Test Data Required

Create two parties in a department (e.g., BROKERAGE):

**Party A (Payable):**
- Name: "Test Payable Party"
- Type: SUPPLIER
- Opening Balance: +10,000 (we owe them)
- Department: BROKERAGE

**Party B (Receivable):**
- Name: "Test Receivable Party"
- Type: CUSTOMER
- Opening Balance: -10,000 (they owe us)
- Department: BROKERAGE

## Test Scenario 1: Basic Settlement

### Setup
```
Party A Balance: +10,000 (Payable)
Party B Balance: -10,000 (Receivable)
```

### Action
Create settlement:
```json
{
  "payablePartyId": "party-a-id",
  "receivablePartyId": "party-b-id",
  "settlementAmount": 10000,
  "departmentId": "brokerage-dept-id",
  "settlementDate": "2026-07-12",
  "reference": "TEST-001",
  "notes": "Test settlement"
}
```

### Expected Result
```
Party A Balance: 0 (was +10,000, reduced by 10,000)
Party B Balance: 0 (was -10,000, increased by 10,000)
Cash Balance: Unchanged
Bank Balance: Unchanged
```

### Verification Steps
1. ✓ Settlement created successfully
2. ✓ Check Party A balance in ledger: should be 0
3. ✓ Check Party B balance in ledger: should be 0
4. ✓ Verify ledger entries:
   - Entry 1: Credit accounts_payable (Party A) by 10,000
   - Entry 2: Debit accounts_receivable (Party B) by 10,000
5. ✓ Verify total debits = total credits (balanced)
6. ✓ Verify cash/bank accounts unchanged

## Test Scenario 2: Partial Settlement

### Setup
```
Party A Balance: +15,000 (Payable)
Party B Balance: -10,000 (Receivable)
```

### Action
Create settlement:
```json
{
  "payablePartyId": "party-a-id",
  "receivablePartyId": "party-b-id",
  "settlementAmount": 10000,
  "departmentId": "brokerage-dept-id"
}
```

### Expected Result
```
Party A Balance: +5,000 (was +15,000, reduced by 10,000)
Party B Balance: 0 (was -10,000, increased by 10,000)
```

### Verification Steps
1. ✓ Settlement created successfully
2. ✓ Party A balance: 5,000
3. ✓ Party B balance: 0
4. ✓ Ledger entries balanced

## Test Scenario 3: Validation - Insufficient Payable Balance

### Setup
```
Party A Balance: +5,000 (Payable)
Party B Balance: -10,000 (Receivable)
```

### Action
Attempt settlement:
```json
{
  "payablePartyId": "party-a-id",
  "receivablePartyId": "party-b-id",
  "settlementAmount": 10000,
  "departmentId": "brokerage-dept-id"
}
```

### Expected Result
```
Error: "Settlement amount (10000) exceeds maximum available (5000)"
No changes to balances
```

### Verification Steps
1. ✓ Request rejected with 400 Bad Request
2. ✓ Error message indicates max settlement is 5,000
3. ✓ Balances unchanged

## Test Scenario 4: Validation - Insufficient Receivable Balance

### Setup
```
Party A Balance: +10,000 (Payable)
Party B Balance: -5,000 (Receivable)
```

### Action
Attempt settlement:
```json
{
  "payablePartyId": "party-a-id",
  "receivablePartyId": "party-b-id",
  "settlementAmount": 10000,
  "departmentId": "brokerage-dept-id"
}
```

### Expected Result
```
Error: "Settlement amount (10000) exceeds maximum available (5000)"
No changes to balances
```

### Verification Steps
1. ✓ Request rejected with 400 Bad Request
2. ✓ Error message indicates max settlement is 5,000
3. ✓ Balances unchanged

## Test Scenario 5: Validation - Same Party

### Setup
```
Party A Balance: +10,000
```

### Action
Attempt settlement:
```json
{
  "payablePartyId": "party-a-id",
  "receivablePartyId": "party-a-id",
  "settlementAmount": 5000,
  "departmentId": "brokerage-dept-id"
}
```

### Expected Result
```
Error: "Payable party and receivable party must be different"
```

### Verification Steps
1. ✓ Request rejected with 400 Bad Request
2. ✓ Balances unchanged

## Test Scenario 6: Validation - No Payable Balance

### Setup
```
Party A Balance: -5,000 (Receivable, not Payable)
Party B Balance: -10,000 (Receivable)
```

### Action
Attempt settlement:
```json
{
  "payablePartyId": "party-a-id",
  "receivablePartyId": "party-b-id",
  "settlementAmount": 5000,
  "departmentId": "brokerage-dept-id"
}
```

### Expected Result
```
Error: "Payable party \"Test Party A\" has no outstanding payable balance (current: -5000)"
```

### Verification Steps
1. ✓ Request rejected with 400 Bad Request
2. ✓ Balances unchanged

## Test Scenario 7: Validation - No Receivable Balance

### Setup
```
Party A Balance: +10,000 (Payable)
Party B Balance: +5,000 (Payable, not Receivable)
```

### Action
Attempt settlement:
```json
{
  "payablePartyId": "party-a-id",
  "receivablePartyId": "party-b-id",
  "settlementAmount": 5000,
  "departmentId": "brokerage-dept-id"
}
```

### Expected Result
```
Error: "Receivable party \"Test Party B\" has no outstanding receivable balance (current: 5000)"
```

### Verification Steps
1. ✓ Request rejected with 400 Bad Request
2. ✓ Balances unchanged

## Test Scenario 8: Reversal

### Setup
Settlement already created:
```
Party A Balance: 0
Party B Balance: 0
Settlement ID: settlement-123
```

### Action
Reverse settlement:
```json
POST /parties/settlements/settlement-123/reverse
{
  "reversalReason": "Incorrect settlement"
}
```

### Expected Result
```
Party A Balance: +10,000 (restored)
Party B Balance: -10,000 (restored)
Settlement Status: "reversed"
```

### Verification Steps
1. ✓ Reversal successful
2. ✓ Party A balance: 10,000
3. ✓ Party B balance: -10,000
4. ✓ Settlement status: "reversed"
5. ✓ Reversal entries created (offsetting entries)
6. ✓ Ledger balanced

## Test Scenario 9: Settlement History

### Setup
Multiple settlements created for Party A

### Action
Get settlement history:
```
GET /parties/party-a-id/settlements?departmentId=brokerage-dept-id
```

### Expected Result
```json
{
  "success": true,
  "data": [
    {
      "id": "settlement-123",
      "payablePartyId": "party-a-id",
      "receivablePartyId": "party-b-id",
      "settlementAmount": "10000.00",
      "settlementDate": "2026-07-12",
      "status": "active",
      "reference": "TEST-001",
      "notes": "Test settlement",
      "payableParty": { ... },
      "receivableParty": { ... }
    }
  ]
}
```

### Verification Steps
1. ✓ All settlements returned
2. ✓ Correct party relationships shown
3. ✓ Status correctly displayed

## Test Scenario 10: Frontend UI

### Setup
Navigate to Party Settlement page

### Action
1. Select payable party (Party A with +10,000)
2. Select receivable party (Party B with -10,000)
3. Enter settlement amount: 10,000
4. Click "Create Settlement"

### Expected Result
1. ✓ Payable party dropdown shows balance
2. ✓ Receivable party dropdown shows balance
3. ✓ Maximum settlement amount calculated correctly
4. ✓ Settlement created successfully
5. ✓ Dialog closes
6. ✓ Settlement history updated

## Ledger Verification

For each settlement, verify the ledger entries:

### Entry 1: Reduce Payable Balance
```
Account: accounts_payable
Party: Payable Party
Entry Type: CREDIT
Amount: Settlement Amount
Effect: Reduces positive balance
```

### Entry 2: Reduce Receivable Balance
```
Account: accounts_receivable
Party: Receivable Party
Entry Type: DEBIT
Amount: Settlement Amount
Effect: Reduces negative balance (makes it less negative)
```

### Balance Calculation
```
Balance = SUM(debit entries) - SUM(credit entries)

For Payable Party:
Before: 10,000 - 0 = 10,000
After:  10,000 - 10,000 = 0 ✓

For Receivable Party:
Before: 0 - 10,000 = -10,000
After:  10,000 - 10,000 = 0 ✓
```

## Automated Test Cases

### Unit Test: Balance Calculation
```typescript
describe('Party Settlement Balance', () => {
  it('should reduce payable balance by settlement amount', async () => {
    // Setup: Party A with +10,000
    // Action: Create settlement for 10,000
    // Assert: Party A balance = 0
  });

  it('should reduce receivable balance by settlement amount', async () => {
    // Setup: Party B with -10,000
    // Action: Create settlement for 10,000
    // Assert: Party B balance = 0
  });

  it('should maintain ledger balance (debits = credits)', async () => {
    // Setup: Create settlement
    // Assert: Sum of debits = Sum of credits
  });

  it('should restore balances on reversal', async () => {
    // Setup: Create and reverse settlement
    // Assert: Balances restored to original values
  });
});
```

## Debugging Checklist

If tests fail:

1. ✓ Check ledger entries exist for settlement
2. ✓ Verify entry types (credit for payable, debit for receivable)
3. ✓ Verify amounts are correct
4. ✓ Check balance calculation formula: debit - credit
5. ✓ Verify no cash/bank entries created
6. ✓ Check transaction atomicity (all-or-nothing)
7. ✓ Verify settlement status is 'active'
8. ✓ Check createdBy and createdAt timestamps

## Success Criteria

All tests pass when:
- ✓ Payable balance reduces correctly
- ✓ Receivable balance reduces correctly
- ✓ Both balances move toward zero
- ✓ Cash/bank balances unchanged
- ✓ Ledger entries balanced
- ✓ Validation rules enforced
- ✓ Reversals restore original balances
- ✓ Settlement history accurate
- ✓ Frontend UI works correctly

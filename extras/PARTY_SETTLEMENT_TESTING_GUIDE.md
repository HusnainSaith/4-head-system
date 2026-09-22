# Party Settlement Feature - Testing Guide

## Overview
This guide provides comprehensive testing procedures for the party-to-party settlement feature.

## Prerequisites
- Backend running on http://localhost:3000
- Admin user account
- Two parties with opposite balances (one payable, one receivable)

## Test Data Setup

### Create Test Parties

**Party A (Payable):**
```bash
POST /parties
{
  "name": "Test Payable Party",
  "partyType": "CUSTOMER",
  "phone": "03001234567",
  "address": "Test Address",
  "departmentIds": ["<department-id>"],
  "openingBalance": 10000
}
```

**Party B (Receivable):**
```bash
POST /parties
{
  "name": "Test Receivable Party",
  "partyType": "FARM",
  "phone": "03009876543",
  "address": "Test Address",
  "departmentIds": ["<department-id>"],
  "openingBalance": -10000
}
```

## Test Cases

### Test 1: Create Valid Settlement

**Objective**: Verify settlement creation with valid parties and amounts

**Steps**:
1. Create settlement with:
   - Payable Party: Party A (balance: +10,000)
   - Receivable Party: Party B (balance: -10,000)
   - Settlement Amount: 10,000

**Request**:
```bash
POST /parties/settlements
{
  "payablePartyId": "<party-a-id>",
  "receivablePartyId": "<party-b-id>",
  "settlementAmount": 10000,
  "departmentId": "<department-id>",
  "settlementDate": "2026-07-12",
  "reference": "TEST-001",
  "notes": "Test settlement"
}
```

**Expected Result**:
- Status: 201 Created
- Settlement record created with status 'active'
- Ledger entries created for both parties
- Party A balance: 0
- Party B balance: 0

**Verification**:
```bash
# Check Party A balance
GET /parties/<party-a-id>/statement

# Check Party B balance
GET /parties/<party-b-id>/statement

# Check settlement history
GET /parties/<party-a-id>/settlements
```

---

### Test 2: Partial Settlement

**Objective**: Verify settlement with amount less than available balance

**Setup**:
- Party A balance: +15,000
- Party B balance: -12,000

**Request**:
```bash
POST /parties/settlements
{
  "payablePartyId": "<party-a-id>",
  "receivablePartyId": "<party-b-id>",
  "settlementAmount": 10000,
  "departmentId": "<department-id>",
  "settlementDate": "2026-07-12"
}
```

**Expected Result**:
- Settlement created successfully
- Party A balance: +5,000 (15,000 - 10,000)
- Party B balance: -2,000 (-12,000 + 10,000)

---

### Test 3: Error - Same Party

**Objective**: Verify error when payable and receivable parties are the same

**Request**:
```bash
POST /parties/settlements
{
  "payablePartyId": "<party-a-id>",
  "receivablePartyId": "<party-a-id>",
  "settlementAmount": 5000,
  "departmentId": "<department-id>"
}
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "Payable party and receivable party must be different"

---

### Test 4: Error - No Payable Balance

**Objective**: Verify error when payable party has no positive balance

**Setup**:
- Party A balance: -5,000 (receivable, not payable)
- Party B balance: -10,000

**Request**:
```bash
POST /parties/settlements
{
  "payablePartyId": "<party-a-id>",
  "receivablePartyId": "<party-b-id>",
  "settlementAmount": 5000,
  "departmentId": "<department-id>"
}
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "Payable party has no outstanding payable balance"

---

### Test 5: Error - No Receivable Balance

**Objective**: Verify error when receivable party has no negative balance

**Setup**:
- Party A balance: +10,000
- Party B balance: +5,000 (payable, not receivable)

**Request**:
```bash
POST /parties/settlements
{
  "payablePartyId": "<party-a-id>",
  "receivablePartyId": "<party-b-id>",
  "settlementAmount": 5000,
  "departmentId": "<department-id>"
}
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "Receivable party has no outstanding receivable balance"

---

### Test 6: Error - Excess Settlement Amount

**Objective**: Verify error when settlement amount exceeds available balance

**Setup**:
- Party A balance: +8,000
- Party B balance: -12,000
- Settlement Amount: 10,000 (exceeds Party A's balance)

**Request**:
```bash
POST /parties/settlements
{
  "payablePartyId": "<party-a-id>",
  "receivablePartyId": "<party-b-id>",
  "settlementAmount": 10000,
  "departmentId": "<department-id>"
}
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "Settlement amount exceeds maximum available"

---

### Test 7: Reverse Settlement

**Objective**: Verify settlement reversal restores original balances

**Setup**:
- Settlement created with Party A (+10,000) and Party B (-10,000)
- After settlement: Party A (0), Party B (0)

**Request**:
```bash
POST /parties/settlements/<settlement-id>/reverse
{
  "reversalReason": "Test reversal"
}
```

**Expected Result**:
- Settlement status changed to 'reversed'
- Ledger entries reversed
- Party A balance: +10,000 (restored)
- Party B balance: -10,000 (restored)

**Verification**:
```bash
# Check settlement status
GET /parties/<settlement-id>

# Check party balances
GET /parties/<party-a-id>/statement
GET /parties/<party-b-id>/statement
```

---

### Test 8: Error - Reverse Already Reversed Settlement

**Objective**: Verify error when attempting to reverse an already reversed settlement

**Setup**:
- Settlement already reversed

**Request**:
```bash
POST /parties/settlements/<settlement-id>/reverse
{
  "reversalReason": "Another reversal"
}
```

**Expected Result**:
- Status: 400 Bad Request
- Error: "Settlement is already reversed"

---

### Test 9: Settlement History

**Objective**: Verify settlement history retrieval

**Request**:
```bash
GET /parties/<party-a-id>/settlements?departmentId=<department-id>
```

**Expected Result**:
- Status: 200 OK
- Returns array of settlements involving Party A
- Ordered by settlement_date DESC, then created_at DESC
- Includes both active and reversed settlements

---

### Test 10: Ledger Entries Verification

**Objective**: Verify correct ledger entries are created

**Setup**:
- Settlement created: Party A (+10,000) → Party B (-10,000), Amount: 10,000

**Verification**:
```bash
# Get Party A statement
GET /parties/<party-a-id>/statement

# Expected entries:
# 1. Debit accounts_payable (Party A): 10,000
#    Running balance: 0

# Get Party B statement
GET /parties/<party-b-id>/statement

# Expected entries:
# 1. Debit accounts_receivable (Party B): 10,000
#    Running balance: 0
```

---

### Test 11: Cash/Bank Not Affected

**Objective**: Verify cash and bank accounts are not affected by settlement

**Setup**:
- Initial cash balance: 50,000
- Initial bank balance: 100,000
- Create settlement: 10,000

**Verification**:
```bash
# Check cash account balance (should be unchanged)
GET /accounts/cash

# Check bank account balance (should be unchanged)
GET /accounts/bank
```

**Expected Result**:
- Cash balance: 50,000 (unchanged)
- Bank balance: 100,000 (unchanged)

---

### Test 12: Multiple Settlements

**Objective**: Verify multiple settlements can be created and tracked

**Setup**:
- Create 3 different settlements with different parties

**Verification**:
```bash
# Get settlement history for each party
GET /parties/<party-a-id>/settlements
GET /parties/<party-b-id>/settlements
GET /parties/<party-c-id>/settlements
```

**Expected Result**:
- Each party shows correct settlements
- All settlements tracked independently
- Balances calculated correctly

---

## Audit Trail Verification

### Check Settlement Audit Fields

```bash
GET /parties/<settlement-id>
```

**Expected Fields**:
- `created_by`: User ID who created settlement
- `created_at`: Timestamp of creation
- `updated_by`: User ID who last updated
- `updated_at`: Timestamp of last update
- `reversed_by`: User ID who reversed (if reversed)
- `reversed_at`: Timestamp of reversal (if reversed)
- `reversal_reason`: Reason for reversal (if reversed)

---

## Performance Testing

### Test Large Number of Settlements

**Objective**: Verify performance with many settlements

**Steps**:
1. Create 100 settlements
2. Retrieve settlement history
3. Measure response time

**Expected Result**:
- Response time < 500ms
- All settlements retrieved correctly

---

## Integration Testing

### Test with Department Scope

**Objective**: Verify settlements respect department scope

**Setup**:
- User assigned to Department A
- Create settlement in Department A
- Attempt to create settlement in Department B

**Expected Result**:
- Settlement in Department A: Success
- Settlement in Department B: Forbidden (403)

---

## Regression Testing

### Verify Existing Features Not Affected

- [ ] Party creation still works
- [ ] Party payments still work
- [ ] Party balance adjustments still work
- [ ] Party statements still work
- [ ] Ledger entries still work
- [ ] Cash/bank payments still work

---

## Test Summary Template

```
Test Date: ___________
Tester: ___________
Environment: ___________

Test Results:
- Test 1 (Valid Settlement): PASS / FAIL
- Test 2 (Partial Settlement): PASS / FAIL
- Test 3 (Same Party Error): PASS / FAIL
- Test 4 (No Payable Balance Error): PASS / FAIL
- Test 5 (No Receivable Balance Error): PASS / FAIL
- Test 6 (Excess Amount Error): PASS / FAIL
- Test 7 (Reverse Settlement): PASS / FAIL
- Test 8 (Reverse Already Reversed Error): PASS / FAIL
- Test 9 (Settlement History): PASS / FAIL
- Test 10 (Ledger Entries): PASS / FAIL
- Test 11 (Cash/Bank Not Affected): PASS / FAIL
- Test 12 (Multiple Settlements): PASS / FAIL

Issues Found:
1. ___________
2. ___________

Sign-off: ___________
```

---

## Cleanup

After testing, clean up test data:

```bash
# Delete test parties
DELETE /parties/<party-a-id>
DELETE /parties/<party-b-id>

# Verify deletion
GET /parties
```

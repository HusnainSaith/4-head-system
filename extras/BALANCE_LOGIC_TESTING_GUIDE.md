# Balance Logic Reversal - Testing Guide

## Test Environment Setup

Before running tests, ensure:
1. Backend is running on `http://localhost:3000`
2. Frontend is running on `http://localhost:5173`
3. Database is populated with test data
4. You have admin access to create/modify parties

---

## Test Case 1: Create Party with Positive Opening Balance

**Objective**: Verify that positive opening balance creates negative balance in system (receivable)

**Steps**:
1. Navigate to Parties page
2. Click "Add Party"
3. Fill in party details:
   - Name: "Test Farm - Positive Balance"
   - Party Type: "Farm"
   - Primary Department: "Brokerage"
   - Opening Balance: 5000
4. Click "Create Party"

**Expected Results**:
- Party is created successfully
- In parties list, balance shows as **-5000** in **green** (receivable)
- Party statement shows "Department receives 5000"
- Stat card shows "Receivable from party: 5000"

**Verification**:
```
Balance in DB: -5000
Display: -5000 (green)
Interpretation: Department receives 5000 from party
```

---

## Test Case 2: Create Party with Negative Opening Balance

**Objective**: Verify that negative opening balance creates positive balance in system (payable)

**Steps**:
1. Navigate to Parties page
2. Click "Add Party"
3. Fill in party details:
   - Name: "Test Supplier - Negative Balance"
   - Party Type: "Broker"
   - Primary Department: "Supply"
   - Opening Balance: -3000
4. Click "Create Party"

**Expected Results**:
- Party is created successfully
- In parties list, balance shows as **+3000** in **red** (payable)
- Party statement shows "Department pays 3000"
- Stat card shows "Payable to party: 3000"

**Verification**:
```
Balance in DB: +3000
Display: +3000 (red)
Interpretation: Department pays 3000 to party
```

---

## Test Case 3: Adjust Party Balance - Increase Receivable

**Objective**: Verify balance adjustment for receivable (negative) amounts

**Steps**:
1. Open a party with negative balance (from Test Case 1)
2. Click "Edit"
3. Scroll to "Adjust Balance" section
4. Fill in:
   - Department: "Brokerage"
   - Amount: -2000 (negative = increase receivable)
   - Notes: "Additional sale"
5. Click "Adjust Balance"

**Expected Results**:
- Balance adjustment is successful
- Balance changes from -5000 to -7000
- Display updates to show -7000 in green
- Statement shows new entry with party_adjustment source

**Verification**:
```
Old Balance: -5000
Adjustment: -2000
New Balance: -7000
Display: -7000 (green, receivable)
```

---

## Test Case 4: Adjust Party Balance - Increase Payable

**Objective**: Verify balance adjustment for payable (positive) amounts

**Steps**:
1. Open a party with positive balance (from Test Case 2)
2. Click "Edit"
3. Scroll to "Adjust Balance" section
4. Fill in:
   - Department: "Supply"
   - Amount: 1500 (positive = increase payable)
   - Notes: "Additional purchase"
5. Click "Adjust Balance"

**Expected Results**:
- Balance adjustment is successful
- Balance changes from +3000 to +4500
- Display updates to show +4500 in red
- Statement shows new entry with party_adjustment source

**Verification**:
```
Old Balance: +3000
Adjustment: +1500
New Balance: +4500
Display: +4500 (red, payable)
```

---

## Test Case 5: Record Payment - Receivable (Negative Balance)

**Objective**: Verify payment recording for receivable amounts

**Steps**:
1. Open party statement for party with negative balance (e.g., -7000)
2. Click "Record Payment"
3. Fill in payment details:
   - Direction: "Received from party" (should be pre-selected)
   - Amount: 3000
   - Payment Method: "Cash"
   - Date: Today
4. Click "Record Payment"

**Expected Results**:
- Payment is recorded successfully
- Balance changes from -7000 to -4000
- New ledger entry appears in statement
- Toast shows "Payment recorded"

**Verification**:
```
Old Balance: -7000
Payment Received: 3000
New Balance: -4000
Direction: RECEIVED (correct for negative balance)
```

---

## Test Case 6: Record Payment - Payable (Positive Balance)

**Objective**: Verify payment recording for payable amounts

**Steps**:
1. Open party statement for party with positive balance (e.g., +4500)
2. Click "Record Payment"
3. Fill in payment details:
   - Direction: "Paid to party" (should be pre-selected)
   - Amount: 2000
   - Payment Method: "Bank"
   - Date: Today
4. Click "Record Payment"

**Expected Results**:
- Payment is recorded successfully
- Balance changes from +4500 to +2500
- New ledger entry appears in statement
- Toast shows "Payment recorded"

**Verification**:
```
Old Balance: +4500
Payment Paid: 2000
New Balance: +2500
Direction: PAID (correct for positive balance)
```

---

## Test Case 7: Payment Direction Validation - Negative Balance

**Objective**: Verify that wrong payment direction is rejected for receivable

**Steps**:
1. Open party statement for party with negative balance (e.g., -4000)
2. Click "Record Payment"
3. Try to select "Paid to party" direction
4. Fill in amount and submit

**Expected Results**:
- Error message appears: "This balance must be recorded as received"
- Payment is not recorded
- Balance remains unchanged

**Verification**:
```
Balance: -4000 (receivable)
Attempted Direction: PAID
Result: ERROR (correct validation)
```

---

## Test Case 8: Payment Direction Validation - Positive Balance

**Objective**: Verify that wrong payment direction is rejected for payable

**Steps**:
1. Open party statement for party with positive balance (e.g., +2500)
2. Click "Record Payment"
3. Try to select "Received from party" direction
4. Fill in amount and submit

**Expected Results**:
- Error message appears: "This balance must be recorded as paid"
- Payment is not recorded
- Balance remains unchanged

**Verification**:
```
Balance: +2500 (payable)
Attempted Direction: RECEIVED
Result: ERROR (correct validation)
```

---

## Test Case 9: Department Balance Totals

**Objective**: Verify that department balance totals are correctly calculated

**Steps**:
1. Navigate to a department's balance view (if available)
2. Check total receivable and payable amounts
3. Manually verify against party balances

**Expected Results**:
- Total Receivable = Sum of all negative balances (absolute values)
- Total Payable = Sum of all positive balances
- Totals match manual calculation

**Verification**:
```
Party 1: -5000 (receivable)
Party 2: +3000 (payable)
Party 3: -2000 (receivable)

Total Receivable: 7000 (5000 + 2000)
Total Payable: 3000
```

---

## Test Case 10: Party Statement Running Balance

**Objective**: Verify running balance calculation in statement

**Steps**:
1. Open party statement for any party
2. Review the running balance column
3. Verify each entry's running balance is correct

**Expected Results**:
- Running balance starts at opening balance
- Each debit entry reduces balance (makes more negative)
- Each credit entry increases balance (makes more positive)
- Final running balance matches closing balance

**Verification**:
```
Opening Balance: -5000
Entry 1 (Debit 1000): -6000
Entry 2 (Credit 500): -5500
Entry 3 (Debit 2000): -7500
Closing Balance: -7500 ✓
```

---

## Test Case 11: Investor Party Balance Display

**Objective**: Verify investor party balance display with new logic

**Steps**:
1. Create or find an investor party
2. Open its statement
3. Check running balance display

**Expected Results**:
- Positive balance shows as "Payable" in red
- Negative balance shows as "Receivable" in green
- Stat cards show correct amounts

**Verification**:
```
Balance: +5000
Display: "5000 Payable" (red)

Balance: -3000
Display: "3000 Receivable" (green)
```

---

## Test Case 12: Zero Balance Handling

**Objective**: Verify zero balance is handled correctly

**Steps**:
1. Create a party with 0 opening balance
2. View in parties list
3. Open statement

**Expected Results**:
- Parties list shows "Zero / Nil" badge
- Statement shows "Settled" badge
- No receivable or payable amounts

**Verification**:
```
Balance: 0
Display: "Zero / Nil" (outline badge)
Interpretation: Settled
```

---

## Regression Testing

### Existing Data Verification
- [ ] All existing parties show correct balance interpretation
- [ ] All existing statements show correct running balances
- [ ] All existing payments are correctly categorized
- [ ] Department totals match sum of party balances

### Edge Cases
- [ ] Very large balances (> 1,000,000)
- [ ] Very small balances (< 1)
- [ ] Parties with many transactions (> 100 entries)
- [ ] Date range filtering in statements

---

## Performance Testing

- [ ] Parties list loads in < 2 seconds
- [ ] Party statement loads in < 3 seconds
- [ ] Balance calculations are accurate for large datasets
- [ ] No N+1 query issues

---

## Sign-Off

After completing all tests:

- [ ] All test cases passed
- [ ] No regressions detected
- [ ] Performance is acceptable
- [ ] Data integrity verified
- [ ] Ready for production deployment

**Tested By**: _______________
**Date**: _______________
**Notes**: _______________

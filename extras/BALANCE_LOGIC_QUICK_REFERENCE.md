# Balance Logic - Quick Reference Guide

## New Sign Convention

```
NEGATIVE (-) Balance = Department RECEIVES from party (Receivable) ✓ GREEN
POSITIVE (+) Balance = Department PAYS to party (Payable) ✗ RED
ZERO (0) Balance = Settled
```

---

## Quick Decision Tree

### When you see a NEGATIVE balance (-5000):
```
Q: What does this mean?
A: Department receives 5000 from the party

Q: What color should it be?
A: GREEN (good for business)

Q: What payment direction is allowed?
A: RECEIVED (from party)

Q: What payment direction is NOT allowed?
A: PAID (to party)
```

### When you see a POSITIVE balance (+3000):
```
Q: What does this mean?
A: Department pays 3000 to the party

Q: What color should it be?
A: RED (bad for business)

Q: What payment direction is allowed?
A: PAID (to party)

Q: What payment direction is NOT allowed?
A: RECEIVED (from party)
```

---

## Ledger Entry Interpretation

### Debit Entry
- Reduces balance (makes it more negative)
- Increases receivable amount
- Example: Debit 1000 → Balance becomes -1000

### Credit Entry
- Increases balance (makes it more positive)
- Decreases receivable / increases payable
- Example: Credit 500 → Balance becomes +500

---

## Common Scenarios

### Scenario 1: Sale to Party
```
Action: Sell goods worth 5000 to party
Ledger: Debit 5000 to accounts_receivable
Result: Balance = -5000
Meaning: Department receives 5000 from party
Display: -5000 (green)
```

### Scenario 2: Purchase from Party
```
Action: Buy goods worth 3000 from party
Ledger: Credit 3000 to accounts_payable
Result: Balance = +3000
Meaning: Department pays 3000 to party
Display: +3000 (red)
```

### Scenario 3: Payment Received
```
Action: Receive 2000 payment from party
Ledger: Credit 2000 to accounts_receivable
Result: Balance decreases (becomes less negative)
Example: -5000 → -3000
Meaning: Still receives 3000 more from party
```

### Scenario 4: Payment Made
```
Action: Pay 1000 to party
Ledger: Debit 1000 to accounts_payable
Result: Balance decreases (becomes less positive)
Example: +3000 → +2000
Meaning: Still pays 2000 more to party
```

---

## Department Balance Totals

### Total Receivable
```
Sum of all NEGATIVE balances (absolute values)

Example:
  Party A: -5000
  Party B: -2000
  Party C: +3000
  
  Total Receivable = 5000 + 2000 = 7000
```

### Total Payable
```
Sum of all POSITIVE balances

Example:
  Party A: -5000
  Party B: -2000
  Party C: +3000
  
  Total Payable = 3000
```

---

## Balance Adjustment

### Increase Receivable (Make more negative)
```
Action: Adjust balance by -2000
Result: Balance becomes more negative
Example: -5000 → -7000
Meaning: Department receives more from party
```

### Increase Payable (Make more positive)
```
Action: Adjust balance by +1500
Result: Balance becomes more positive
Example: +3000 → +4500
Meaning: Department pays more to party
```

---

## Payment Recording

### For Negative Balance (Receivable)
```
Current Balance: -5000
Allowed Direction: RECEIVED from party
Action: Record payment received
Result: Balance increases (becomes less negative)
Example: -5000 + 3000 = -2000
```

### For Positive Balance (Payable)
```
Current Balance: +3000
Allowed Direction: PAID to party
Action: Record payment paid
Result: Balance decreases (becomes less positive)
Example: +3000 - 2000 = +1000
```

---

## Color Coding

### GREEN (Good for Business)
- Negative balance
- Department receives from party
- Receivable amount

### RED (Bad for Business)
- Positive balance
- Department pays to party
- Payable amount

### GRAY (Neutral)
- Zero balance
- Settled
- No outstanding amount

---

## Frontend Display Rules

### Parties List
```
Balance < 0 → GREEN text with "-" prefix
Balance > 0 → RED text with "+" prefix
Balance = 0 → Gray "Zero / Nil" badge
```

### Party Statement Badge
```
Balance < 0 → "Department receives {amount}" (green)
Balance > 0 → "Department pays {amount}" (red)
Balance = 0 → "Settled" (gray)
```

### Stat Cards
```
Receivable = max(-balance, 0)
Payable = max(balance, 0)
```

### Running Balance (Investor)
```
Balance < 0 → "{amount} Receivable" (green)
Balance > 0 → "{amount} Payable" (red)
Balance = 0 → "Settled" (gray)
```

---

## Troubleshooting

### Issue: Balance shows wrong sign
**Solution**: Check if balance calculation is using new formula
```
New: balance += (debit ? -amount : amount)
Old: balance += (debit ? amount : -amount)
```

### Issue: Color is inverted
**Solution**: Check if color logic is reversed
```
New: balance < 0 ? "green" : "red"
Old: balance > 0 ? "green" : "red"
```

### Issue: Payment direction rejected
**Solution**: Verify balance sign matches expected direction
```
Negative balance → Must use "RECEIVED"
Positive balance → Must use "PAID"
```

### Issue: Department totals don't match
**Solution**: Verify receivable/payable categorization
```
Receivable = sum of negative balances (absolute)
Payable = sum of positive balances
```

---

## Verification Checklist

- [ ] Negative balance displays in green
- [ ] Positive balance displays in red
- [ ] Stat cards show correct receivable/payable
- [ ] Payment direction validation works
- [ ] Department totals are correct
- [ ] Running balance calculation is correct
- [ ] All existing data is correctly interpreted
- [ ] No data loss or corruption

---

## Key Formulas

### Balance Calculation
```
balance = 0
for each ledger entry:
  if entry.type == 'debit':
    balance -= entry.amount
  else:
    balance += entry.amount
```

### Department Totals
```
receivable = sum(abs(balance) for balance in balances if balance < 0)
payable = sum(balance for balance in balances if balance > 0)
```

### Stat Cards
```
receivable_display = max(-closing_balance, 0)
payable_display = max(closing_balance, 0)
```

---

## Remember

1. **Negative = Good** (Department receives)
2. **Positive = Bad** (Department pays)
3. **Debit = Negative** (Reduces balance)
4. **Credit = Positive** (Increases balance)
5. **Database unchanged** (Only interpretation changes)
6. **All data preserved** (No loss or corruption)

---

## Support

For questions or issues:
1. Check this quick reference
2. Review the detailed testing guide
3. Check the before/after comparison
4. Review the implementation summary

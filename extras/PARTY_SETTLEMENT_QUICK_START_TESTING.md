# Party Settlement - Quick Start Testing (5 Minutes)

## Prerequisites (1 minute)

### Start Backend & Frontend
```bash
# Terminal 1: Backend
cd 4_Head_poltary_system
npm run start:dev

# Terminal 2: Frontend
cd 4Head_frontend
npm run dev
```

### Open Browser
- Go to: `http://localhost:5173`
- Login with admin credentials

---

## Create Test Data (2 minutes)

### Create Party A (Payable)
1. Go to **Parties** → **Create Party**
2. Fill:
   - Name: `Party A`
   - Type: `SUPPLIER`
   - Department: `BROKERAGE`
   - Opening Balance: `10000`
3. Click **Save**

### Create Party B (Receivable)
1. Click **Create Party** again
2. Fill:
   - Name: `Party B`
   - Type: `CUSTOMER`
   - Department: `BROKERAGE`
   - Opening Balance: `-10000`
3. Click **Save**

### Verify Balances
- Go to **Parties** list
- Party A should show: **+10,000**
- Party B should show: **-10,000**

---

## Test Settlement (2 minutes)

### Navigate to Settlement
1. Find **Settlements** or **Party Settlement** in menu
2. Click to open
3. You should see:
   - Summary cards at top
   - Settlement history (empty)
   - **Create Settlement** button

### Create Settlement
1. Click **Create Settlement**
2. Dialog opens

### Fill Form
1. **Payable Party**: Select "Party A"
   - Shows: "Current balance: Rs. 10,000.00"
2. **Receivable Party**: Select "Party B"
   - Shows: "Current balance: Rs. -10,000.00"
3. **Settlement Amount**: Enter `10000`
   - Shows: "Maximum: Rs. 10,000.00"
4. Click **Create Settlement**

### Verify Success
- Dialog closes
- Success message appears
- Settlement appears in history table
- Shows: Party A | Party B | 10,000 | active

### Verify Balances Updated
1. Go to **Parties** list
2. Party A balance: **0** (was +10,000) ✓
3. Party B balance: **0** (was -10,000) ✓

---

## Test Reversal (1 minute)

### Reverse Settlement
1. Go back to **Settlements**
2. Find settlement in history
3. Click **Reverse** button
4. Enter reason: `Test reversal`
5. Click **Confirm**

### Verify Reversal
- Settlement status: **reversed**
- Go to **Parties** list
- Party A balance: **+10,000** (restored) ✓
- Party B balance: **-10,000** (restored) ✓

---

## Test Validation (Optional)

### Test 1: Insufficient Balance
1. Create new parties:
   - Party C: +5,000
   - Party D: -10,000
2. Try settlement: 10,000
3. Error: "Settlement amount exceeds maximum available (5,000)"

### Test 2: Same Party
1. Try to select same party for both sides
2. Error: "Payable party and receivable party must be different"

### Test 3: No Payable Balance
1. Create party with -5,000 balance
2. Try to use as payable party
3. Error: "has no outstanding payable balance"

---

## Check Network (Optional)

### Open DevTools
1. Press **F12**
2. Go to **Network** tab

### Create Settlement
1. Fill form and submit
2. Watch Network tab
3. Should see: `POST /parties/settlements` → Status **201**

### Check Response
```json
{
  "success": true,
  "message": "Party settlement created successfully",
  "data": {
    "id": "...",
    "settlementAmount": "10000.00",
    "status": "active"
  }
}
```

---

## Success Checklist

- [ ] Created Party A with +10,000 balance
- [ ] Created Party B with -10,000 balance
- [ ] Created settlement for 10,000
- [ ] Both balances reduced to 0
- [ ] Settlement appears in history
- [ ] Reversed settlement
- [ ] Balances restored to original
- [ ] Validation errors work correctly
- [ ] Network requests successful

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Parties not showing in dropdown | Refresh page (F5) |
| Settlement won't create | Check balances are correct |
| Balances not updating | Refresh page (F5) |
| Error message appears | Read error and fix issue |
| Dialog won't open | Check browser console (F12) |

---

## Next Steps

1. **Test More Scenarios**
   - Partial settlements
   - Multiple settlements
   - Different departments

2. **Check Backend Logs**
   - Look for any errors
   - Verify ledger entries created

3. **Test on Different Browsers**
   - Chrome
   - Firefox
   - Safari

4. **Test Mobile**
   - Open DevTools (F12)
   - Click device toolbar (Ctrl+Shift+M)
   - Test on mobile view

---

## Key Points to Remember

✓ **Positive balance** = Payable (we owe them)
✓ **Negative balance** = Receivable (they owe us)
✓ **Settlement** = Reduce both balances by same amount
✓ **Reversal** = Restore original balances
✓ **No cash/bank** = Pure party-to-party adjustment

---

## Detailed Guides

For more detailed information, see:
- `PARTY_SETTLEMENT_UI_TESTING_GUIDE.md` - Full testing guide
- `PARTY_SETTLEMENT_UI_NAVIGATION_GUIDE.md` - Visual navigation guide
- `PARTY_SETTLEMENT_QUICK_FIX_REFERENCE.md` - Technical reference

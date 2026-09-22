# Party Settlement UI Testing Guide - Browser

## Prerequisites

### 1. Start the Application
```bash
# Terminal 1: Backend
cd 4_Head_poltary_system
npm run start:dev

# Terminal 2: Frontend
cd 4Head_frontend
npm run dev
```

### 2. Access the Application
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

### 3. Login
- Navigate to login page
- Use test credentials (admin account)
- Ensure you have access to a department (e.g., BROKERAGE)

### 4. Create Test Data

Before testing settlements, you need two parties with opposite balances.

#### Create Party A (Payable)
1. Navigate to **Parties** section
2. Click **Create Party** or **Add Party**
3. Fill in:
   - **Name**: "Test Payable Party"
   - **Type**: SUPPLIER
   - **Department**: BROKERAGE
   - **Opening Balance**: 10000 (positive = payable)
   - **Phone**: 03001234567 (optional)
4. Click **Save**
5. Note the Party ID or name

#### Create Party B (Receivable)
1. Click **Create Party** again
2. Fill in:
   - **Name**: "Test Receivable Party"
   - **Type**: CUSTOMER
   - **Department**: BROKERAGE
   - **Opening Balance**: -10000 (negative = receivable)
   - **Phone**: 03009876543 (optional)
3. Click **Save**
4. Note the Party ID or name

### 5. Verify Opening Balances

Navigate to **Parties** list:
- Party A should show: **+10,000** or **10,000** (payable)
- Party B should show: **-10,000** (receivable)

If balances don't show, refresh the page.

---

## Test Scenario 1: Basic Settlement (Full Amount)

### Objective
Settle both parties completely against each other.

### Setup
```
Party A Balance: +10,000 (Payable)
Party B Balance: -10,000 (Receivable)
```

### Steps

#### Step 1: Navigate to Party Settlement
1. Look for **Party Settlement** or **Settlement** menu item
2. Or navigate to: `http://localhost:5173/settlements` (adjust URL based on routing)
3. You should see:
   - Summary cards showing total payable and receivable
   - Settlement history (empty initially)
   - **Create Settlement** button

#### Step 2: Click Create Settlement
1. Click the **Create Settlement** button
2. A dialog should open with form fields:
   - Payable Party (dropdown)
   - Receivable Party (dropdown)
   - Settlement Amount (input)
   - Settlement Date (date picker)
   - Reference (optional)
   - Notes (optional)

#### Step 3: Select Payable Party
1. Click **Payable Party** dropdown
2. Select **"Test Payable Party"**
3. You should see:
   - Party name displayed
   - Current balance shown: **10,000** or **+10,000**
   - Balance info: "Current balance: Rs. 10,000.00"

#### Step 4: Select Receivable Party
1. Click **Receivable Party** dropdown
2. Select **"Test Receivable Party"**
3. You should see:
   - Party name displayed
   - Current balance shown: **-10,000**
   - Balance info: "Current balance: Rs. -10,000.00"

#### Step 5: Enter Settlement Amount
1. Click **Settlement Amount** input field
2. Enter: **10000**
3. You should see:
   - Maximum settlement amount displayed: "Maximum: Rs. 10,000.00"
   - Input accepts the value

#### Step 6: Verify Date
1. Settlement Date should default to today
2. You can change it if needed
3. Leave as default for this test

#### Step 7: Add Reference (Optional)
1. Click **Reference** field
2. Enter: **TEST-001**
3. This helps identify the settlement later

#### Step 8: Add Notes (Optional)
1. Click **Notes** field
2. Enter: **Test settlement - full amount**

#### Step 9: Submit Form
1. Click **Create Settlement** button
2. Wait for response (should be quick)

### Expected Results

#### Success Response
- Dialog closes automatically
- You see a success message (toast/notification)
- Settlement history updates with new entry
- New settlement shows:
  - Payable Party: "Test Payable Party"
  - Receivable Party: "Test Receivable Party"
  - Amount: 10,000.00
  - Date: Today's date
  - Status: "active"

#### Balance Updates
Navigate to **Parties** list:
- Party A balance: **0** (was +10,000)
- Party B balance: **0** (was -10,000)

#### Verification in Settlement History
1. Settlement appears in history table
2. Shows both parties
3. Shows settlement amount
4. Shows settlement date
5. Status shows "active"

---

## Test Scenario 2: Partial Settlement

### Objective
Settle only part of the available balance.

### Setup
First, create new parties with different balances:

#### Create Party C (Payable)
- Name: "Test Payable Party 2"
- Opening Balance: **15000**

#### Create Party D (Receivable)
- Name: "Test Receivable Party 2"
- Opening Balance: **-10000**

### Steps

#### Step 1: Navigate to Settlement
1. Go to Party Settlement page
2. Click **Create Settlement**

#### Step 2: Select Parties
1. Payable Party: "Test Payable Party 2"
   - Shows balance: 15,000
2. Receivable Party: "Test Receivable Party 2"
   - Shows balance: -10,000

#### Step 3: Enter Partial Amount
1. Settlement Amount: **7000**
2. Maximum shown: "Maximum: Rs. 10,000.00"
3. Your amount (7,000) is less than max, so it's valid

#### Step 4: Submit
1. Click **Create Settlement**
2. Wait for success

### Expected Results

#### Settlement Created
- Dialog closes
- Success message appears
- Settlement history updated

#### Balance Updates
Navigate to **Parties** list:
- Party C balance: **8,000** (was 15,000, reduced by 7,000)
- Party D balance: **-3,000** (was -10,000, increased by 7,000)

#### Verification
- Payable reduced by settlement amount ✓
- Receivable reduced by settlement amount ✓
- Both moved toward zero ✓

---

## Test Scenario 3: Validation - Insufficient Payable Balance

### Objective
Test that system rejects settlement when payable balance is insufficient.

### Setup
Create parties:
- Party E (Payable): +5,000
- Party F (Receivable): -10,000

### Steps

#### Step 1: Create Settlement
1. Go to Party Settlement
2. Click **Create Settlement**

#### Step 2: Select Parties
1. Payable Party: "Party E" (balance: 5,000)
2. Receivable Party: "Party F" (balance: -10,000)

#### Step 3: Try Excessive Amount
1. Settlement Amount: **10000**
2. Maximum shown: "Maximum: Rs. 5,000.00"
3. Your amount exceeds maximum

#### Step 4: Submit
1. Click **Create Settlement**

### Expected Results

#### Error Message
- Dialog stays open
- Error appears: **"Settlement amount cannot exceed 5,000.00"**
- Or: **"Settlement amount (10000) exceeds maximum available (5000)"**
- Form is not submitted

#### No Changes
- Balances remain unchanged
- No settlement created
- Settlement history unchanged

---

## Test Scenario 4: Validation - Insufficient Receivable Balance

### Objective
Test that system rejects settlement when receivable balance is insufficient.

### Setup
Create parties:
- Party G (Payable): +10,000
- Party H (Receivable): -5,000

### Steps

#### Step 1: Create Settlement
1. Go to Party Settlement
2. Click **Create Settlement**

#### Step 2: Select Parties
1. Payable Party: "Party G" (balance: 10,000)
2. Receivable Party: "Party H" (balance: -5,000)

#### Step 3: Try Excessive Amount
1. Settlement Amount: **10000**
2. Maximum shown: "Maximum: Rs. 5,000.00"

#### Step 4: Submit
1. Click **Create Settlement**

### Expected Results

#### Error Message
- Error appears: **"Settlement amount cannot exceed 5,000.00"**
- Form not submitted

#### No Changes
- Balances unchanged
- No settlement created

---

## Test Scenario 5: Validation - Same Party

### Objective
Test that system rejects settlement when same party selected for both sides.

### Steps

#### Step 1: Create Settlement
1. Go to Party Settlement
2. Click **Create Settlement**

#### Step 2: Select Same Party
1. Payable Party: "Test Payable Party"
2. Receivable Party: "Test Payable Party" (same)
3. Settlement Amount: 5000

#### Step 3: Submit
1. Click **Create Settlement**

### Expected Results

#### Error Message
- Error appears: **"Payable party and receivable party must be different"**
- Form not submitted

#### No Changes
- No settlement created

---

## Test Scenario 6: Validation - No Payable Balance

### Objective
Test that system rejects when payable party has no payable balance.

### Setup
Create party:
- Party I (Receivable): -5,000 (negative = receivable, not payable)

### Steps

#### Step 1: Create Settlement
1. Go to Party Settlement
2. Click **Create Settlement**

#### Step 2: Select Parties
1. Payable Party: "Party I" (balance: -5,000)
2. Receivable Party: "Test Receivable Party"
3. Settlement Amount: 1000

#### Step 3: Submit
1. Click **Create Settlement**

### Expected Results

#### Error Message
- Error appears: **"Payable party \"Party I\" has no outstanding payable balance (current: -5000)"**
- Form not submitted

---

## Test Scenario 7: Validation - No Receivable Balance

### Objective
Test that system rejects when receivable party has no receivable balance.

### Setup
Create party:
- Party J (Payable): +5,000 (positive = payable, not receivable)

### Steps

#### Step 1: Create Settlement
1. Go to Party Settlement
2. Click **Create Settlement**

#### Step 2: Select Parties
1. Payable Party: "Test Payable Party"
2. Receivable Party: "Party J" (balance: +5,000)
3. Settlement Amount: 1000

#### Step 3: Submit
1. Click **Create Settlement**

### Expected Results

#### Error Message
- Error appears: **"Receivable party \"Party J\" has no outstanding receivable balance (current: 5000)"**
- Form not submitted

---

## Test Scenario 8: Reversal

### Objective
Test that settlement can be reversed and balances restored.

### Setup
Use settlement from Scenario 1:
- Party A: 0 (was +10,000)
- Party B: 0 (was -10,000)

### Steps

#### Step 1: View Settlement History
1. Go to Party Settlement page
2. Look at Settlement History table
3. Find the settlement you created
4. You should see a **Reverse** button or action menu

#### Step 2: Click Reverse
1. Click **Reverse** button on the settlement
2. A dialog or confirmation should appear
3. Enter reversal reason: **"Test reversal"**

#### Step 3: Confirm Reversal
1. Click **Confirm** or **Reverse** button
2. Wait for response

### Expected Results

#### Settlement Updated
- Settlement status changes to **"reversed"**
- Reversal reason displayed: "Test reversal"
- Reversal date/time shown

#### Balances Restored
Navigate to **Parties** list:
- Party A balance: **+10,000** (restored from 0)
- Party B balance: **-10,000** (restored from 0)

#### Settlement History
- Settlement still visible in history
- Status shows: **"reversed"**
- Cannot reverse again (button disabled)

---

## Test Scenario 9: Settlement History

### Objective
Test that settlement history displays correctly.

### Steps

#### Step 1: Create Multiple Settlements
1. Create 2-3 settlements with different parties
2. Use different amounts and dates

#### Step 2: View Settlement History
1. Go to Party Settlement page
2. Look at Settlement History section
3. You should see all settlements listed

#### Step 3: Verify Display
Check each settlement shows:
- [ ] Payable Party name
- [ ] Receivable Party name
- [ ] Settlement amount
- [ ] Settlement date
- [ ] Status (active/reversed)
- [ ] Reference (if provided)

#### Step 4: Check Ordering
- Settlements should be ordered by date (newest first)
- Most recent settlement at top

#### Step 5: Check Actions
- Each settlement should have action buttons
- Reverse button available for active settlements
- Reverse button disabled for reversed settlements

---

## Test Scenario 10: Summary Cards

### Objective
Test that summary cards display correct totals.

### Steps

#### Step 1: View Summary Cards
1. Go to Party Settlement page
2. Look at top section with 3 cards:
   - Total Payable
   - Total Receivable
   - Net Position

#### Step 2: Verify Payable Card
- Shows total of all positive party balances
- Shows count of payable parties
- Example: "Rs. 15,000.00" with "2 parties"

#### Step 3: Verify Receivable Card
- Shows total of all negative party balances (absolute value)
- Shows count of receivable parties
- Example: "Rs. 10,000.00" with "1 party"

#### Step 4: Verify Net Position Card
- Shows: Payable - Receivable
- Example: "Rs. 5,000.00"
- This is the net amount we owe

#### Step 5: Create Settlement and Refresh
1. Create a settlement
2. Refresh the page (F5)
3. Summary cards should update
4. Totals should decrease

---

## Browser Developer Tools Testing

### Check Network Requests

#### Step 1: Open Developer Tools
1. Press **F12** or **Ctrl+Shift+I**
2. Go to **Network** tab

#### Step 2: Create Settlement
1. Fill form and submit
2. Watch Network tab

#### Step 3: Verify Request
- Request URL: `POST /parties/settlements`
- Status: **201** or **200** (success)
- Request body shows your data
- Response shows settlement with ID

#### Step 4: Check Response
```json
{
  "success": true,
  "message": "Party settlement created successfully",
  "data": {
    "id": "settlement-uuid",
    "payablePartyId": "party-a-id",
    "receivablePartyId": "party-b-id",
    "settlementAmount": "10000.00",
    "settlementDate": "2026-07-12",
    "status": "active"
  }
}
```

### Check Console for Errors

#### Step 1: Open Console
1. Press **F12**
2. Go to **Console** tab

#### Step 2: Create Settlement
1. Fill form and submit
2. Watch console for errors

#### Step 3: Expected
- No red errors
- May see info/debug logs
- Success message in console

### Check Application State

#### Step 1: Open Redux DevTools (if installed)
1. Look for Redux tab in DevTools
2. Or install Redux DevTools extension

#### Step 2: Create Settlement
1. Watch Redux actions
2. Should see:
   - `createPartySettlement/pending`
   - `createPartySettlement/fulfilled`

#### Step 3: Check State
- Party balances updated
- Settlement added to state
- UI reflects changes

---

## Manual Balance Verification

### Verify Payable Party Balance

#### Step 1: Navigate to Party Detail
1. Go to Parties list
2. Click on payable party
3. View party details

#### Step 2: Check Balance
- Current balance should be reduced
- Example: Was +10,000, now +0

#### Step 3: View Statement
1. Click **View Statement** or **Ledger**
2. Look for settlement entries
3. Should see:
   - Credit entry for settlement amount
   - Entry date matches settlement date
   - Source type: "party_adjustment"

### Verify Receivable Party Balance

#### Step 1: Navigate to Party Detail
1. Go to Parties list
2. Click on receivable party
3. View party details

#### Step 2: Check Balance
- Current balance should be reduced (less negative)
- Example: Was -10,000, now -0

#### Step 3: View Statement
1. Click **View Statement** or **Ledger**
2. Look for settlement entries
3. Should see:
   - Debit entry for settlement amount
   - Entry date matches settlement date
   - Source type: "party_adjustment"

---

## Troubleshooting UI Issues

### Issue: Settlement Dialog Won't Open

**Solution:**
1. Refresh page (F5)
2. Check browser console for errors
3. Verify you're logged in
4. Check department access

### Issue: Parties Not Showing in Dropdown

**Solution:**
1. Refresh page
2. Verify parties exist in database
3. Check parties are linked to department
4. Check parties are not deleted

### Issue: Settlement Amount Won't Accept Input

**Solution:**
1. Clear field and try again
2. Use numeric value only
3. Max 2 decimal places
4. Must be > 0

### Issue: Error Message Appears

**Solution:**
1. Read error message carefully
2. Check party balances
3. Verify settlement amount
4. Check parties are different
5. Verify payable has positive balance
6. Verify receivable has negative balance

### Issue: Balances Not Updating After Settlement

**Solution:**
1. Refresh page (F5)
2. Check browser cache (Ctrl+Shift+Delete)
3. Check backend logs for errors
4. Verify settlement was created (check history)

### Issue: Reversal Button Not Working

**Solution:**
1. Refresh page
2. Check settlement status is "active"
3. Verify you have permission
4. Check backend logs

---

## Quick Test Checklist

Use this checklist to verify all functionality:

### Basic Settlement
- [ ] Create settlement with full amount
- [ ] Both balances reduce to zero
- [ ] Settlement appears in history
- [ ] Status shows "active"

### Partial Settlement
- [ ] Create settlement with partial amount
- [ ] Payable balance reduced by amount
- [ ] Receivable balance reduced by amount
- [ ] Both move toward zero

### Validation
- [ ] Reject insufficient payable balance
- [ ] Reject insufficient receivable balance
- [ ] Reject same party
- [ ] Reject no payable balance
- [ ] Reject no receivable balance
- [ ] Show max settlement amount

### Reversal
- [ ] Reverse settlement
- [ ] Balances restored
- [ ] Status changes to "reversed"
- [ ] Cannot reverse twice

### UI Elements
- [ ] Summary cards display correctly
- [ ] Settlement history shows all entries
- [ ] Dropdowns populate with parties
- [ ] Balance display shows current values
- [ ] Date picker works
- [ ] Reference field accepts input
- [ ] Notes field accepts input

### Error Handling
- [ ] Error messages clear and helpful
- [ ] Form stays open on error
- [ ] No partial updates on error
- [ ] Can retry after error

### Performance
- [ ] Settlement creates quickly (< 2 seconds)
- [ ] History loads quickly
- [ ] No lag when selecting parties
- [ ] Smooth UI interactions

---

## Tips for Effective Testing

1. **Use Browser DevTools**
   - Monitor network requests
   - Check console for errors
   - Verify response data

2. **Test Edge Cases**
   - Exact maximum amounts
   - Zero amounts (should fail)
   - Very large amounts
   - Decimal amounts

3. **Test Multiple Times**
   - Create multiple settlements
   - Test with different parties
   - Test reversals
   - Test history

4. **Verify Data Persistence**
   - Refresh page after settlement
   - Close and reopen browser
   - Check data still there

5. **Test Error Recovery**
   - Try invalid input
   - Fix and retry
   - Verify form still works

6. **Document Issues**
   - Take screenshots
   - Note exact steps
   - Record error messages
   - Check browser/backend logs

---

## Success Criteria

All tests pass when:

✅ Settlements create successfully
✅ Balances update correctly
✅ Validation rules enforced
✅ Reversals work properly
✅ History displays accurately
✅ UI is responsive
✅ No console errors
✅ Network requests succeed
✅ Error messages are clear
✅ Data persists after refresh

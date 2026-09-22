# Step-by-Step Testing Instructions

## Quick Start Testing (5 minutes)

### Test 1: Edit Form Shows Saved Data
1. Go to **Brokerage > Purchases**
2. Click **Edit** on any record
3. **Verify**: All fields show the saved data (not empty)
4. Click **Cancel**

### Test 2: Date Bug is Fixed
1. Click **Record purchase**
2. Select date: **2/7/2026**
3. Fill other fields and click **Save**
4. **Verify**: Table shows **2/7/2026** (not 1/7/2026)

### Test 3: Date Filter with Totals
1. Click the date input above the table
2. Select a date
3. **Verify**: Three total boxes appear
4. **Verify**: Table shows only records from that date

---

## Detailed Testing (15 minutes)

### Test Suite 1: Edit Functionality

#### Test 1.1: Edit Button Visibility
**Steps**:
1. Navigate to Brokerage > Purchases
2. Look at the Actions column

**Expected**:
- [ ] Edit button is visible
- [ ] Edit button is between Print and Delete buttons
- [ ] Edit button is clickable

**Result**: ✅ PASS / ❌ FAIL

---

#### Test 1.2: Form Pre-population
**Steps**:
1. Click Edit on a record with these values:
   - Quantity: 1000 kg
   - Rate: 255
   - Date: 5/7/2026
   - Description: "Test note"

**Expected**:
- [ ] Quantity field shows: 1000.000
- [ ] Rate field shows: 255.00
- [ ] Date field shows: 5/7/2026
- [ ] Description field shows: "Test note"
- [ ] All other fields are pre-filled

**Result**: ✅ PASS / ❌ FAIL

---

#### Test 1.3: Edit Single Field
**Steps**:
1. Open edit form
2. Change ONLY the quantity (e.g., 1000 → 2000)
3. Leave all other fields unchanged
4. Click Update

**Expected**:
- [ ] Form validates
- [ ] Success notification appears
- [ ] Table shows new quantity: 2000
- [ ] All other fields remain unchanged
- [ ] Date remains: 5/7/2026

**Result**: ✅ PASS / ❌ FAIL

---

#### Test 1.4: Edit Multiple Fields
**Steps**:
1. Open edit form
2. Change quantity: 1000 → 1500
3. Change rate: 255 → 260
4. Change description: "Test" → "Updated"
5. Click Update

**Expected**:
- [ ] All changes are saved
- [ ] Table shows new quantity: 1500
- [ ] Table shows new rate: 260
- [ ] Description is updated
- [ ] Success notification appears

**Result**: ✅ PASS / ❌ FAIL

---

#### Test 1.5: Cancel Edit
**Steps**:
1. Open edit form
2. Change quantity: 1000 → 5000
3. Click Cancel

**Expected**:
- [ ] Dialog closes
- [ ] Changes are NOT saved
- [ ] Table still shows original quantity: 1000

**Result**: ✅ PASS / ❌ FAIL

---

### Test Suite 2: Date Bug Fix

#### Test 2.1: Create with Specific Date
**Steps**:
1. Click "Record purchase"
2. Fill in:
   - Quantity: 1000
   - Rate: 255
   - Date: **2/7/2026** (select this specific date)
3. Click Save

**Expected**:
- [ ] Record is created
- [ ] Table DATE column shows: **2/7/2026**
- [ ] NOT 1/7/2026
- [ ] NOT 3/7/2026

**Result**: ✅ PASS / ❌ FAIL

---

#### Test 2.2: Edit and Change Date
**Steps**:
1. Find a record with date: 1/7/2026
2. Click Edit
3. Change date to: **15/7/2026**
4. Click Update

**Expected**:
- [ ] Record is updated
- [ ] Table DATE column shows: **15/7/2026**
- [ ] NOT 14/7/2026
- [ ] NOT 16/7/2026

**Result**: ✅ PASS / ❌ FAIL

---

#### Test 2.3: Multiple Records with Different Dates
**Steps**:
1. Create 3 records with these dates:
   - Record A: 5/7/2026
   - Record B: 10/7/2026
   - Record C: 20/7/2026
2. Verify each record in the table

**Expected**:
- [ ] Record A shows: 5/7/2026
- [ ] Record B shows: 10/7/2026
- [ ] Record C shows: 20/7/2026
- [ ] All dates are EXACTLY as selected

**Result**: ✅ PASS / ❌ FAIL

---

### Test Suite 3: Date Filter with Totals

#### Test 3.1: Date Filter Input
**Steps**:
1. Navigate to Brokerage > Purchases
2. Look above the table

**Expected**:
- [ ] Date input field is visible
- [ ] Placeholder says "Filter by date"
- [ ] "Clear filter" button is NOT visible

**Result**: ✅ PASS / ❌ FAIL

---

#### Test 3.2: Select Date and See Totals
**Steps**:
1. Click date input
2. Select a date (e.g., 5/7/2026)
3. Observe the page

**Expected**:
- [ ] Three boxes appear above table:
  - Box 1: "TOTAL PAYABLE" with amount
  - Box 2: "PAID" with amount
  - Box 3: "OUTSTANDING" with amount
- [ ] All amounts are in PKR format (Rs X,XXX)
- [ ] "Clear filter" button appears

**Result**: ✅ PASS / ❌ FAIL

---

#### Test 3.3: Verify Totals Calculation
**Steps**:
1. Create 2 records for date 5/7/2026:
   - Record A: Total 100,000, Paid 50,000, Outstanding 50,000
   - Record B: Total 200,000, Paid 100,000, Outstanding 100,000
2. Filter by date 5/7/2026
3. Check the totals boxes

**Expected**:
- [ ] TOTAL PAYABLE = 300,000 (100,000 + 200,000)
- [ ] PAID = 150,000 (50,000 + 100,000)
- [ ] OUTSTANDING = 150,000 (50,000 + 100,000)

**Result**: ✅ PASS / ❌ FAIL

---

#### Test 3.4: Table Filters by Date
**Steps**:
1. Create 3 records with different dates
2. Filter by one specific date
3. Observe the table

**Expected**:
- [ ] Table shows ONLY records from selected date
- [ ] Records from other dates are hidden
- [ ] Number of rows = number of records for that date

**Result**: ✅ PASS / ❌ FAIL

---

#### Test 3.5: Clear Filter
**Steps**:
1. Select a date (filter is active)
2. Click "Clear filter" button

**Expected**:
- [ ] Filter is removed
- [ ] All records are shown again
- [ ] Totals boxes disappear
- [ ] "Clear filter" button disappears

**Result**: ✅ PASS / ❌ FAIL

---

#### Test 3.6: Filter on Sales Page
**Steps**:
1. Navigate to Brokerage > Sales
2. Select a date

**Expected**:
- [ ] Filter works the same way
- [ ] Boxes show "TOTAL RECEIVABLE", "RECEIVED", "OUTSTANDING"
- [ ] Totals are calculated correctly

**Result**: ✅ PASS / ❌ FAIL

---

## Comprehensive Workflow Test (10 minutes)

### Complete Scenario

**Setup**: Create 3 records with different dates

**Step 1: Create Records**
```
Record 1: Date 5/7/2026, Qty 1000, Rate 255
Record 2: Date 5/7/2026, Qty 500, Rate 250
Record 3: Date 10/7/2026, Qty 2000, Rate 260
```

**Step 2: Edit Record 1**
- Click Edit on Record 1
- Verify all fields are pre-filled
- Change quantity to 1500
- Change date to 15/7/2026
- Click Update
- Verify success notification

**Step 3: Filter by 5/7/2026**
- Select date 5/7/2026
- Verify totals boxes appear
- Verify only Record 2 is shown (Record 1 was moved to 15/7/2026)
- Verify totals are correct for Record 2 only

**Step 4: Filter by 15/7/2026**
- Select date 15/7/2026
- Verify Record 1 is shown with updated quantity (1500)
- Verify totals are correct

**Step 5: Clear Filter**
- Click "Clear filter"
- Verify all 3 records are shown
- Verify totals boxes disappear

**Expected**: All steps complete successfully

**Result**: ✅ PASS / ❌ FAIL

---

## Permission Testing

### Test as Owner
**Steps**:
1. Login as Owner
2. Go to Brokerage > Purchases
3. Check for Edit button

**Expected**:
- [ ] Edit button is visible
- [ ] Can click Edit
- [ ] Can update records

**Result**: ✅ PASS / ❌ FAIL

---

### Test as Accountant
**Steps**:
1. Login as Accountant
2. Go to Brokerage > Purchases
3. Check for Edit button

**Expected**:
- [ ] Edit button is visible
- [ ] Can click Edit
- [ ] Can update records

**Result**: ✅ PASS / ❌ FAIL

---

### Test as Department Staff
**Steps**:
1. Login as Department Staff
2. Go to Brokerage > Purchases
3. Check for Edit button

**Expected**:
- [ ] Edit button is NOT visible
- [ ] Can still use date filter
- [ ] Can create records
- [ ] Can delete records

**Result**: ✅ PASS / ❌ FAIL

---

## Error Handling Tests

### Test Invalid Input
**Steps**:
1. Open edit form
2. Try to enter negative quantity
3. Try to submit

**Expected**:
- [ ] Form shows error message
- [ ] Cannot submit with invalid data

**Result**: ✅ PASS / ❌ FAIL

---

### Test Network Error
**Steps**:
1. Open browser dev tools
2. Simulate offline mode
3. Try to edit a record

**Expected**:
- [ ] Error notification appears
- [ ] User-friendly error message shown
- [ ] Can retry

**Result**: ✅ PASS / ❌ FAIL

---

## Final Sign-Off

### Overall Test Results

| Test Suite | Status | Notes |
|-----------|--------|-------|
| Edit Functionality | ✅ / ❌ | |
| Date Bug Fix | ✅ / ❌ | |
| Date Filter | ✅ / ❌ | |
| Permissions | ✅ / ❌ | |
| Error Handling | ✅ / ❌ | |
| Workflow | ✅ / ❌ | |

### Issues Found

```
Issue #1:
Description:
Steps to Reproduce:
Expected:
Actual:
Severity: Critical / High / Medium / Low

Issue #2:
Description:
Steps to Reproduce:
Expected:
Actual:
Severity: Critical / High / Medium / Low
```

### Sign-Off

**Tester Name**: _______________
**Date**: _______________
**Status**: ✅ READY FOR PRODUCTION / ❌ ISSUES FOUND

**Signature**: _______________

---

## Quick Reference

### Edit Button
- Location: Actions column
- Visible for: Owner, Accountant
- Opens: Same form as create
- Pre-fills: All saved data

### Date Bug
- Fixed: Yes ✅
- Verification: Create with 2/7/2026 → shows 2/7/2026

### Date Filter
- Location: Above table
- Shows: 3 total boxes
- Filters: By selected date
- Clear: "Clear filter" button

---

**All tests should be completed before production deployment!**

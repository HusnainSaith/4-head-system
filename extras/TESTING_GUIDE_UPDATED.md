# Testing Guide - Brokerage Fixes (Updated)

## Overview
Three critical issues have been fixed:
1. ✅ Edit button with shared form (reuses create form)
2. ✅ Date bug fix (correct date is now saved)
3. ✅ Date filter with totals display

---

## Issue 1: Edit Button with Shared Form

### What Changed
- Added "Edit" button in Actions column
- Clicking Edit opens the same form used for creating records
- Form pre-populates with existing data
- Clicking "Update" saves changes

### Test Steps

#### Test 1.1: Edit Button Visibility
1. Navigate to **Brokerage > Purchases** or **Brokerage > Sales**
2. Look at the **Actions** column

**Expected Results**:
- [ ] Edit button appears for Owner/Accountant roles
- [ ] Edit button does NOT appear for other roles
- [ ] Edit button is between Print and Delete buttons

#### Test 1.2: Open Edit Form
1. Click the **Edit** button on any record
2. Observe the dialog

**Expected Results**:
- [ ] Dialog title shows "Edit purchase" or "Edit sale"
- [ ] Dialog description says "Update this purchase/sale record"
- [ ] All fields are pre-filled with current values:
  - [ ] Quantity shows current quantity
  - [ ] Rate shows current rate
  - [ ] Payment amount shows current payment
  - [ ] Date shows current date
  - [ ] Description shows current description
  - [ ] Party is pre-selected
  - [ ] Payment method is pre-selected

#### Test 1.3: Edit and Save
1. Open edit form for a record
2. Change the quantity (e.g., from 1000 to 2000)
3. Change the rate (e.g., from 255 to 260)
4. Click **Update** button

**Expected Results**:
- [ ] Form validates input
- [ ] Update button shows loading state
- [ ] Success notification appears: "Purchase/Sale updated"
- [ ] Dialog closes
- [ ] Table refreshes with new values
- [ ] Changes persist after page refresh

#### Test 1.4: Edit with Different Fields
1. Open edit form
2. Change only the description (leave other fields same)
3. Click Update

**Expected Results**:
- [ ] Only description is updated
- [ ] Other fields remain unchanged
- [ ] Success notification appears

#### Test 1.5: Cancel Edit
1. Open edit form
2. Make changes
3. Click **Cancel** button

**Expected Results**:
- [ ] Dialog closes without saving
- [ ] Changes are discarded
- [ ] Table shows original values

---

## Issue 2: Date Bug Fix

### What Changed
- Fixed bug where selected date was not being saved correctly
- Previously: Selected 2/7/2026 but saved 1/7/2026
- Now: Selected date is saved correctly

### Test Steps

#### Test 2.1: Create with Specific Date
1. Click **Record purchase** or **Record sale**
2. Fill in all required fields
3. In the **Date** field, select **2/7/2026** (or any specific date)
4. Click **Save**

**Expected Results**:
- [ ] Record is created
- [ ] In the table, the DATE column shows **2/7/2026** (the date you selected)
- [ ] NOT 1/7/2026 or any other date

#### Test 2.2: Edit and Change Date
1. Find a record with date **1/7/2026**
2. Click **Edit**
3. Change the date to **15/7/2026**
4. Click **Update**

**Expected Results**:
- [ ] Record is updated
- [ ] In the table, the DATE column shows **15/7/2026**
- [ ] NOT 14/7/2026 or any other date

#### Test 2.3: Multiple Records with Different Dates
1. Create 3 records with different dates:
   - Record 1: 5/7/2026
   - Record 2: 10/7/2026
   - Record 3: 20/7/2026
2. Verify each record shows the correct date in the table

**Expected Results**:
- [ ] Record 1 shows 5/7/2026
- [ ] Record 2 shows 10/7/2026
- [ ] Record 3 shows 20/7/2026
- [ ] All dates are exactly as selected

#### Test 2.4: Date Format Verification
1. Create a record with date **2/7/2026**
2. Check the database or API response

**Expected Results**:
- [ ] Date is stored as **2026-07-02** (ISO format)
- [ ] Date displays as **2026-07-02** in the table
- [ ] No off-by-one day error

---

## Issue 3: Date Filter with Totals Display

### What Changed
- Added date filter input above the table
- When a date is selected, three total boxes appear showing:
  - Total Payable/Receivable (total amount for that day)
  - Paid/Received (amount settled for that day)
  - Outstanding (amount still owed/to receive for that day)

### Test Steps

#### Test 3.1: Date Filter Input
1. Navigate to **Brokerage > Purchases** or **Brokerage > Sales**
2. Look above the table

**Expected Results**:
- [ ] Date input field is visible
- [ ] "Clear filter" button is NOT visible (no filter active)
- [ ] Placeholder text says "Filter by date"

#### Test 3.2: Select Date and See Totals
1. Click the date input field
2. Select a date (e.g., 2/7/2026)
3. Observe the page

**Expected Results**:
- [ ] Date picker opens
- [ ] Can select a date
- [ ] After selecting, three boxes appear above the table:
  - [ ] Box 1: "TOTAL PAYABLE" (for purchases) or "TOTAL RECEIVABLE" (for sales)
  - [ ] Box 2: "PAID" (for purchases) or "RECEIVED" (for sales)
  - [ ] Box 3: "OUTSTANDING"
- [ ] Each box shows the correct amount in PKR format
- [ ] "Clear filter" button appears

#### Test 3.3: Verify Totals Calculation
1. Select a date that has 2 records:
   - Record A: Total 100,000, Paid 50,000, Outstanding 50,000
   - Record B: Total 200,000, Paid 100,000, Outstanding 100,000
2. Check the totals boxes

**Expected Results**:
- [ ] Total Payable = 300,000 (100,000 + 200,000)
- [ ] Paid = 150,000 (50,000 + 100,000)
- [ ] Outstanding = 150,000 (50,000 + 100,000)

#### Test 3.4: Table Filters by Date
1. Select a date in the filter
2. Observe the table

**Expected Results**:
- [ ] Table shows ONLY records from the selected date
- [ ] Records from other dates are hidden
- [ ] Number of rows matches the number of records for that date

#### Test 3.5: Clear Filter
1. Select a date (filter is active)
2. Click **Clear filter** button

**Expected Results**:
- [ ] Filter is removed
- [ ] All records are shown again
- [ ] Totals boxes disappear
- [ ] "Clear filter" button disappears

#### Test 3.6: Filter on Sales Page
1. Navigate to **Brokerage > Sales**
2. Select a date

**Expected Results**:
- [ ] Filter works the same way
- [ ] Boxes show "TOTAL RECEIVABLE", "RECEIVED", "OUTSTANDING"
- [ ] Totals are calculated correctly for sales

#### Test 3.7: Filter on Purchases Page
1. Navigate to **Brokerage > Purchases**
2. Select a date

**Expected Results**:
- [ ] Filter works the same way
- [ ] Boxes show "TOTAL PAYABLE", "PAID", "OUTSTANDING"
- [ ] Totals are calculated correctly for purchases

#### Test 3.8: Empty Date (No Records)
1. Select a date that has NO records
2. Observe the page

**Expected Results**:
- [ ] Totals boxes show 0 or Rs 0
- [ ] Table shows "No purchases recorded" or "No sales recorded"
- [ ] No errors in console

---

## Combined Workflow Test

### Scenario: Complete Edit and Filter Workflow

1. **Create a record**
   - Click "Record purchase"
   - Select date: 2/7/2026
   - Enter quantity: 1000 kg
   - Enter rate: 255
   - Click Save
   - Verify record appears with date 2/7/2026

2. **Edit the record**
   - Click Edit on the new record
   - Change quantity to 1500 kg
   - Change date to 5/7/2026
   - Click Update
   - Verify record now shows 1500 kg and date 5/7/2026

3. **Filter by original date**
   - Select date: 2/7/2026
   - Verify record is NOT shown (date was changed)
   - Verify totals boxes show 0

4. **Filter by new date**
   - Select date: 5/7/2026
   - Verify record IS shown
   - Verify totals boxes show correct amounts

5. **Clear filter**
   - Click "Clear filter"
   - Verify all records are shown again

---

## Regression Testing

### Existing Features Still Work
- [ ] Create new records (without edit)
- [ ] Delete records
- [ ] Print/Invoice functionality
- [ ] Party selection (farms, customers, brokers)
- [ ] Payment method selection
- [ ] Vehicle selection
- [ ] Department balances panel
- [ ] Form validation
- [ ] Error handling

---

## Permission Testing

### Owner Role
- [ ] Can see Edit button
- [ ] Can edit records
- [ ] Can use date filter
- [ ] Can create records
- [ ] Can delete records

### Accountant Role
- [ ] Can see Edit button
- [ ] Can edit records
- [ ] Can use date filter
- [ ] Can create records
- [ ] Can delete records

### Department Staff Role
- [ ] Cannot see Edit button
- [ ] Can use date filter
- [ ] Can create records
- [ ] Can delete records

### Other Roles
- [ ] Cannot see Edit button
- [ ] Can use date filter
- [ ] Cannot create records
- [ ] Cannot delete records

---

## Browser Testing

Test on:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

**Expected Results**:
- [ ] All features work on all browsers
- [ ] Date picker works correctly
- [ ] No console errors
- [ ] UI renders correctly

---

## Performance Testing

1. **Create with many records**
   - Create 50+ records with different dates
   - Filter by a date with many records (20+)

**Expected Results**:
- [ ] Filter applies quickly (< 1 second)
- [ ] Totals calculate quickly
- [ ] No UI lag
- [ ] Table renders smoothly

---

## Error Handling

### Test Invalid Input
1. Open edit form
2. Try to enter:
   - Negative quantity
   - Zero quantity
   - Negative rate
   - Zero rate

**Expected Results**:
- [ ] Form shows error message
- [ ] Cannot submit with invalid data

### Test API Errors
1. Simulate network error (use browser dev tools)
2. Try to edit a record

**Expected Results**:
- [ ] Error notification appears
- [ ] User-friendly error message shown
- [ ] Can retry the action

---

## Sign-Off Checklist

| Test | Status | Notes |
|------|--------|-------|
| Edit button visibility | [ ] | |
| Edit form pre-population | [ ] | |
| Edit and save | [ ] | |
| Date bug fix | [ ] | |
| Date filter | [ ] | |
| Totals calculation | [ ] | |
| Clear filter | [ ] | |
| Permissions | [ ] | |
| Regression tests | [ ] | |
| Browser compatibility | [ ] | |
| Performance | [ ] | |
| Error handling | [ ] | |

---

## Known Issues / Notes

(Document any issues found during testing)

```
Issue #1:
Description:
Steps to Reproduce:
Expected:
Actual:
Severity:

Issue #2:
Description:
Steps to Reproduce:
Expected:
Actual:
Severity:
```

---

## Final Verification

Before deploying to production:
- [ ] All tests passed
- [ ] No console errors
- [ ] No API errors
- [ ] Date bug is fixed
- [ ] Edit functionality works
- [ ] Filter with totals works
- [ ] All permissions verified
- [ ] Performance acceptable

---

**Testing Completed**: _______________
**Tester Name**: _______________
**Date**: _______________
**Status**: ✅ READY FOR PRODUCTION / ❌ ISSUES FOUND

# Testing Guide - Brokerage Department Fixes

## Prerequisites
- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:5173`
- Logged in as Owner or Accountant role

---

## Test 1: Broker Support in Party Selection

### Steps
1. Navigate to **Brokerage > Purchases** or **Brokerage > Sales**
2. Click **"Record purchase"** or **"Record sale"** button
3. Look at the party dropdown field

### Expected Results
- **For Purchases**: Dropdown shows "Seller (Farm or Broker)" label
  - Should list all farms AND all brokers
  - Can select any broker from the list
  
- **For Sales**: Dropdown shows "Buyer (Customer or Broker)" label
  - Should list all customers AND all brokers
  - Can select any broker from the list

### Verification
- [ ] Brokers appear in the dropdown
- [ ] No duplicate entries
- [ ] Can select a broker
- [ ] Form submits successfully with broker selected
- [ ] Record is created with broker as party

---

## Test 2: Edit Button for Admin

### Steps
1. Navigate to **Brokerage > Purchases** or **Brokerage > Sales**
2. Look at the **Actions** column in the table

### Expected Results
- **For Owner/Accountant roles**:
  - Should see three buttons: Print, Edit, Delete
  - Edit button is visible and clickable
  
- **For other roles**:
  - Edit button should NOT appear
  - Only Print and Delete buttons visible

### Edit Dialog Testing
1. Click the **Edit** button on any record
2. An edit dialog should open with the title "Edit purchase" or "Edit sale"
3. The dialog should have fields for:
   - Quantity (kg)
   - Rate per kg
   - Amount paid/received
   - Description

### Edit Functionality
1. Change the quantity value
2. Change the rate value
3. Optionally change payment amount or description
4. Click **Update** button

### Expected Results
- [ ] Edit button appears for Owner/Accountant
- [ ] Edit button hidden for other roles
- [ ] Edit dialog opens correctly
- [ ] All fields are editable
- [ ] Form validates input (positive numbers only)
- [ ] Update button saves changes
- [ ] Success notification appears: "Purchase/Sale updated successfully"
- [ ] Table refreshes with updated values
- [ ] Changes persist after page refresh

---

## Test 3: Date Filter

### Steps
1. Navigate to **Brokerage > Purchases** or **Brokerage > Sales**
2. Look above the data table for a date input field

### Expected Results
- Should see a date input field with label "Filter by date"
- Should see a "Clear filter" button (only visible when filter is active)

### Filter Testing
1. Click on the date input field
2. Select a date from the date picker
3. Observe the table

### Expected Results
- [ ] Date picker opens
- [ ] Can select a date
- [ ] Table immediately filters to show only records from that date
- [ ] "Clear filter" button appears
- [ ] Total records shown matches the filtered date
- [ ] Can see total purchase/sale amount for that day

### Clear Filter Testing
1. Click the **"Clear filter"** button
2. Observe the table

### Expected Results
- [ ] All records reappear
- [ ] "Clear filter" button disappears
- [ ] Table shows all records again

### Multi-Page Testing
1. Test filter on **Purchases** page
2. Test filter on **Sales** page

### Expected Results
- [ ] Filter works on both pages
- [ ] Each page maintains its own filter state
- [ ] Switching between pages preserves filter

---

## Test 4: Combined Functionality

### Scenario: Complete Workflow
1. **Create a new purchase with a broker**
   - Click "Record purchase"
   - Select a broker from the dropdown
   - Enter quantity and rate
   - Submit

2. **Edit the purchase**
   - Find the newly created record
   - Click Edit
   - Change the quantity
   - Click Update
   - Verify changes

3. **Filter by date**
   - Select today's date in the filter
   - Verify the edited record appears
   - Verify the updated quantity is shown

### Expected Results
- [ ] All three features work together seamlessly
- [ ] No errors in browser console
- [ ] No errors in backend logs
- [ ] Data consistency maintained

---

## Test 5: Error Handling

### Test Invalid Input
1. Open edit dialog
2. Try to enter:
   - Negative quantity
   - Zero quantity
   - Negative rate
   - Zero rate

### Expected Results
- [ ] Form shows error message
- [ ] Cannot submit with invalid data
- [ ] Error messages are clear and helpful

### Test API Errors
1. Simulate network error (use browser dev tools)
2. Try to edit a record
3. Try to create a record with broker

### Expected Results
- [ ] Error notification appears
- [ ] User-friendly error message shown
- [ ] Can retry the action

---

## Test 6: Permissions Testing

### Test as Different Roles

#### Owner Role
- [ ] Can see Edit button
- [ ] Can edit records
- [ ] Can use date filter

#### Accountant Role
- [ ] Can see Edit button
- [ ] Can edit records
- [ ] Can use date filter

#### Department Staff Role
- [ ] Cannot see Edit button
- [ ] Can create records
- [ ] Can delete records
- [ ] Can use date filter

#### Other Roles
- [ ] Cannot see Edit button
- [ ] Cannot create records
- [ ] Cannot delete records
- [ ] Can view records
- [ ] Can use date filter

---

## Test 7: Performance Testing

### Large Dataset
1. Filter by a date with many records (100+)
2. Observe performance

### Expected Results
- [ ] Filter applies quickly (< 1 second)
- [ ] No UI lag
- [ ] Table renders smoothly
- [ ] Scrolling is smooth

---

## Regression Testing

### Existing Features
- [ ] Delete functionality still works
- [ ] Print/Invoice functionality still works
- [ ] Create new records still works
- [ ] Party selection for non-broker parties still works
- [ ] Payment method selection still works
- [ ] Vehicle selection still works
- [ ] Department balances panel still displays correctly

---

## Browser Compatibility

Test on:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Expected Results
- [ ] All features work on all browsers
- [ ] No console errors
- [ ] UI renders correctly
- [ ] Date picker works on all browsers

---

## Mobile Testing (Optional)

- [ ] Date filter input is usable on mobile
- [ ] Edit button is clickable on mobile
- [ ] Edit dialog is readable on mobile
- [ ] Form is usable on mobile

---

## Sign-Off

| Feature | Status | Tester | Date |
|---------|--------|--------|------|
| Broker Support | [ ] Pass | _____ | _____ |
| Edit Button | [ ] Pass | _____ | _____ |
| Date Filter | [ ] Pass | _____ | _____ |
| Combined Workflow | [ ] Pass | _____ | _____ |
| Error Handling | [ ] Pass | _____ | _____ |
| Permissions | [ ] Pass | _____ | _____ |
| Performance | [ ] Pass | _____ | _____ |
| Regression | [ ] Pass | _____ | _____ |

---

## Notes

Use this section to document any issues found during testing:

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

## Deployment Checklist

Before deploying to production:
- [ ] All tests passed
- [ ] No console errors
- [ ] No backend errors
- [ ] Performance acceptable
- [ ] Permissions verified
- [ ] Regression tests passed
- [ ] Code review completed
- [ ] Documentation updated

# Party Settlement UI - Navigation & Visual Guide

## Application Navigation Map

```
Frontend (http://localhost:5173)
│
├── Login Page
│   └── Enter credentials
│       └── Dashboard
│
├── Main Navigation (Sidebar/Menu)
│   ├── Dashboard
│   ├── Parties
│   │   ├── Party List
│   │   ├── Create Party
│   │   └── Party Details
│   │
│   ├── Settlements (or Party Settlement)
│   │   ├── Settlement Dashboard
│   │   ├── Create Settlement Dialog
│   │   └── Settlement History
│   │
│   └── Other Modules
│       ├── Brokerage
│       ├── Supply
│       ├── Inventory
│       └── ...
```

## Finding Party Settlement in UI

### Method 1: Via Main Menu
1. Look for **Settlements** or **Party Settlement** in left sidebar
2. Click to navigate to settlement page
3. Should see:
   - Summary cards at top
   - Settlement history table below
   - Create Settlement button

### Method 2: Via Parties Module
1. Click **Parties** in main menu
2. Look for **Settlement** tab or link
3. Or click **Create Settlement** button if visible

### Method 3: Direct URL
- Navigate to: `http://localhost:5173/settlements`
- Or: `http://localhost:5173/parties/settlements`
- (Adjust based on your routing)

---

## Party Settlement Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Party Settlement                    [Create Settlement]    │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────┬──────────────────┐
│ Total Payable    │ Total Receivable │ Net Position     │
│ Rs. 25,000.00    │ Rs. 15,000.00    │ Rs. 10,000.00    │
│ 3 parties        │ 2 parties        │ Payable - Rec.   │
└──────────────────┴──────────────────┴──────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Settlement History                                          │
├─────────────────────────────────────────────────────────────┤
│ Payable Party | Receivable Party | Amount | Date | Status  │
├─────────────────────────────────────────────────────────────┤
│ Party A       | Party B          | 10,000 | ... | active   │
│ Party C       | Party D          | 5,000  | ... | reversed │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Create Settlement Dialog

### Dialog Layout

```
┌─────────────────────────────────────────────────────────┐
│ Party-to-Party Settlement                           [X] │
├─────────────────────────────────────────────────────────┤
│ Settle a payable party and receivable party against    │
│ each other without involving cash or bank accounts.    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Error Message - if any]                              │
│                                                         │
│ Payable Party (we owe them)                           │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Select payable party                        ▼   │   │
│ └─────────────────────────────────────────────────┘   │
│ Current balance: Rs. 10,000.00                        │
│                                                         │
│ Receivable Party (they owe us)                        │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Select receivable party                     ▼   │   │
│ └─────────────────────────────────────────────────┘   │
│ Current balance: Rs. -10,000.00                       │
│                                                         │
│ Settlement Amount                                      │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 10000                                           │   │
│ └─────────────────────────────────────────────────┘   │
│ Maximum: Rs. 10,000.00                                │
│                                                         │
│ Settlement Date                                        │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 2026-07-12                                      │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Reference (Optional)                                   │
│ ┌─────────────────────────────────────────────────┐   │
│ │ TEST-001                                        │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Notes (Optional)                                       │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Test settlement                                 │   │
│ │                                                 │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│                    [Cancel]  [Create Settlement]       │
└─────────────────────────────────────────────────────────┘
```

---

## Party List Page

### Where to See Party Balances

```
┌─────────────────────────────────────────────────────────┐
│ Parties                              [Create Party]     │
├─────────────────────────────────────────────────────────┤
│ Name              | Type      | Balance    | Actions    │
├─────────────────────────────────────────────────────────┤
│ Test Payable      | SUPPLIER  | +10,000.00 | [View]     │
│ Test Receivable   | CUSTOMER  | -10,000.00 | [View]     │
│ Party A           | SUPPLIER  | +5,000.00  | [View]     │
│ Party B           | CUSTOMER  | -3,000.00  | [View]     │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

### Balance Indicators
- **Positive (e.g., +10,000)** = Payable (we owe them)
- **Negative (e.g., -10,000)** = Receivable (they owe us)
- **Zero (0)** = Settled or no balance

---

## Party Detail Page

### Where to See Party Statement

```
┌─────────────────────────────────────────────────────────┐
│ Party: Test Payable Party                              │
├─────────────────────────────────────────────────────────┤
│ Type: SUPPLIER                                          │
│ Department: BROKERAGE                                   │
│ Current Balance: +10,000.00                             │
│                                                         │
│ [View Statement]  [View Settlements]  [Record Payment] │
├─────────────────────────────────────────────────────────┤
│ Ledger Statement                                        │
├─────────────────────────────────────────────────────────┤
│ Date       | Description        | Debit | Credit | Bal │
├─────────────────────────────────────────────────────────┤
│ 2026-07-01 | Opening balance    | 10000 |       | 10000│
│ 2026-07-12 | Settlement with... |       | 10000 | 0    │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

---

## Settlement History Table

### Columns Displayed

```
┌──────────────┬──────────────┬──────────┬────────┬──────────┬─────────┐
│ Payable      │ Receivable   │ Amount   │ Date   │ Status   │ Actions │
│ Party        │ Party        │          │        │          │         │
├──────────────┼──────────────┼──────────┼────────┼──────────┼─────────┤
│ Party A      │ Party B      │ 10,000   │ 07-12  │ active   │ Reverse │
│ Party C      │ Party D      │ 5,000    │ 07-11  │ reversed │ -       │
│ ...          │ ...          │ ...      │ ...    │ ...      │ ...     │
└──────────────┴──────────────┴──────────┴────────┴──────────┴─────────┘
```

### Status Indicators
- **active** = Settlement is current (can be reversed)
- **reversed** = Settlement was reversed (cannot reverse again)

---

## Dropdown Menus

### Payable Party Dropdown

```
┌─────────────────────────────────────────────────────┐
│ Select payable party                            ▼   │
└─────────────────────────────────────────────────────┘
  ▼
┌─────────────────────────────────────────────────────┐
│ Test Payable Party (Balance: 10,000.00)             │
│ Party A (Balance: 15,000.00)                        │
│ Party C (Balance: 5,000.00)                         │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

**Note:** Only shows parties with positive balance (payable)

### Receivable Party Dropdown

```
┌─────────────────────────────────────────────────────┐
│ Select receivable party                         ▼   │
└─────────────────────────────────────────────────────┘
  ▼
┌─────────────────────────────────────────────────────┐
│ Test Receivable Party (Balance: -10,000.00)         │
│ Party B (Balance: -3,000.00)                        │
│ Party D (Balance: -5,000.00)                        │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

**Note:** Only shows parties with negative balance (receivable)

---

## Error Messages & Locations

### Error Message Display

```
┌─────────────────────────────────────────────────────┐
│ Party-to-Party Settlement                       [X] │
├─────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────┐   │
│ │ ✗ Settlement amount cannot exceed 5,000.00   │   │
│ └───────────────────────────────────────────────┘   │
│                                                     │
│ [Form fields below...]                              │
│                                                     │
│                    [Cancel]  [Create Settlement]    │
└─────────────────────────────────────────────────────┘
```

### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Payable party and receivable party must be different" | Same party selected twice | Select different parties |
| "Payable party has no outstanding payable balance" | Payable party balance ≤ 0 | Select party with positive balance |
| "Receivable party has no outstanding receivable balance" | Receivable party balance ≥ 0 | Select party with negative balance |
| "Settlement amount exceeds maximum available" | Amount too high | Reduce amount to max shown |
| "Settlement amount must be greater than 0" | Amount is zero or negative | Enter positive amount |

---

## Success Messages & Notifications

### Settlement Created

```
┌─────────────────────────────────────────────────────┐
│ ✓ Party settlement created successfully             │
│   Settlement ID: abc123...                          │
└─────────────────────────────────────────────────────┘
```

### Settlement Reversed

```
┌─────────────────────────────────────────────────────┐
│ ✓ Party settlement reversed successfully            │
│   Balances have been restored                       │
└─────────────────────────────────────────────────────┘
```

---

## Browser Developer Tools Views

### Network Tab

```
POST /parties/settlements
Status: 201 Created
Headers:
  Content-Type: application/json
  Authorization: Bearer token...

Request Body:
{
  "payablePartyId": "uuid-1",
  "receivablePartyId": "uuid-2",
  "settlementAmount": 10000,
  "departmentId": "uuid-3",
  "settlementDate": "2026-07-12",
  "reference": "TEST-001",
  "notes": "Test settlement"
}

Response:
{
  "success": true,
  "message": "Party settlement created successfully",
  "data": {
    "id": "settlement-uuid",
    "payablePartyId": "uuid-1",
    "receivablePartyId": "uuid-2",
    "settlementAmount": "10000.00",
    "settlementDate": "2026-07-12",
    "status": "active",
    "createdAt": "2026-07-12T10:30:00Z"
  }
}
```

### Console Tab

```
✓ Settlement created successfully
  ID: settlement-uuid
  Amount: 10000
  Payable: Party A
  Receivable: Party B

✓ Balances updated
  Party A: 10000 → 0
  Party B: -10000 → 0

✓ Settlement history refreshed
```

---

## Step-by-Step Visual Walkthrough

### Step 1: Navigate to Settlement Page
```
Sidebar Menu
    ↓
Click "Settlements"
    ↓
Settlement Dashboard appears
```

### Step 2: Click Create Settlement
```
Settlement Dashboard
    ↓
Click [Create Settlement] button
    ↓
Dialog opens
```

### Step 3: Select Payable Party
```
Dialog opens
    ↓
Click Payable Party dropdown
    ↓
List of parties with positive balance appears
    ↓
Click "Test Payable Party"
    ↓
Balance shown: "Current balance: Rs. 10,000.00"
```

### Step 4: Select Receivable Party
```
Click Receivable Party dropdown
    ↓
List of parties with negative balance appears
    ↓
Click "Test Receivable Party"
    ↓
Balance shown: "Current balance: Rs. -10,000.00"
```

### Step 5: Enter Amount
```
Click Settlement Amount field
    ↓
Type: 10000
    ↓
Maximum shown: "Maximum: Rs. 10,000.00"
```

### Step 6: Submit
```
Click [Create Settlement] button
    ↓
Dialog closes
    ↓
Success message appears
    ↓
Settlement History updates
```

### Step 7: Verify Balances
```
Navigate to Parties list
    ↓
Party A balance: 0 (was +10,000)
    ↓
Party B balance: 0 (was -10,000)
```

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open DevTools | F12 or Ctrl+Shift+I |
| Refresh Page | F5 or Ctrl+R |
| Hard Refresh | Ctrl+Shift+R |
| Clear Cache | Ctrl+Shift+Delete |
| Open Console | F12 → Console tab |
| Open Network | F12 → Network tab |
| Search Page | Ctrl+F |

---

## Mobile/Responsive Testing

### On Mobile Browser
1. Open DevTools (F12)
2. Click Device Toolbar icon (Ctrl+Shift+M)
3. Select device (iPhone, iPad, etc.)
4. Test settlement creation
5. Verify form is responsive
6. Check buttons are clickable

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## Accessibility Testing

### Keyboard Navigation
1. Press Tab to navigate form fields
2. Press Enter to submit
3. Press Escape to close dialog
4. Verify all buttons are accessible

### Screen Reader Testing
1. Use browser screen reader
2. Verify labels are read correctly
3. Check error messages are announced
4. Verify success messages are announced

---

## Performance Testing

### Measure Load Time
1. Open DevTools → Performance tab
2. Click Record
3. Create settlement
4. Click Stop
5. Check timeline for bottlenecks

### Expected Performance
- Settlement creation: < 2 seconds
- History load: < 1 second
- Balance update: < 500ms
- Dialog open: < 300ms

---

## Tips for Effective UI Testing

1. **Use Multiple Browsers**
   - Chrome
   - Firefox
   - Safari
   - Edge

2. **Test Different Screen Sizes**
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)

3. **Test Different Scenarios**
   - Full settlement
   - Partial settlement
   - Multiple settlements
   - Reversals

4. **Check All States**
   - Empty state (no settlements)
   - Loading state
   - Success state
   - Error state

5. **Verify Data Persistence**
   - Refresh page
   - Close browser
   - Check data still there

6. **Monitor Performance**
   - Check network requests
   - Monitor console for errors
   - Check memory usage
   - Verify no memory leaks

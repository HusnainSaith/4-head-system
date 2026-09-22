# How to Access Party Settlement Page

## Step 1: Rebuild Frontend

The route has been added to `AppRoutes.tsx`. You need to rebuild the frontend:

```bash
# Stop the frontend if running (Ctrl+C)

# Rebuild
cd 4Head_frontend
npm run dev
```

The frontend will automatically rebuild and hot-reload.

## Step 2: Access Settlement Page

### Method 1: Direct URL
Navigate to: `http://localhost:5173/parties/settlements`

### Method 2: Via Menu (if menu item exists)
Look for **Settlements** or **Party Settlement** in the left sidebar menu

### Method 3: From Parties Page
1. Go to **Parties** page
2. Look for a **Settlements** link or tab
3. Click to navigate to settlements

## What You Should See

Once you access the settlement page, you should see:

```
┌─────────────────────────────────────────────────────────┐
│  Party Settlement                    [Create Settlement]│
├─────────────────────────────────────────────────────────┤
│ ┌──────────────┬──────────────┬──────────────┐          │
│ │ Total        │ Total        │ Net          │          │
│ │ Payable      │ Receivable   │ Position     │          │
│ │ Rs. X        │ Rs. X        │ Rs. X        │          │
│ └──────────────┴──────────────┴──────────────┘          │
│                                                         │
│ Settlement History                                      │
│ (Empty initially)                                       │
└─────────────────────────────────────────────────────────┘
```

## Testing the Settlement Feature

### Quick Test (5 minutes)

1. **Create Test Parties**
   - Go to **Parties** page
   - Create Party A: +10,000 balance
   - Create Party B: -10,000 balance

2. **Create Settlement**
   - Go to **Settlements** page
   - Click **Create Settlement**
   - Select Party A (payable)
   - Select Party B (receivable)
   - Enter amount: 10,000
   - Click **Create Settlement**

3. **Verify**
   - Settlement appears in history
   - Go to Parties page
   - Party A balance: 0 (was +10,000)
   - Party B balance: 0 (was -10,000)

## Troubleshooting

### Settlement Page Not Loading
- Clear browser cache (Ctrl+Shift+Delete)
- Refresh page (F5)
- Check browser console (F12) for errors

### Create Settlement Button Not Visible
- Refresh page
- Check you're logged in
- Verify you have party role (OWNER, ACCOUNTANT, or DEPARTMENT_STAFF)

### Parties Not Showing in Dropdown
- Verify parties exist in database
- Check parties have correct balances
- Refresh page

## Next Steps

1. ✓ Rebuild frontend
2. → Navigate to `/parties/settlements`
3. → Create test parties
4. → Test settlement creation
5. → Verify balances updated
6. → Test reversal
7. → Check settlement history

## Files Modified

- `src/routes/AppRoutes.tsx` - Added settlement route and import

## Route Details

```typescript
// Import
const PartySettlementPage = lazy(() =>
  import("@/features/parties/components/PartySettlementPage").then((module) => ({
    default: module.PartySettlementPage,
  })),
);

// Route
<Route
  path="parties/settlements"
  element={
    <RoleGuard allowedRoles={partyRoles}>
      <PartySettlementPage />
    </RoleGuard>
  }
/>
```

## Access Control

The settlement page requires:
- ✓ Authentication (logged in)
- ✓ Party role (OWNER, ACCOUNTANT, or DEPARTMENT_STAFF)
- ✓ Department scope access

## Success Indicators

You'll know it's working when:
- ✓ Settlement page loads without errors
- ✓ Summary cards display
- ✓ Create Settlement button visible
- ✓ Settlement history table visible
- ✓ Can create settlements
- ✓ Balances update correctly

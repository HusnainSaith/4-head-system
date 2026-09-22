# Record Payment Feature - Implementation Guide

## Current Situation

The "Record payment" button in Brokerage Purchases currently opens a dialog to **record a new transaction**, not to record a payment for an existing transaction.

## What You Want

You want to:
1. Click on a **transaction row** (e.g., a purchase record)
2. Click a **"Record Payment"** button
3. Open a **double-entry journal page** to record the payment

## Implementation Steps

### Step 1: Add "Record Payment" Action to Table

In `BrokerageTransactionsPage.tsx`, add a new action button in the table:

```typescript
{
  id: "recordPayment",
  header: "Payment",
  cell: (row: BrokeragePurchase | BrokerageSale) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        // Navigate to payment recording page
        navigate(`/brokerage/${kind}/${row.id}/record-payment`);
      }}
    >
      Record Payment
    </Button>
  ),
}
```

### Step 2: Create Payment Recording Page

Create a new component: `BrokeragePaymentPage.tsx`

This page should:
- Show the transaction details (party, amount, outstanding balance)
- Display a form to record the payment
- Show the double-entry journal entries that will be created
- Allow selecting payment method (cash/bank)
- Submit the payment

### Step 3: Add Route

In `AppRoutes.tsx`, add:

```typescript
<Route
  path="brokerage/purchases/:id/record-payment"
  element={
    <BrokerageAccess>
      <BrokeragePaymentPage kind="purchase" />
    </BrokerageAccess>
  }
/>
<Route
  path="brokerage/sales/:id/record-payment"
  element={
    <BrokerageAccess>
      <BrokeragePaymentPage kind="sale" />
    </BrokerageAccess>
  }
/>
```

### Step 4: Create Payment API

Add to `brokerageApi.ts`:

```typescript
recordBrokeragePurchasePayment: builder.mutation({
  query: ({ id, body }) => ({
    url: `/brokerage/purchases/${id}/record-payment`,
    method: "POST",
    body,
  }),
}),
recordBrokerageSalePayment: builder.mutation({
  query: ({ id, body }) => ({
    url: `/brokerage/sales/${id}/record-payment`,
    method: "POST",
    body,
  }),
}),
```

### Step 5: Backend Implementation

In the backend, create endpoints:

```typescript
POST /brokerage/purchases/:id/record-payment
POST /brokerage/sales/:id/record-payment
```

These should:
- Accept payment amount and method
- Create ledger entries for the payment
- Update the transaction's paid/received amount
- Update outstanding balance

## Double-Entry Journal Display

The payment page should show:

```
Transaction: Purchase from Sajawal Poultry Farm
Amount: Rs. 672,980
Outstanding: Rs. 672,980

Payment Amount: [Input]
Payment Method: [Cash/Bank]

Journal Entries to be Created:
┌─────────────────────────────────────────┐
│ Debit  | Accounts Payable (Party)       │ Rs. 100,000
│ Credit | Cash/Bank Account              │ Rs. 100,000
└─────────────────────────────────────────┘

[Record Payment] [Cancel]
```

## Alternative: Simpler Approach

If you want a simpler solution, you can:

1. Add a "Record Payment" button in the transaction row
2. Open a modal dialog (not a full page)
3. Show the payment form with journal preview
4. Submit directly from the modal

This would be faster to implement and still provide the double-entry journal visibility.

## Files to Create/Modify

### Create:
- `src/features/brokerage/components/BrokeragePaymentPage.tsx`
- `src/features/brokerage/components/PaymentJournalPreview.tsx`

### Modify:
- `src/routes/AppRoutes.tsx` - Add routes
- `src/features/brokerage/brokerageApi.ts` - Add mutations
- `src/features/brokerage/components/BrokerageTransactionsPage.tsx` - Add button

### Backend:
- Add payment recording endpoints
- Create ledger entries for payments
- Update transaction balances

## Next Steps

1. Decide: Full page or modal dialog?
2. Create the payment recording component
3. Add the API endpoints
4. Add the routes
5. Test the payment recording flow

Would you like me to implement this feature?

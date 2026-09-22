# Party Settlement Feature - Frontend Implementation Guide

## Overview

This guide provides frontend implementation requirements for the party-to-party settlement feature. The frontend should allow admins to create, view, and reverse party settlements.

## UI Components Required

### 1. Settlement Creation Form

**Location**: New page or modal accessible from parties section

**Fields**:
- **Payable Party** (Required)
  - Dropdown/Select component
  - Shows parties with positive balance (we owe them)
  - Display: Party name + current balance
  - Validation: Must have positive balance

- **Receivable Party** (Required)
  - Dropdown/Select component
  - Shows parties with negative balance (they owe us)
  - Display: Party name + current balance
  - Validation: Must have negative balance

- **Settlement Amount** (Required)
  - Number input
  - Min: 0.01
  - Max: min(payable balance, abs(receivable balance))
  - Show max available amount
  - Validation: Must be positive and not exceed available

- **Department** (Required)
  - Dropdown/Select
  - Pre-populated if user has department scope
  - Both parties must be linked to this department

- **Settlement Date** (Optional)
  - Date picker
  - Default: Today
  - Format: YYYY-MM-DD

- **Reference** (Optional)
  - Text input
  - Max 255 characters
  - Example: "SETTLE-001"

- **Notes** (Optional)
  - Text area
  - Max 500 characters
  - Example: "Mutual obligation settlement"

**Form Validation**:
- All required fields must be filled
- Payable and receivable parties must be different
- Settlement amount must be positive
- Settlement amount must not exceed available balance
- Both parties must be linked to selected department

**Form Actions**:
- Save button: Creates settlement
- Cancel button: Closes form
- Show loading state during submission
- Show error messages for validation failures

### 2. Settlement List/History View

**Location**: Party detail page or dedicated settlements page

**Display**:
- Table with columns:
  - Payable Party (link to party)
  - Receivable Party (link to party)
  - Settlement Amount (formatted currency)
  - Settlement Date
  - Reference
  - Status (Active/Reversed)
  - Actions

**Filters**:
- By party (if on dedicated page)
- By department
- By date range
- By status (Active/Reversed)

**Actions**:
- View details
- Reverse settlement (if active)
- Delete settlement (soft delete)

### 3. Settlement Details Modal

**Display**:
- Settlement ID
- Payable Party (with link)
- Receivable Party (with link)
- Settlement Amount
- Settlement Date
- Reference
- Notes
- Status
- Created by / Created at
- Updated by / Updated at
- Reversed by / Reversed at (if reversed)
- Reversal reason (if reversed)

**Actions**:
- Reverse button (if active)
- Close button

### 4. Settlement Reversal Dialog

**Trigger**: Click "Reverse" button on active settlement

**Fields**:
- **Reversal Reason** (Required)
  - Text area
  - Max 500 characters
  - Placeholder: "Reason for reversal"

**Actions**:
- Confirm button: Reverses settlement
- Cancel button: Closes dialog
- Show loading state during submission
- Show error messages for failures

**Confirmation Message**:
"Are you sure you want to reverse this settlement? This will restore the original party balances."

## API Integration

### Create Settlement
```typescript
POST /parties/settlements
{
  payablePartyId: string;
  receivablePartyId: string;
  settlementAmount: number;
  departmentId: string;
  settlementDate?: string;
  reference?: string;
  notes?: string;
}
```

### Reverse Settlement
```typescript
POST /parties/settlements/:id/reverse
{
  reversalReason: string;
}
```

### Get Settlement History
```typescript
GET /parties/:id/settlements?departmentId=:departmentId
```

## State Management

### Settlement State
```typescript
interface Settlement {
  id: string;
  payablePartyId: string;
  payableParty: Party;
  receivablePartyId: string;
  receivableParty: Party;
  departmentId: string;
  settlementAmount: string;
  settlementDate: string;
  reference?: string;
  notes?: string;
  status: 'active' | 'reversed';
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}
```

### Form State
```typescript
interface SettlementFormState {
  payablePartyId: string;
  receivablePartyId: string;
  settlementAmount: number;
  departmentId: string;
  settlementDate: string;
  reference: string;
  notes: string;
  errors: Record<string, string>;
  isLoading: boolean;
}
```

## User Experience Flows

### Create Settlement Flow
1. Admin navigates to Parties section
2. Clicks "Create Settlement" button
3. Form opens with empty fields
4. Admin selects payable party (shows balance)
5. Admin selects receivable party (shows balance)
6. System calculates max settlement amount
7. Admin enters settlement amount (with validation)
8. Admin optionally enters date, reference, notes
9. Admin clicks Save
10. System validates and creates settlement
11. Success message shown
12. Form closes
13. Settlement appears in history

### View Settlement History Flow
1. Admin opens party detail page
2. Scrolls to "Settlements" section
3. Sees list of all settlements involving this party
4. Can filter by date range, status, etc.
5. Can click on settlement to view details
6. Can reverse active settlements

### Reverse Settlement Flow
1. Admin views settlement details
2. Clicks "Reverse" button (only for active settlements)
3. Reversal dialog opens
4. Admin enters reversal reason
5. Admin clicks Confirm
6. System reverses settlement
7. Success message shown
8. Settlement status changes to "Reversed"
9. Party balances restored

## Validation Rules

### Client-Side Validation
- Payable party selected and different from receivable party
- Receivable party selected and different from payable party
- Settlement amount is positive number
- Settlement amount ≤ max available
- Department selected
- All required fields filled

### Server-Side Validation
- Payable party has positive balance
- Receivable party has negative balance
- Settlement amount ≤ min(payable balance, abs(receivable balance))
- Both parties linked to department
- Settlement not already reversed

## Error Handling

### Display Error Messages
- "Payable party and receivable party must be different"
- "Payable party has no outstanding payable balance"
- "Receivable party has no outstanding receivable balance"
- "Settlement amount exceeds maximum available"
- "Settlement not found"
- "Settlement is already reversed"
- "Network error - please try again"

### Retry Logic
- Show retry button for network errors
- Auto-retry with exponential backoff
- Show loading state during retry

## Accessibility Requirements

- Form labels properly associated with inputs
- Error messages announced to screen readers
- Keyboard navigation support
- ARIA labels for dynamic content
- Color not sole indicator of status
- Sufficient color contrast

## Performance Considerations

- Lazy load settlement history
- Paginate settlement list (20 items per page)
- Cache party balances
- Debounce amount input validation
- Show loading skeleton while fetching

## Mobile Responsiveness

- Form fields stack vertically on mobile
- Table converts to card layout on mobile
- Buttons sized for touch (min 44x44px)
- Modal full-screen on mobile
- Scrollable content areas

## Testing Checklist

- [ ] Create settlement with valid data
- [ ] Validate form errors
- [ ] Show max settlement amount
- [ ] Reverse active settlement
- [ ] View settlement history
- [ ] Filter settlements
- [ ] Handle network errors
- [ ] Test on mobile
- [ ] Test keyboard navigation
- [ ] Test screen reader

## Implementation Priority

1. **Phase 1** (MVP):
   - Settlement creation form
   - Settlement list view
   - Reverse settlement dialog

2. **Phase 2** (Enhancement):
   - Settlement details modal
   - Filtering and sorting
   - Export settlements

3. **Phase 3** (Polish):
   - Advanced analytics
   - Settlement templates
   - Bulk operations

## Code Structure

### Suggested File Organization
```
src/features/settlements/
├── components/
│   ├── SettlementForm.tsx
│   ├── SettlementList.tsx
│   ├── SettlementDetails.tsx
│   └── ReverseSettlementDialog.tsx
├── hooks/
│   ├── useSettlements.ts
│   └── useSettlementForm.ts
├── types.ts
├── settlementsApi.ts
└── index.ts
```

### API Integration Example
```typescript
// settlementsApi.ts
export const settlementsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createSettlement: builder.mutation({
      query: (dto) => ({
        url: '/parties/settlements',
        method: 'POST',
        body: dto,
      }),
    }),
    reverseSettlement: builder.mutation({
      query: ({ id, reversalReason }) => ({
        url: `/parties/settlements/${id}/reverse`,
        method: 'POST',
        body: { reversalReason },
      }),
    }),
    getSettlementHistory: builder.query({
      query: (partyId, departmentId) => ({
        url: `/parties/${partyId}/settlements`,
        params: { departmentId },
      }),
    }),
  }),
});
```

## Notes

- Settlement creation should be restricted to admin users
- Party balances should be fetched fresh before showing form
- Settlement history should be paginated for performance
- Reversals should require confirmation
- All actions should be logged for audit trail

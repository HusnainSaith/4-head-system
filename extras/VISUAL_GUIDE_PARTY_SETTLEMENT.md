# Party Settlement Feature - Visual Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Party Settlement Page                                   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                          │  │
│  │  Total Payable: Rs. 50,000  │  Total Receivable: Rs. 30,000  │
│  │  Net Position: Rs. 20,000                               │  │
│  │                                                          │  │
│  │  [Create Settlement Button]                             │  │
│  │                                                          │  │
│  │  Settlement History:                                    │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ Date │ Payable │ Receivable │ Amount │ Status │ Act│ │  │
│  │  ├────────────────────────────────────────────────────┤ │  │
│  │  │ 2026 │ Party A │ Party B    │ 10,000 │ Active │ ✓ │ │  │
│  │  │ 2026 │ Party C │ Party D    │  5,000 │ Active │ ✓ │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │                                              │
         │ Create Settlement                           │ Reverse
         ▼                                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │         Settlement Dialog Form                         │
    ├─────────────────────────────────────────────────────────┤
    │                                                         │
    │  Payable Party:      [Dropdown ▼]                      │
    │                      Current Balance: +10,000          │
    │                                                         │
    │  Receivable Party:   [Dropdown ▼]                      │
    │                      Current Balance: -10,000          │
    │                                                         │
    │  Settlement Amount:  [Input: 10000]                    │
    │                      Max: 10,000                       │
    │                                                         │
    │  Settlement Date:    [Date Picker: 2026-07-12]         │
    │                                                         │
    │  Reference:          [Input: Optional]                 │
    │                                                         │
    │  Notes:              [Textarea: Optional]              │
    │                                                         │
    │  [Cancel]  [Create Settlement]                         │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
         │
         │ Submit
         ▼
    ┌─────────────────────────────────────────────────────────┐
    │              BACKEND PROCESSING                         │
    ├─────────────────────────────────────────────────────────┤
    │                                                         │
    │  1. Validate Input                                      │
    │     ✓ Parties different                                │
    │     ✓ Amount > 0                                       │
    │     ✓ Payable balance > 0                              │
    │     ✓ Receivable balance < 0                           │
    │     ✓ Amount ≤ min(payable, receivable)                │
    │                                                         │
    │  2. Create Settlement Record                            │
    │     INSERT INTO party_settlements (...)                │
    │                                                         │
    │  3. Post Ledger Entries                                 │
    │     ┌─────────────────────────────────────────────┐    │
    │     │ Debit Accounts Payable (Party A)   10,000   │    │
    │     │ Debit Accounts Receivable (Party B) 10,000  │    │
    │     └─────────────────────────────────────────────┘    │
    │                                                         │
    │  4. Update Party Balances                               │
    │     Party A: +10,000 → 0                               │
    │     Party B: -10,000 → 0                               │
    │                                                         │
    │  5. Return Success                                      │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
         │
         │ Success
         ▼
    ┌─────────────────────────────────────────────────────────┐
    │  Settlement Created Successfully                        │
    │  Settlement ID: [uuid]                                  │
    │  Refresh History...                                     │
    └─────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    PARTY SETTLEMENT FLOW                         │
└──────────────────────────────────────────────────────────────────┘

BEFORE SETTLEMENT:
┌─────────────────────────────────────────────────────────────────┐
│ Party A (Payable)                                               │
│ ├─ Balance: +10,000 (we owe them)                               │
│ └─ Ledger: [Opening Balance: +10,000]                           │
│                                                                 │
│ Party B (Receivable)                                            │
│ ├─ Balance: -10,000 (they owe us)                               │
│ └─ Ledger: [Opening Balance: -10,000]                           │
│                                                                 │
│ Cash Account: 100,000                                           │
│ Bank Account: 50,000                                            │
└─────────────────────────────────────────────────────────────────┘

SETTLEMENT TRANSACTION:
┌─────────────────────────────────────────────────────────────────┐
│ Settlement ID: [uuid]                                           │
│ Payable Party: Party A                                          │
│ Receivable Party: Party B                                       │
│ Amount: 10,000                                                  │
│ Date: 2026-07-12                                                │
│ Status: Active                                                  │
│                                                                 │
│ Ledger Entries:                                                 │
│ ├─ Entry 1: Debit Accounts Payable (Party A)      10,000       │
│ └─ Entry 2: Debit Accounts Receivable (Party B)   10,000       │
└─────────────────────────────────────────────────────────────────┘

AFTER SETTLEMENT:
┌─────────────────────────────────────────────────────────────────┐
│ Party A (Payable)                                               │
│ ├─ Balance: 0 (settled)                                         │
│ └─ Ledger: [Opening: +10,000] [Settlement: -10,000]             │
│                                                                 │
│ Party B (Receivable)                                            │
│ ├─ Balance: 0 (settled)                                         │
│ └─ Ledger: [Opening: -10,000] [Settlement: +10,000]             │
│                                                                 │
│ Cash Account: 100,000 (UNCHANGED)                               │
│ Bank Account: 50,000 (UNCHANGED)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Balance Movement Diagram

```
PAYABLE PARTY (Party A)
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  +10,000 ─────────────────────────────────────────────────► 0   │
│  (Owe)                                                   (Settled)
│                                                                 │
│  Settlement Amount: 10,000                                      │
│  ◄─────────────────────────────────────────────────────────────┤
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

RECEIVABLE PARTY (Party B)
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  -10,000 ────────────────────────────────────────────────► 0    │
│  (Owed)                                                 (Settled)
│                                                                 │
│  Settlement Amount: 10,000                                      │
│  ◄─────────────────────────────────────────────────────────────┤
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

CASH & BANK (UNCHANGED)
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Cash:  100,000 ──────────────────────────────────────► 100,000 │
│  Bank:   50,000 ──────────────────────────────────────►  50,000 │
│                                                                 │
│  No movement - Settlement is party-to-party only                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Ledger Entry Structure

```
SETTLEMENT TRANSACTION LEDGER
┌──────────────────────────────────────────────────────────────────┐
│ Transaction ID: [uuid]                                           │
│ Source Type: party_adjustment                                    │
│ Date: 2026-07-12                                                 │
│ Created By: [user_id]                                            │
│ Department: [department_id]                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ENTRY 1 (Debit)                                                  │
│ ├─ Account: Accounts Payable                                     │
│ ├─ Party: Party A                                                │
│ ├─ Type: Debit                                                   │
│ ├─ Amount: 10,000                                                │
│ └─ Description: Settlement with Party B                          │
│                                                                  │
│ ENTRY 2 (Debit)                                                  │
│ ├─ Account: Accounts Receivable                                  │
│ ├─ Party: Party B                                                │
│ ├─ Type: Debit                                                   │
│ ├─ Amount: 10,000                                                │
│ └─ Description: Settlement with Party A                          │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ Total Debits:  20,000                                            │
│ Total Credits: 20,000                                            │
│ Balance: ✓ Balanced                                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Reversal Flow

```
ACTIVE SETTLEMENT
┌─────────────────────────────────────────────────────────────────┐
│ Settlement ID: [uuid]                                           │
│ Status: Active                                                  │
│ Payable Party: Party A                                          │
│ Receivable Party: Party B                                       │
│ Amount: 10,000                                                  │
│ Date: 2026-07-12                                                │
│                                                                 │
│ [Reverse Button]                                                │
└─────────────────────────────────────────────────────────────────┘
         │
         │ Click Reverse
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Reversal Reason Dialog                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Why are you reversing this settlement?                          │
│ [Textarea: ________________]                                    │
│                                                                 │
│ [Cancel]  [Confirm Reversal]                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         │ Confirm
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND REVERSAL PROCESSING                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. Find Original Ledger Entries                                 │
│    ├─ Debit Accounts Payable (Party A)      10,000             │
│    └─ Debit Accounts Receivable (Party B)   10,000             │
│                                                                 │
│ 2. Create Reversal Entries                                      │
│    ├─ Credit Accounts Payable (Party A)     10,000             │
│    └─ Credit Accounts Receivable (Party B)  10,000             │
│                                                                 │
│ 3. Update Settlement Status                                     │
│    ├─ Status: Active → Reversed                                │
│    ├─ Reversed At: [timestamp]                                 │
│    ├─ Reversed By: [user_id]                                   │
│    └─ Reversal Reason: [reason]                                │
│                                                                 │
│ 4. Restore Party Balances                                       │
│    ├─ Party A: 0 → +10,000                                     │
│    └─ Party B: 0 → -10,000                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         │ Success
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ REVERSED SETTLEMENT                                             │
├─────────────────────────────────────────────────────────────────┤
│ Settlement ID: [uuid]                                           │
│ Status: Reversed                                                │
│ Reversed At: 2026-07-13 10:30:00                                │
│ Reversed By: [user_name]                                        │
│ Reversal Reason: Incorrect settlement                           │
│                                                                 │
│ Party A Balance: +10,000 (restored)                             │
│ Party B Balance: -10,000 (restored)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
PartySettlementPage
├── Summary Cards
│   ├── Total Payable Card
│   ├── Total Receivable Card
│   └── Net Position Card
│
├── PartySettlementHistory
│   ├── Settlement Table
│   │   ├── Date Column
│   │   ├── Payable Party Column
│   │   ├── Receivable Party Column
│   │   ├── Amount Column
│   │   ├── Reference Column
│   │   ├── Status Column (Badge)
│   │   └── Actions Column (Reverse Button)
│   │
│   └── Reversal Dialog
│       ├── Reason Input
│       └── Confirm/Cancel Buttons
│
└── PartySettlementDialog
    ├── Payable Party Select
    │   └── Balance Display
    ├── Receivable Party Select
    │   └── Balance Display
    ├── Amount Input
    │   └── Max Amount Display
    ├── Date Picker
    ├── Reference Input
    ├── Notes Textarea
    └── Submit/Cancel Buttons
```

---

## API Endpoint Flow

```
CREATE SETTLEMENT
┌─────────────────────────────────────────────────────────────────┐
│ POST /parties/settlements                                       │
│                                                                 │
│ Request Body:                                                   │
│ {                                                               │
│   "payablePartyId": "uuid1",                                    │
│   "receivablePartyId": "uuid2",                                 │
│   "settlementAmount": 10000,                                    │
│   "departmentId": "uuid3",                                      │
│   "settlementDate": "2026-07-12",                               │
│   "reference": "REF001",                                        │
│   "notes": "Settlement for July"                                │
│ }                                                               │
│                                                                 │
│ Response (200 OK):                                              │
│ {                                                               │
│   "success": true,                                              │
│   "message": "Party settlement created successfully",           │
│   "data": {                                                     │
│     "id": "uuid",                                               │
│     "payablePartyId": "uuid1",                                  │
│     "receivablePartyId": "uuid2",                               │
│     "settlementAmount": "10000.00",                             │
│     "status": "active",                                         │
│     ...                                                         │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘

REVERSE SETTLEMENT
┌─────────────────────────────────────────────────────────────────┐
│ POST /parties/settlements/{id}/reverse                          │
│                                                                 │
│ Request Body:                                                   │
│ {                                                               │
│   "reversalReason": "Incorrect settlement"                      │
│ }                                                               │
│                                                                 │
│ Response (200 OK):                                              │
│ {                                                               │
│   "success": true,                                              │
│   "message": "Party settlement reversed successfully",          │
│   "data": {                                                     │
│     "id": "uuid",                                               │
│     "status": "reversed",                                       │
│     "reversedAt": "2026-07-13T10:30:00Z",                       │
│     "reversedBy": "user_id",                                    │
│     "reversalReason": "Incorrect settlement",                   │
│     ...                                                         │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘

GET SETTLEMENT HISTORY
┌─────────────────────────────────────────────────────────────────┐
│ GET /parties/{partyId}/settlements?departmentId={deptId}        │
│                                                                 │
│ Response (200 OK):                                              │
│ {                                                               │
│   "success": true,                                              │
│   "message": "Settlement history retrieved successfully",       │
│   "data": [                                                     │
│     {                                                           │
│       "id": "uuid1",                                            │
│       "payableParty": {...},                                    │
│       "receivableParty": {...},                                 │
│       "settlementAmount": "10000.00",                           │
│       "status": "active",                                       │
│       ...                                                       │
│     },                                                          │
│     {                                                           │
│       "id": "uuid2",                                            │
│       "status": "reversed",                                     │
│       ...                                                       │
│     }                                                           │
│   ]                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Validation Rules Flowchart

```
Settlement Request
│
├─ Payable Party = Receivable Party?
│  ├─ YES → ❌ Error: "Parties must be different"
│  └─ NO → Continue
│
├─ Settlement Amount > 0?
│  ├─ NO → ❌ Error: "Amount must be > 0"
│  └─ YES → Continue
│
├─ Payable Party Balance > 0?
│  ├─ NO → ❌ Error: "No payable balance"
│  └─ YES → Continue
│
├─ Receivable Party Balance < 0?
│  ├─ NO → ❌ Error: "No receivable balance"
│  └─ YES → Continue
│
├─ Amount ≤ min(payable, receivable)?
│  ├─ NO → ❌ Error: "Amount exceeds maximum"
│  └─ YES → Continue
│
└─ ✅ All Validations Passed
   └─ Create Settlement
      └─ Post Ledger Entries
         └─ Update Balances
            └─ Return Success
```

---

## Summary

This visual guide shows:
1. **System Architecture** - How components interact
2. **Data Flow** - Before/after settlement state
3. **Balance Movement** - How balances change
4. **Ledger Structure** - Double-entry posting
5. **Reversal Flow** - How reversals work
6. **Component Hierarchy** - UI structure
7. **API Endpoints** - Request/response format
8. **Validation Rules** - Decision flow

All components work together to provide a seamless party settlement experience.

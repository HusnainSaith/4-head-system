# Party-to-Party Settlement Feature Implementation

## Overview

This document describes the implementation of the **Pay + Receive party-to-party settlement** feature that allows admins to settle a payable party and a receivable party against each other in a single double-entry transaction without involving Cash or Bank accounts.

## Business Scenario

**Example:**
- **Party A (Payable)**: We owe Rs. 10,000
- **Party B (Receivable)**: They owe us Rs. 10,000

Instead of:
1. Receiving Rs. 10,000 from Party B
2. Paying Rs. 10,000 to Party A

The admin can settle these directly against each other in one transaction.

**Result:**
- Party A balance: 0 (was +10,000, reduced by 10,000)
- Party B balance: 0 (was -10,000, increased by 10,000)
- Cash/Bank: unchanged

## Balance Convention

The system uses signed-balance accounting:
```
Negative Balance = Receivable (they owe us)
Positive Balance = Payable (we owe them)
```

## Implementation Details

### 1. New Entity: PartySettlement

**File**: `src/modules/parties/entities/party-settlement.entity.ts`

Tracks party-to-party settlements with:
- `payablePartyId`: Party we owe money to
- `receivablePartyId`: Party that owes us money
- `settlementAmount`: Amount being settled
- `settlementDate`: Date of settlement
- `reference`: Optional reference number
- `notes`: Optional description
- `status`: 'active' or 'reversed'
- Audit fields for reversal tracking

### 2. New DTO: CreatePartySettlementDto

**File**: `src/modules/parties/dto/create-party-settlement.dto.ts`

Validates settlement input:
- Both parties must be different
- Settlement amount must be positive
- Amount must not exceed available balance on either side

### 3. Service Methods

**File**: `src/modules/parties/parties.service.ts`

#### createPartySettlement(dto, actorId)
Creates a party-to-party settlement with validation:

**Validations:**
1. Payable and receivable parties must be different
2. Payable party must have positive balance (we owe them)
3. Receivable party must have negative balance (they owe us)
4. Settlement amount ≤ min(payable balance, abs(receivable balance))

**Ledger Entries Created:**
```
Entry 1: Debit accounts_payable (payable party) - reduces what we owe
Entry 2: Debit accounts_receivable (receivable party) - reduces what they owe
```

**Key Points:**
- Both entries use `sourceType: 'party_adjustment'`
- Both entries reference the same settlement ID
- Transaction is atomic - both succeed or both fail
- No cash or bank accounts involved

#### reversePartySettlement(settlementId, reversalReason, actorId)
Reverses a settlement by:
1. Reversing all ledger entries (flips debit/credit)
2. Marking settlement as 'reversed'
3. Recording who reversed it and when

#### getPartySettlementHistory(partyId, departmentId?)
Retrieves all settlements involving a party, ordered by date descending.

### 4. Controller Endpoints

**File**: `src/modules/parties/parties.controller.ts`

#### POST /parties/settlements
Creates a new settlement
```json
{
  "payablePartyId": "uuid",
  "receivablePartyId": "uuid",
  "settlementAmount": 10000,
  "departmentId": "uuid",
  "settlementDate": "2026-07-12",
  "reference": "REF-001",
  "notes": "Settlement of mutual obligations"
}
```

#### POST /parties/settlements/:id/reverse
Reverses a settlement
```json
{
  "reversalReason": "Incorrect settlement"
}
```

#### GET /parties/:id/settlements
Gets settlement history for a party
```
Query params:
- departmentId (optional): Filter by department
```

## Accounting Logic

### Balance Convention
```
Party Balance = Sum of all ledger entries for that party

Positive (+) = Payable (we owe them)
Negative (-) = Receivable (they owe us)
```

### Settlement Example

**Before Settlement:**
```
Party A: +10,000 (we owe them)
Party B: -10,000 (they owe us)
```

**Settlement Transaction:**
```
Settlement Amount: 10,000

Ledger Entry 1:
  Account: accounts_payable
  Party: Party A
  Type: Debit
  Amount: 10,000
  Effect: +10,000 - 10,000 = 0

Ledger Entry 2:
  Account: accounts_receivable
  Party: Party B
  Type: Debit
  Amount: 10,000
  Effect: -10,000 + 10,000 = 0
```

**After Settlement:**
```
Party A: 0
Party B: 0
```

## Validation Rules

1. **Different Parties**: Payable and receivable parties cannot be the same
2. **Sufficient Payable Balance**: Payable party must have positive balance ≥ settlement amount
3. **Sufficient Receivable Balance**: Receivable party must have negative balance with abs value ≥ settlement amount
4. **Maximum Settlement**: Settlement amount ≤ min(payable balance, abs(receivable balance))
5. **Valid Department**: Both parties must be linked to the settlement department

## Reversal Logic

When a settlement is reversed:
1. All original ledger entries are reversed (debit becomes credit, credit becomes debit)
2. Settlement status changes to 'reversed'
3. Reversal timestamp and actor are recorded
4. Reversal reason is stored for audit trail

**Example Reversal:**
```
Original Entry 1: Debit accounts_payable (Party A) 10,000
Reversal Entry 1: Credit accounts_payable (Party A) 10,000

Original Entry 2: Debit accounts_receivable (Party B) 10,000
Reversal Entry 2: Credit accounts_receivable (Party B) 10,000
```

## Database Schema

### party_settlements table
```sql
CREATE TABLE party_settlements (
  id UUID PRIMARY KEY,
  payable_party_id UUID NOT NULL REFERENCES parties(id),
  receivable_party_id UUID NOT NULL REFERENCES parties(id),
  department_id UUID NOT NULL REFERENCES departments(id),
  settlement_amount DECIMAL(14,2) NOT NULL,
  settlement_date DATE NOT NULL,
  reference VARCHAR(255),
  notes VARCHAR(500),
  status ENUM('active', 'reversed') DEFAULT 'active',
  reversed_at TIMESTAMPTZ,
  reversed_by UUID,
  reversal_reason VARCHAR(500),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  
  INDEX (payable_party_id, receivable_party_id),
  INDEX (department_id, settlement_date),
  INDEX (payable_party_id, department_id),
  INDEX (receivable_party_id, department_id)
);
```

## Ledger Integration

Settlements use the existing ledger system:
- `sourceType`: 'party_adjustment'
- `sourceId`: Settlement ID
- Entries are immutable (append-only)
- Reversals create new entries (not deletions)

## Error Handling

| Error | Condition | Message |
|-------|-----------|---------|
| BadRequestException | Same party | "Payable party and receivable party must be different" |
| BadRequestException | No payable balance | "Payable party has no outstanding payable balance" |
| BadRequestException | No receivable balance | "Receivable party has no outstanding receivable balance" |
| BadRequestException | Excess amount | "Settlement amount exceeds maximum available" |
| NotFoundException | Settlement not found | "Settlement not found" |
| BadRequestException | Already reversed | "Settlement is already reversed" |

## Audit Trail

All settlements are fully auditable:
- Creation: `created_by`, `created_at`
- Modification: `updated_by`, `updated_at`
- Reversal: `reversed_by`, `reversed_at`, `reversal_reason`
- Soft delete: `deleted_at`

## API Examples

### Create Settlement
```bash
POST /parties/settlements
Content-Type: application/json

{
  "payablePartyId": "550e8400-e29b-41d4-a716-446655440000",
  "receivablePartyId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "settlementAmount": 10000,
  "departmentId": "7ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "settlementDate": "2026-07-12",
  "reference": "SETTLE-001",
  "notes": "Mutual obligation settlement"
}
```

### Reverse Settlement
```bash
POST /parties/settlements/550e8400-e29b-41d4-a716-446655440001/reverse
Content-Type: application/json

{
  "reversalReason": "Incorrect settlement amount"
}
```

### Get Settlement History
```bash
GET /parties/550e8400-e29b-41d4-a716-446655440000/settlements?departmentId=7ba7b810-9dad-11d1-80b4-00c04fd430c8
```

## Testing Checklist

- [ ] Create settlement with valid parties and amounts
- [ ] Validate settlement amount cannot exceed available balance
- [ ] Verify ledger entries are created correctly
- [ ] Verify party balances are updated correctly
- [ ] Test reversal of settlement
- [ ] Verify reversal restores original balances
- [ ] Test settlement history retrieval
- [ ] Verify audit trail is complete
- [ ] Test error cases (same party, insufficient balance, etc.)
- [ ] Verify cash/bank accounts are not affected

## Migration Required

A database migration is needed to create the `party_settlements` table. The migration should:
1. Create the table with all columns
2. Add foreign key constraints
3. Create indexes for performance
4. Add the 'party_adjustment' source type to ledger_entries enum if not present

## Notes

- Settlements are immutable once created (no direct edits, only reversals)
- Both parties must be linked to the settlement department
- Settlement amount must be positive and non-zero
- The system maintains complete audit trail for compliance
- No cash or bank accounts are involved in settlements
- Reversals create new ledger entries (append-only pattern)

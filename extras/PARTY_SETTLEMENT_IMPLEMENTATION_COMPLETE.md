# Party Settlement Feature - Complete Implementation Summary

## Overview

The party-to-party settlement feature allows admins to settle a payable party and a receivable party against each other in a single double-entry transaction without involving Cash or Bank accounts.

## Architecture

### Backend Components

#### 1. Entity: `PartySettlement`
**Location:** `src/modules/parties/entities/party-settlement.entity.ts`

```typescript
@Entity('party_settlements')
export class PartySettlement extends AuditBaseEntity {
  id: string;
  payablePartyId: string;
  payableParty: Party;
  receivablePartyId: string;
  receivableParty: Party;
  departmentId: string;
  department: Department;
  settlementAmount: string;
  settlementDate: string;
  reference?: string;
  notes?: string;
  status: 'active' | 'reversed';
  reversedAt?: Date;
  reversedBy?: string;
  reversalReason?: string;
}
```

#### 2. DTO: `CreatePartySettlementDto`
**Location:** `src/modules/parties/dto/create-party-settlement.dto.ts`

Validates:
- Both parties are different
- Settlement amount > 0
- All required fields present

#### 3. Service: `PartiesService`
**Location:** `src/modules/parties/parties.service.ts`

**Key Methods:**

- `createPartySettlement(dto, actorId)` - Creates settlement
  - Validates payable balance > 0
  - Validates receivable balance < 0
  - Validates settlement amount ≤ min(payable, abs(receivable))
  - Posts ledger entries in transaction
  - Returns settlement with relations

- `reversePartySettlement(settlementId, reason, actorId)` - Reverses settlement
  - Finds settlement
  - Reverses ledger entries
  - Updates settlement status
  - Records reversal metadata

- `getPartySettlementHistory(partyId, departmentId)` - Gets settlement history
  - Returns all settlements for a party
  - Includes both payable and receivable sides
  - Ordered by date descending

#### 4. Controller: `PartiesController`
**Location:** `src/modules/parties/parties.controller.ts`

**Endpoints:**

```
POST   /parties/settlements
       Create settlement

POST   /parties/settlements/:id/reverse
       Reverse settlement

GET    /parties/:id/settlements
       Get settlement history
```

#### 5. Ledger Integration
**Location:** `src/modules/ledger/ledger.service.ts`

Uses existing `post()` method to create balanced entries:

```typescript
await this.ledgerService.post([
  {
    accountCode: 'accounts_payable',
    partyId: payablePartyId,
    entryType: 'credit',      // Reduces positive balance
    amount: settlementAmount,
    sourceType: 'party_adjustment',
    sourceId: settlementId,
  },
  {
    accountCode: 'accounts_receivable',
    partyId: receivablePartyId,
    entryType: 'debit',        // Reduces negative balance
    amount: settlementAmount,
    sourceType: 'party_adjustment',
    sourceId: settlementId,
  },
], manager);
```

### Frontend Components

#### 1. Dialog: `PartySettlementDialog`
**Location:** `src/features/parties/components/PartySettlementDialog.tsx`

Features:
- Party selection dropdowns with current balances
- Settlement amount input with max validation
- Date picker (defaults to today)
- Reference and notes fields
- Real-time balance display
- Error handling and validation

#### 2. Page: `PartySettlementPage`
**Location:** `src/features/parties/components/PartySettlementPage.tsx`

Features:
- Summary cards (total payable, receivable, net position)
- Settlement history table
- Create settlement button
- Department-scoped view

#### 3. History: `PartySettlementHistory`
**Location:** `src/features/parties/components/PartySettlementHistory.tsx`

Features:
- Settlement records display
- Party names and amounts
- Settlement dates
- Status indicators
- Reversal actions

#### 4. API Integration: `partiesApi.ts`
**Location:** `src/features/parties/partiesApi.ts`

Endpoints:
- `useCreatePartySettlementMutation()` - Create settlement
- `useReversePartySettlementMutation()` - Reverse settlement
- `useGetPartySettlementHistoryQuery()` - Get history

## Balance Convention

The system uses signed balances:

```
Positive Balance = Payable (we owe them)
Negative Balance = Receivable (they owe us)

Ledger Balance = SUM(debits) - SUM(credits)
```

### Example

**Before Settlement:**
```
Party A: +10,000 (we owe them 10,000)
Party B: -10,000 (they owe us 10,000)
```

**Settlement Transaction:**
```
Payable Party:     Party A
Receivable Party:  Party B
Amount:            10,000
```

**Ledger Entries:**
```
1. Credit accounts_payable (Party A) by 10,000
   Effect: 10,000 - 10,000 = 0

2. Debit accounts_receivable (Party B) by 10,000
   Effect: 10,000 - 10,000 = 0
```

**After Settlement:**
```
Party A: 0 (settled)
Party B: 0 (settled)
```

## Validation Rules

### Pre-Settlement Validation

1. **Different Parties**
   - Payable party ≠ Receivable party
   - Error: "Payable party and receivable party must be different"

2. **Payable Balance Check**
   - Payable party balance > 0
   - Error: "Payable party has no outstanding payable balance"

3. **Receivable Balance Check**
   - Receivable party balance < 0
   - Error: "Receivable party has no outstanding receivable balance"

4. **Settlement Amount Check**
   - Amount ≤ min(payable balance, abs(receivable balance))
   - Error: "Settlement amount exceeds maximum available"

5. **Amount Validation**
   - Amount > 0
   - Amount is valid decimal (max 2 places)

### Reversal Validation

1. **Settlement Exists**
   - Settlement found by ID
   - Error: "Settlement not found"

2. **Not Already Reversed**
   - Settlement status = 'active'
   - Error: "Settlement is already reversed"

## Transaction Handling

All operations are atomic:

```typescript
await this.dataSource.transaction(async (manager) => {
  // 1. Create settlement record
  const saved = await settlementRepo.save(...);
  
  // 2. Post ledger entries
  await this.ledgerService.post([...], manager);
  
  // 3. Return settlement with relations
  return settlementRepo.findOneOrFail(...);
});
```

If any step fails, entire transaction rolls back.

## Reversal Mechanism

Uses existing `ledgerService.reverseSource()`:

```typescript
await this.dataSource.transaction(async (manager) => {
  // 1. Find and reverse all ledger entries
  await this.ledgerService.reverseSource(
    'party_adjustment',
    settlementId,
    actorId,
    manager,
  );
  
  // 2. Update settlement status
  settlement.status = 'reversed';
  settlement.reversedAt = new Date();
  settlement.reversedBy = actorId;
  settlement.reversalReason = reversalReason;
  await manager.save(PartySettlement, settlement);
});
```

Reversal creates offsetting entries:
- Original: Credit → Reversal: Debit
- Original: Debit → Reversal: Credit

Result: Balances restored to original values

## Database Schema

### party_settlements Table

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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  INDEX (payable_party_id, receivable_party_id),
  INDEX (department_id, settlement_date),
  INDEX (payable_party_id, department_id),
  INDEX (receivable_party_id, department_id)
);
```

### ledger_entries Table (Existing)

Settlement entries use:
- `source_type = 'party_adjustment'`
- `source_id = settlement_id`
- `account_code = 'accounts_payable' | 'accounts_receivable'`
- `entry_type = 'credit' | 'debit'`

## API Contracts

### Create Settlement

**Request:**
```http
POST /parties/settlements
Content-Type: application/json

{
  "payablePartyId": "uuid",
  "receivablePartyId": "uuid",
  "settlementAmount": 10000,
  "departmentId": "uuid",
  "settlementDate": "2026-07-12",
  "reference": "REF-001",
  "notes": "Settlement notes"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Party settlement created successfully",
  "data": {
    "id": "settlement-uuid",
    "payablePartyId": "party-a-uuid",
    "receivablePartyId": "party-b-uuid",
    "departmentId": "dept-uuid",
    "settlementAmount": "10000.00",
    "settlementDate": "2026-07-12",
    "reference": "REF-001",
    "notes": "Settlement notes",
    "status": "active",
    "payableParty": { ... },
    "receivableParty": { ... },
    "department": { ... },
    "createdAt": "2026-07-12T10:30:00Z",
    "createdBy": "user-uuid"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Settlement amount (10000) exceeds maximum available (5000)",
  "statusCode": 400
}
```

### Reverse Settlement

**Request:**
```http
POST /parties/settlements/:id/reverse
Content-Type: application/json

{
  "reversalReason": "Incorrect settlement"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Party settlement reversed successfully",
  "data": {
    "id": "settlement-uuid",
    "status": "reversed",
    "reversedAt": "2026-07-12T11:00:00Z",
    "reversedBy": "user-uuid",
    "reversalReason": "Incorrect settlement"
  }
}
```

### Get Settlement History

**Request:**
```http
GET /parties/:id/settlements?departmentId=uuid
```

**Response:**
```json
{
  "success": true,
  "message": "Settlement history retrieved successfully",
  "data": [
    {
      "id": "settlement-uuid",
      "payablePartyId": "party-a-uuid",
      "receivablePartyId": "party-b-uuid",
      "settlementAmount": "10000.00",
      "settlementDate": "2026-07-12",
      "status": "active",
      "payableParty": { ... },
      "receivableParty": { ... }
    }
  ]
}
```

## Security & Permissions

- Requires JWT authentication (`JwtAuthGuard`)
- Requires department scope access (`DepartmentScopeGuard`)
- Actor ID captured from authenticated user
- All operations audited (createdBy, createdAt)

## Error Handling

### Validation Errors (400)
- Different parties required
- Payable balance insufficient
- Receivable balance insufficient
- Settlement amount exceeds maximum
- Invalid amount (≤ 0)

### Not Found Errors (404)
- Settlement not found
- Party not found
- Department not found

### Business Logic Errors (400)
- Settlement already reversed
- Invalid party type

### Database Errors (500)
- Transaction rollback on any failure
- Constraint violations
- Connection issues

## Performance Considerations

### Indexes
- `(payable_party_id, receivable_party_id)` - Settlement lookup
- `(department_id, settlement_date)` - History queries
- `(payable_party_id, department_id)` - Party settlements
- `(receivable_party_id, department_id)` - Party settlements

### Query Optimization
- Ledger entries indexed by source_type and source_id
- Party balances calculated from indexed ledger entries
- Settlement history ordered by date descending

### Caching
- Frontend RTK Query caches invalidated on:
  - Settlement creation
  - Settlement reversal
  - Party balance changes

## Audit Trail

Each settlement records:
- `createdAt` - Settlement creation timestamp
- `createdBy` - User who created settlement
- `reversedAt` - Reversal timestamp (if reversed)
- `reversedBy` - User who reversed settlement
- `reversalReason` - Reason for reversal

Ledger entries also record:
- `createdAt` - Entry creation timestamp
- `createdBy` - User who created entry
- `sourceType` - 'party_adjustment'
- `sourceId` - Settlement ID

## Testing

### Unit Tests
- Balance calculation logic
- Validation rules
- Ledger entry creation
- Reversal mechanism

### Integration Tests
- End-to-end settlement flow
- Reversal flow
- Balance verification
- Ledger integrity

### E2E Tests
- Frontend UI interactions
- API contract validation
- Error handling
- Settlement history display

## Deployment Checklist

- [ ] Database migration applied
- [ ] Backend compiled and tested
- [ ] Frontend built and tested
- [ ] API documentation updated
- [ ] Audit trail verified
- [ ] Error handling tested
- [ ] Performance tested
- [ ] Security reviewed
- [ ] Rollback plan prepared

## Known Limitations

1. **No Edit After Creation**
   - Settlements cannot be edited
   - Must reverse and recreate

2. **No Partial Reversal**
   - Entire settlement must be reversed
   - Cannot reverse partial amount

3. **No Bulk Operations**
   - Settlements created one at a time
   - No batch settlement feature

4. **Department Scoped**
   - Settlements within single department
   - Cannot settle across departments

## Future Enhancements

1. **Settlement Editing**
   - Allow amount/date changes
   - Automatic reversal and recreation

2. **Partial Reversal**
   - Reverse portion of settlement
   - Create new settlement for remainder

3. **Bulk Settlements**
   - Settle multiple party pairs
   - Batch processing

4. **Cross-Department Settlements**
   - Settle parties across departments
   - Internal transfer handling

5. **Settlement Scheduling**
   - Schedule future settlements
   - Automatic execution

6. **Settlement Approval Workflow**
   - Require approval before posting
   - Audit trail of approvals

## Support & Troubleshooting

### Common Issues

**Issue: Settlement amount exceeds maximum**
- Solution: Verify both party balances
- Check: Payable > 0, Receivable < 0
- Adjust: Reduce settlement amount

**Issue: Balances not updating**
- Solution: Refresh page
- Check: Ledger entries created
- Verify: Balance calculation formula

**Issue: Reversal not working**
- Solution: Check settlement status
- Verify: Settlement is 'active'
- Check: Ledger entries exist

### Debug Commands

```sql
-- Check settlement
SELECT * FROM party_settlements WHERE id = 'settlement-id';

-- Check ledger entries
SELECT * FROM ledger_entries 
WHERE source_type = 'party_adjustment' 
AND source_id = 'settlement-id';

-- Check party balance
SELECT 
  party_id,
  SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END) as balance
FROM ledger_entries
WHERE party_id = 'party-id'
GROUP BY party_id;
```

## References

- Balance Logic: `BALANCE_LOGIC_DOCUMENTATION_INDEX.md`
- Ledger System: `src/modules/ledger/`
- Party Management: `src/modules/parties/`
- Frontend Components: `src/features/parties/components/`

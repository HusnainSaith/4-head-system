# Phase 3: Transactions - Quick Start Guide

## 🚀 Getting Started with Phase 3

This guide will help you quickly test and understand the Phase 3 transaction processing features.

---

## Prerequisites

1. ✅ Phase 1 completed (Core Infrastructure)
2. ✅ Phase 2 completed (Master Data)
3. ✅ Database running (PostgreSQL)
4. ✅ Environment configured (.env file)

---

## Setup

### 1. Install Dependencies
```bash
cd 4Head_backend
npm install
```

### 2. Run Migrations
```bash
npm run migration:run
```

This will create the stock balance triggers.

### 3. Start the Server
```bash
npm run start:dev
```

Server will start on `http://localhost:3000`

---

## Quick Test Scenarios

### Scenario 1: Simple Purchase Flow

#### Step 1: Create a Department
```bash
curl -X POST http://localhost:3000/departments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Supply Dept",
    "code": "SUP01",
    "type": "SUPPLY",
    "isActive": true
  }'
```

Save the `id` as `DEPT_ID`

#### Step 2: Create a Supplier
```bash
curl -X POST http://localhost:3000/suppliers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fresh Farms Supplier",
    "email": "supplier@freshfarms.com",
    "phoneNumber": "1234567890",
    "supplierType": "POULTRY_FARM",
    "status": "ACTIVE",
    "isActive": true
  }'
```

Save the `id` as `SUPPLIER_ID`

#### Step 3: Create a Product
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "productCode": "LCH001",
    "productName": "Live Chicken - Grade A",
    "category": "LIVE_CHICKEN",
    "uom": "KG",
    "isActive": true
  }'
```

Save the `id` as `PRODUCT_ID`

#### Step 4: Create Purchase (DRAFT)
```bash
curl -X POST http://localhost:3000/purchases \
  -H "Content-Type: application/json" \
  -d '{
    "voucherNumber": "PUR-001",
    "departmentId": "DEPT_ID",
    "supplierId": "SUPPLIER_ID",
    "productId": "PRODUCT_ID",
    "quantity": 100,
    "ratePerUnit": 150,
    "totalAmount": 15000,
    "taxAmount": 0,
    "paymentMode": "CREDIT",
    "purchaseDate": "2025-01-15",
    "status": "DRAFT"
  }'
```

Save the `id` as `PURCHASE_ID`

#### Step 5: Post Purchase (Triggers GL & Stock)
```bash
curl -X POST http://localhost:3000/purchases/PURCHASE_ID/post \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123"
  }'
```

#### Step 6: Check Stock Balance
```bash
curl http://localhost:3000/stock-balances/DEPT_ID/PRODUCT_ID
```

You should see `currentQuantity: 100`

#### Step 7: Check Journal Entries
```bash
curl http://localhost:3000/journal-entries?departmentId=DEPT_ID
```

You should see debit and credit entries for the purchase.

---

### Scenario 2: Simple Sale Flow

#### Step 1: Create a Customer
```bash
curl -X POST http://localhost:3000/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ABC Restaurant",
    "email": "orders@abcrestaurant.com",
    "phoneNumber": "9876543210",
    "customerType": "BUSINESS",
    "creditLimit": 50000,
    "status": "ACTIVE",
    "isActive": true
  }'
```

Save the `id` as `CUSTOMER_ID`

#### Step 2: Check Stock Availability
```bash
curl http://localhost:3000/stock-balances/check/DEPT_ID/PRODUCT_ID?quantity=50
```

Should return `{ "available": true, "currentQty": 100 }`

#### Step 3: Create Sale (DRAFT)
```bash
curl -X POST http://localhost:3000/sales \
  -H "Content-Type: application/json" \
  -d '{
    "voucherNumber": "SAL-001",
    "departmentId": "DEPT_ID",
    "customerId": "CUSTOMER_ID",
    "productId": "PRODUCT_ID",
    "quantity": 50,
    "ratePerUnit": 180,
    "totalAmount": 9000,
    "finalAmount": 9000,
    "taxAmount": 0,
    "paymentMode": "CASH",
    "saleDate": "2025-01-15",
    "status": "DRAFT"
  }'
```

Save the `id` as `SALE_ID`

#### Step 4: Post Sale (Triggers GL & Stock)
```bash
curl -X POST http://localhost:3000/sales/SALE_ID/post \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123"
  }'
```

#### Step 5: Verify Stock Reduced
```bash
curl http://localhost:3000/stock-balances/DEPT_ID/PRODUCT_ID
```

Should show `currentQuantity: 50` (100 - 50)

#### Step 6: Check Stock Movements
```bash
curl http://localhost:3000/stock-movements?productId=PRODUCT_ID
```

Should show:
- RECEIPT movement (+100) from purchase
- ISSUE movement (-50) from sale

---

### Scenario 3: Stock Balance Trigger Test

#### Step 1: Create Manual Stock Adjustment
```bash
curl -X POST http://localhost:3000/stock-movements \
  -H "Content-Type: application/json" \
  -d '{
    "departmentId": "DEPT_ID",
    "productId": "PRODUCT_ID",
    "movementType": "ADJUSTMENT",
    "quantity": 25,
    "costPerUnit": 150,
    "totalValue": 3750,
    "movementDate": "2025-01-15",
    "reference": "ADJ-001",
    "notes": "Manual stock correction"
  }'
```

#### Step 2: Check Balance Auto-Updated
```bash
curl http://localhost:3000/stock-balances/DEPT_ID/PRODUCT_ID
```

Should show `currentQuantity: 75` (50 + 25) - **Updated automatically by trigger!**

---

### Scenario 4: Set Minimum Stock Levels

#### Step 1: Get Stock Balance ID
```bash
curl http://localhost:3000/stock-balances?departmentId=DEPT_ID
```

Save the `id` of the balance record as `BALANCE_ID`

#### Step 2: Set Minimum Level
```bash
curl -X PATCH http://localhost:3000/stock-balances/BALANCE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "minimumLevel": 30,
    "maximumLevel": 500
  }'
```

#### Step 3: Create Sale That Goes Below Minimum
```bash
curl -X POST http://localhost:3000/sales \
  -H "Content-Type: application/json" \
  -d '{
    "voucherNumber": "SAL-002",
    "departmentId": "DEPT_ID",
    "customerId": "CUSTOMER_ID",
    "productId": "PRODUCT_ID",
    "quantity": 50,
    "ratePerUnit": 180,
    "totalAmount": 9000,
    "finalAmount": 9000,
    "paymentMode": "CASH",
    "saleDate": "2025-01-15",
    "status": "DRAFT"
  }'
```

Post it:
```bash
curl -X POST http://localhost:3000/sales/SALE_ID_2/post \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123"}'
```

Check database logs - trigger should raise notice about low stock!

---

## Testing

### Run Integration Tests
```bash
# Run Phase 3 tests
npm test -- phase3-transactions.integration.spec

# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

### Expected Test Results
- ✅ 28 integration tests should pass
- ✅ Purchase module: 8 tests
- ✅ Stock movement: 3 tests
- ✅ Sale module: 6 tests
- ✅ GL posting: 3 tests
- ✅ Automation: 2 tests
- ✅ Triggers: 2 tests
- ✅ Flows: 1 test
- ✅ Error handling: 3 tests

---

## Common API Endpoints

### Purchases
- `POST /purchases` - Create purchase
- `POST /purchases/:id/post` - Post purchase
- `GET /purchases` - List purchases
- `GET /purchases/:id` - Get purchase details
- `PATCH /purchases/:id` - Update purchase
- `DELETE /purchases/:id` - Delete purchase

### Sales
- `POST /sales` - Create sale
- `POST /sales/:id/post` - Post sale
- `GET /sales` - List sales
- `GET /sales/:id` - Get sale details
- `PATCH /sales/:id` - Update sale
- `DELETE /sales/:id` - Delete sale

### Stock
- `GET /stock-balances` - List all balances
- `GET /stock-balances/:deptId/:productId` - Get specific balance
- `GET /stock-movements` - List all movements
- `POST /stock-movements` - Create manual movement

### Accounting
- `GET /journal-entries` - List GL entries
- `GET /accounts` - List chart of accounts

---

## Key Business Rules

### Purchase Rules
1. ✅ Only DRAFT can be updated/deleted
2. ✅ POST creates GL entries and stock movements
3. ✅ Party must match department type
4. ✅ Voucher numbers are auto-generated

### Sale Rules
1. ✅ Stock must be available
2. ✅ Only DRAFT can be updated/deleted
3. ✅ POST creates GL entries and reduces stock
4. ✅ COGS calculated at weighted average

### Stock Rules
1. ✅ Cannot go negative
2. ✅ Balance auto-updates via trigger
3. ✅ Weighted average costing
4. ✅ Minimum level monitoring

---

## Troubleshooting

### Issue: Purchase not posting
**Check:**
- Is status DRAFT?
- Does department exist?
- Does supplier/party exist?
- Is product active?

### Issue: Sale rejected
**Check:**
- Is there enough stock?
- Run: `GET /stock-balances/check/:deptId/:productId?quantity=X`

### Issue: Stock balance not updating
**Check:**
- Are triggers installed? Run: `npm run migration:run`
- Check PostgreSQL logs for trigger errors

### Issue: GL entries not created
**Check:**
- Is transaction status POSTED?
- Check journal entries: `GET /journal-entries?departmentId=X`

---

## Database Verification

### Check Triggers Exist
```sql
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

Should show:
- `trigger_update_stock_balance` on `stock_movements`
- `trigger_check_minimum_stock` on `stock_balances`

### Check Stock Balance
```sql
SELECT sb.*, p.productName, d.name as departmentName
FROM stock_balances sb
JOIN products p ON p.id = sb."productId"
JOIN departments d ON d.id = sb."departmentId";
```

### Check Journal Entries Balance
```sql
SELECT 
  "departmentId",
  SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as total_debit,
  SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as total_credit
FROM journal_entries
GROUP BY "departmentId"
HAVING SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) != 
       SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END);
```

Should return 0 rows (all balanced)

---

## API Testing with Postman

### Import Collection
Create a Postman collection with these requests:

**Environment Variables:**
- `baseUrl`: `http://localhost:3000`
- `deptId`: (from create department response)
- `supplierId`: (from create supplier response)
- `customerId`: (from create customer response)
- `productId`: (from create product response)

**Collection Structure:**
```
Phase 3 - Transactions
├── Setup
│   ├── Create Department
│   ├── Create Supplier
│   ├── Create Customer
│   └── Create Product
├── Purchases
│   ├── Create Purchase
│   ├── Post Purchase
│   ├── Get Purchase
│   └── List Purchases
├── Sales
│   ├── Check Stock
│   ├── Create Sale
│   ├── Post Sale
│   └── List Sales
└── Stock & GL
    ├── Get Stock Balance
    ├── Get Stock Movements
    └── Get Journal Entries
```

---

## Performance Tips

1. **Batch Operations**: Use database transactions for bulk operations
2. **Indexing**: Ensure foreign keys are indexed (already done)
3. **Query Optimization**: Use filters when listing (departmentId, status)
4. **Caching**: Consider caching stock balances for read-heavy scenarios

---

## Next Steps

After completing Phase 3 testing:

1. ✅ Verify all 28 tests pass
2. ✅ Test with your own business scenarios
3. ✅ Validate GL entries balance
4. ✅ Verify stock movements are accurate
5. ✅ Check trigger functionality
6. 📋 Plan Phase 4 features (returns, reports, payments)

---

## Support

For issues or questions:
1. Check logs: `tail -f logs/app.log`
2. Check database: PostgreSQL logs
3. Review test output: `npm test -- --verbose`
4. Refer to: `PHASE3_COMPLETION_REPORT.md`

---

## Summary

Phase 3 provides:
- ✅ Complete purchase processing with GL integration
- ✅ Complete sales processing with stock validation
- ✅ Automatic stock movements
- ✅ Real-time balance updates via triggers
- ✅ Double-entry bookkeeping
- ✅ Weighted average costing

**You're ready to process transactions!** 🎉

---

**Last Updated:** January 2025  
**Version:** 3.0.0

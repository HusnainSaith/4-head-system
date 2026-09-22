# Phase 7 Quick Start Guide

## Accounting & Reporting Completion

---

## Prerequisites

- Phase 1-6 completed
- Database running
- Auth credentials available

---

## Quick Test

```bash
# Windows
test-phase7.bat

# Unix/Linux/macOS
chmod +x test-phase7.sh
./test-phase7.sh
```

---

## API Usage Examples

### 1. Trial Balance

```bash
# Get current trial balance
curl -X GET http://localhost:3000/reports/trial-balance \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get trial balance by department
curl -X GET "http://localhost:3000/reports/trial-balance?departmentId=DEPT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get trial balance with date range
curl -X GET "http://localhost:3000/reports/trial-balance?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. General Ledger

```bash
# Get complete general ledger
curl -X GET http://localhost:3000/reports/general-ledger \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get general ledger for specific account
curl -X GET "http://localhost:3000/reports/general-ledger?accountId=ACCOUNT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get general ledger with filters
curl -X GET "http://localhost:3000/reports/general-ledger?accountId=ACCOUNT_ID&departmentId=DEPT_ID&startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Cash Book

```bash
# Get cash book
curl -X GET http://localhost:3000/reports/cash-book \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get cash book by department
curl -X GET "http://localhost:3000/reports/cash-book?departmentId=DEPT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Bank Book

```bash
# Get bank book
curl -X GET http://localhost:3000/reports/bank-book \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get bank book with date range
curl -X GET "http://localhost:3000/reports/bank-book?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. Purchase Register

```bash
# Get purchase register
curl -X GET "http://localhost:3000/reports/purchase-register?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get purchase register by supplier
curl -X GET "http://localhost:3000/reports/purchase-register?startDate=2024-01-01&endDate=2024-12-31&supplierId=SUPPLIER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get purchase register by department
curl -X GET "http://localhost:3000/reports/purchase-register?startDate=2024-01-01&endDate=2024-12-31&departmentId=DEPT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 6. Sales Register

```bash
# Get sales register
curl -X GET "http://localhost:3000/reports/sales-register?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get sales register by customer
curl -X GET "http://localhost:3000/reports/sales-register?startDate=2024-01-01&endDate=2024-12-31&customerId=CUSTOMER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 7. Customer Statement

```bash
# Get customer statement
curl -X GET http://localhost:3000/reports/customer-statement/CUSTOMER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get customer statement with date range
curl -X GET "http://localhost:3000/reports/customer-statement/CUSTOMER_ID?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 8. Supplier Statement

```bash
# Get supplier statement
curl -X GET http://localhost:3000/reports/supplier-statement/SUPPLIER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get supplier statement with date range
curl -X GET "http://localhost:3000/reports/supplier-statement/SUPPLIER_ID?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 9. Party Ledger

```bash
# Get customer ledger
curl -X GET http://localhost:3000/reports/party-ledger/CUSTOMER/CUSTOMER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get supplier ledger
curl -X GET http://localhost:3000/reports/party-ledger/SUPPLIER/SUPPLIER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 10. Department Profit & Loss

```bash
# Get department P&L
curl -X GET "http://localhost:3000/reports/profit-loss/department/DEPT_ID?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get comparative P&L (multiple departments)
curl -X GET "http://localhost:3000/reports/profit-loss/comparative?departmentIds=DEPT1_ID,DEPT2_ID&startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 11. Journal Entry Reversal

```bash
# Reverse a journal entry
curl -X POST http://localhost:3000/accounting/journal-entries/JV-001-2025/reverse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reversalDate": "2025-01-20",
    "postingUserId": "USER_ID"
  }'
```

---

## Common Workflows

### Generate Month-End Reports

```bash
# 1. Trial Balance
curl -X GET "http://localhost:3000/reports/trial-balance?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Purchase Register
curl -X GET "http://localhost:3000/reports/purchase-register?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Sales Register
curl -X GET "http://localhost:3000/reports/sales-register?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Department P&L
curl -X GET "http://localhost:3000/reports/profit-loss/department/DEPT_ID?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Customer Reconciliation

```bash
# 1. Get customer statement
curl -X GET http://localhost:3000/reports/customer-statement/CUSTOMER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Verify outstanding balance
# Check currentBalance field in response
```

---

### Supplier Reconciliation

```bash
# 1. Get supplier statement
curl -X GET http://localhost:3000/reports/supplier-statement/SUPPLIER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Verify outstanding balance
# Check currentBalance field in response
```

---

## Response Examples

### Trial Balance Response
```json
{
  "accounts": [
    {
      "accountCode": "1000",
      "accountName": "Cash",
      "accountType": "ASSET",
      "debit": 50000,
      "credit": 30000,
      "balance": 20000
    }
  ],
  "totalDebits": 100000,
  "totalCredits": 100000,
  "isBalanced": true
}
```

### Customer Statement Response
```json
{
  "transactions": [
    {
      "date": "2025-01-15",
      "type": "SALE",
      "reference": "SAL-001-2025",
      "debit": 5000,
      "credit": 0,
      "balance": 5000
    },
    {
      "date": "2025-01-20",
      "type": "PAYMENT",
      "reference": "PMT-001",
      "debit": 0,
      "credit": 3000,
      "balance": 2000
    }
  ],
  "currentBalance": 2000
}
```

### Department P&L Response
```json
{
  "revenue": 100000,
  "costOfGoodsSold": 60000,
  "grossProfit": 40000,
  "expenses": 15000,
  "netProfit": 25000
}
```

---

## Troubleshooting

### Trial Balance Not Balanced
- Check for unposted journal entries
- Verify all transactions have matching debit/credit
- Review journal entry reversal status

### Empty Reports
- Verify date range includes transactions
- Check department filter is correct
- Ensure transactions are POSTED status

### Missing Transactions
- Verify transaction status is POSTED
- Check deletedAt is null
- Confirm date range includes transaction date

---

## Next Steps

After Phase 7, proceed to:
- **Phase 8:** Advanced Inventory & Fleet Features
- **Phase 9:** Security, Audit & Controls
- **Phase 10:** Department-Specific Features

---

## Support

For issues or questions:
1. Check test results: `test-phase7.bat` or `./test-phase7.sh`
2. Review logs in console output
3. Verify database connectivity
4. Check authentication token validity

---

**Last Updated:** January 2025

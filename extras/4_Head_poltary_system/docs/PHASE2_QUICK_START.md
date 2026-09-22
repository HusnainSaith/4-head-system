# Phase 2: Master Data - Quick Start Guide

## Overview

This guide helps you quickly set up and test the Phase 2 master data implementation.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ running
- Environment variables configured (`.env` file)

## Quick Start

### 1. Install Dependencies (if not already done)

```bash
cd 4Head_backend
npm install
```

### 2. Reset Database

**Important**: Always reset the database before running tests to avoid duplicate key constraint violations.

```bash
npm run migration:revert
npm run migration:run
```

### 3. Run Phase 2 Tests

```bash
npm run test:modules -- test/integration/phase2-master-data.integration.spec.ts
```

### Expected Output

```
PASS test/integration/phase2-master-data.integration.spec.ts

Phase 2: Master Data Integration Tests
  Customer Module
    ✓ should create a new customer
    ✓ should not create duplicate customer email
    ✓ should get all customers
    ✓ should search customers
    ✓ should get customer by email
    ✓ should check credit limit
    ✓ should update customer
    ✓ should block customer
    ✓ should activate customer
  Supplier Module
    ✓ should create a new supplier
    ✓ should get all suppliers
    ✓ should filter suppliers by type
    ✓ should update supplier
  Broker Module
    ✓ should create a new broker
    ✓ should get all brokers
    ✓ should update broker
  Employee Module
    ✓ should create a new employee
    ✓ should get all employees
    ✓ should filter employees by department
    ✓ should get employee by employee ID
  Worker Module
    ✓ should create a new worker
    ✓ should get all workers
  Shop Owner Module
    ✓ should create a new shop owner
    ✓ should get all shop owners
    ✓ should search shop owners
  Farm Owner Module
    ✓ should create a new farm owner
    ✓ should get all farm owners
  Party Validation Service
    ✓ should get allowed parties for BROKERAGE department
    ✓ should validate broker for BROKERAGE department
    ✓ should validate customer for BROKERAGE department
  Integration Scenarios
    ✓ should create complete brokerage transaction flow
  Cleanup
    ✓ should delete customer
    ✓ should delete supplier
    ✓ should delete broker
    ✓ should delete employee
    ✓ should delete worker
    ✓ should delete shop owner
    ✓ should delete farm owner

Test Suites: 1 passed, 1 total
Tests:       38 passed, 38 total
```

## API Testing with Postman/cURL

### Start Development Server

```bash
npm run start:dev
```

The server will start on `http://localhost:3000`

### Example API Calls

#### 1. Create a Customer

```bash
curl -X POST http://localhost:3000/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "1234567890",
    "customerType": "INDIVIDUAL",
    "creditLimit": 50000,
    "status": "ACTIVE",
    "isActive": true
  }'
```

#### 2. List All Customers

```bash
curl http://localhost:3000/customers
```

#### 3. Search Customers

```bash
curl "http://localhost:3000/customers/search?q=John"
```

#### 4. Create a Supplier

```bash
curl -X POST http://localhost:3000/suppliers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ABC Poultry Farm",
    "email": "contact@abcfarm.com",
    "phoneNumber": "9876543210",
    "supplierType": "POULTRY_FARM",
    "status": "ACTIVE",
    "isActive": true
  }'
```

#### 5. Get Allowed Parties for Department

First, create a department:

```bash
curl -X POST http://localhost:3000/departments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Brokerage Department",
    "code": "BRK",
    "type": "BROKERAGE",
    "isActive": true
  }'
```

Then get allowed parties (replace `{departmentId}` with actual ID):

```bash
curl http://localhost:3000/party-validation/allowed-parties/{departmentId}
```

Expected response:
```json
["BROKER", "FARM_OWNER", "CUSTOMER", "SHOP_OWNER"]
```

## Swagger Documentation

Access interactive API documentation at:

```
http://localhost:3000/api
```

## Troubleshooting

### Problem: Tests Fail with "duplicate key value violates unique constraint"

**Solution**: Reset the database before running tests:

```bash
npm run migration:revert
npm run migration:run
```

### Problem: "Department not found" error

**Solution**: Create the department first or use an existing department ID from the test setup.

### Problem: Database connection error

**Solution**: Check your `.env` file and ensure PostgreSQL is running:

```bash
# Check PostgreSQL status (Windows)
sc query postgresql-x64-14

# Start PostgreSQL (Windows)
net start postgresql-x64-14
```

### Problem: Port 3000 already in use

**Solution**: Kill the process using port 3000 or change the port in `.env`:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## Module Structure

```
src/modules/master-data/
├── entities/          # 7 entity files (Customer, Supplier, etc.)
├── dto/              # 14 DTO files (Create/Update for each entity)
├── *.service.ts      # 8 service files (business logic)
├── *.controller.ts   # 8 controller files (API endpoints)
└── master-data.module.ts
```

## Key Features Implemented

### All Master Data Modules Include:
- ✅ CRUD operations
- ✅ Search functionality
- ✅ Soft delete support
- ✅ Activate/Deactivate
- ✅ Validation on inputs
- ✅ Error handling
- ✅ Swagger documentation

### Party Validation:
- ✅ Department-specific party type validation
- ✅ Business rules enforcement
- ✅ Active status checking
- ✅ Block status checking

## Next Steps

After Phase 2 is complete and tested:

1. **Review the implementation**
   - Check the completion report: `docs/PHASE2_COMPLETION_REPORT.md`
   - Review API documentation at `/api`

2. **Proceed to Phase 3**
   - Transaction management
   - Inventory tracking
   - Fleet integration

3. **Add seed data** (optional)
   ```bash
   npm run seed
   ```

## Common Commands

```bash
# Development
npm run start:dev              # Start development server
npm run build                  # Build for production
npm run lint                   # Check code style

# Database
npm run migration:generate     # Generate new migration
npm run migration:run          # Run pending migrations
npm run migration:revert       # Revert last migration
npm run seed                   # Run seed data

# Testing
npm run test                   # Run all tests
npm run test:modules          # Run integration tests
npm run test:cov              # Run with coverage
npm run test:watch            # Run in watch mode
```

## Support

For issues or questions:
1. Check the completion report: `docs/PHASE2_COMPLETION_REPORT.md`
2. Review test files: `test/integration/phase2-master-data.integration.spec.ts`
3. Check entity definitions: `src/modules/master-data/entities/`

---

**Phase 2 Status**: ✅ COMPLETE
**Ready for**: Phase 3 (Transaction Management)

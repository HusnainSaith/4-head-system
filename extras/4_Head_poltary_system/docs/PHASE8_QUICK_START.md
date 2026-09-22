# Phase 8 Quick Start Guide

## Advanced Inventory & Fleet Features

---

## Prerequisites

1. Database is running (PostgreSQL)
2. Application is started (`npm run start:dev`)
3. You have authentication token
4. You have created: department, product, vehicle, and user with driver role

---

## Quick Test Commands

### 1. Batch/Lot Tracking

#### Create a Batch
```bash
curl -X POST http://localhost:3000/inventory/batches \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchNumber": "BATCH-001",
    "productId": "PRODUCT_ID",
    "departmentId": "DEPT_ID",
    "manufacturingDate": "2025-01-01",
    "expiryDate": "2025-02-01",
    "initialQuantity": 100,
    "currentQuantity": 100,
    "costPerUnit": 150,
    "status": "AVAILABLE",
    "temperatureAtReceipt": 4
  }'
```

#### Get Batches Expiring Soon
```bash
curl -X GET "http://localhost:3000/inventory/batches/expiring-soon?daysAhead=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Quarantine a Batch
```bash
curl -X POST http://localhost:3000/inventory/batches/BATCH_ID/quarantine \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Quality issue detected"}'
```

---

### 2. Temperature Monitoring

#### Record Temperature
```bash
curl -X POST http://localhost:3000/inventory/temperature-logs/record \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "BATCH_ID",
    "recordedTemp": 5.5,
    "threshold": 4.0
  }'
```

#### Get Temperature Alerts
```bash
curl -X GET http://localhost:3000/inventory/temperature-logs/alerts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Quality Inspection

#### Create Quality Inspection
```bash
curl -X POST http://localhost:3000/inventory/quality-inspections \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "BATCH_ID",
    "inspectorUserId": "USER_ID",
    "status": "PASSED",
    "remarks": "Good quality, meets standards",
    "temperatureReading": 4.5,
    "qualityGrade": "A"
  }'
```

#### Get Inspections by Batch
```bash
curl -X GET http://localhost:3000/inventory/quality-inspections/batch/BATCH_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Inventory Valuation Methods

#### FIFO Valuation
```bash
curl -X GET "http://localhost:3000/stock-balances/valuation/DEPT_ID/PRODUCT_ID?method=FIFO" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### LIFO Valuation
```bash
curl -X GET "http://localhost:3000/stock-balances/valuation/DEPT_ID/PRODUCT_ID?method=LIFO" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Compare All Methods
```bash
curl -X GET http://localhost:3000/stock-balances/valuation-comparison/DEPT_ID/PRODUCT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get All Valuations
```bash
curl -X GET "http://localhost:3000/stock-balances/valuations/all?method=FIFO" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. Insurance Policy Management

#### Create Insurance Policy
```bash
curl -X POST http://localhost:3000/fleet/insurance-policies \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "VEHICLE_ID",
    "policyNumber": "POL-2025-001",
    "provider": "ABC Insurance",
    "startDate": "2025-01-01",
    "endDate": "2026-01-01",
    "premium": 15000,
    "coverageAmount": 500000,
    "status": "ACTIVE"
  }'
```

#### Get Expiring Insurance Policies
```bash
curl -X GET "http://localhost:3000/fleet/insurance-policies/expiring-soon?daysAhead=60" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 6. Vehicle Document Management

#### Create Vehicle Document
```bash
curl -X POST http://localhost:3000/fleet/vehicle-documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "VEHICLE_ID",
    "documentType": "FITNESS",
    "documentNumber": "FIT-2025-001",
    "issueDate": "2025-01-01",
    "expiryDate": "2026-01-01",
    "issuingAuthority": "RTO Mumbai",
    "status": "VALID"
  }'
```

#### Get Expiring Documents
```bash
curl -X GET "http://localhost:3000/fleet/vehicle-documents/expiring-soon?daysAhead=60" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 7. Driver License Management

#### Create Driver License
```bash
curl -X POST http://localhost:3000/fleet/driver-licenses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "DRIVER_USER_ID",
    "licenseNumber": "DL-MH-2025-001",
    "licenseType": "HEAVY_VEHICLE",
    "issueDate": "2020-01-01",
    "expiryDate": "2030-01-01",
    "issuingAuthority": "RTO Mumbai",
    "status": "VALID"
  }'
```

#### Get Expiring Licenses
```bash
curl -X GET "http://localhost:3000/fleet/driver-licenses/expiring-soon?daysAhead=90" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 8. Fleet Reports

#### Fuel Efficiency Report
```bash
curl -X GET "http://localhost:3000/reports/fleet/fuel-efficiency?startDate=2024-12-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Maintenance Cost Report
```bash
curl -X GET "http://localhost:3000/reports/fleet/maintenance-cost?startDate=2024-12-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Trip Analysis by Vehicle
```bash
curl -X GET http://localhost:3000/reports/fleet/trip-analysis/vehicle/VEHICLE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Trip Analysis by Driver
```bash
curl -X GET http://localhost:3000/reports/fleet/trip-analysis/driver/DRIVER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Vehicle Downtime Report
```bash
curl -X GET "http://localhost:3000/reports/fleet/vehicle-downtime?startDate=2024-12-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Running Integration Tests

### Run All Phase 8 Tests
```bash
# Windows
test-phase8.bat

# Or using npm
npm run test:e2e -- test/integration/phase8.spec.ts
```

### Expected Output
```
Phase 8: Advanced Inventory & Fleet Features (e2e)
  8.1 Batch/Lot Tracking Enhancement
    ✓ should create a batch with expiry tracking
    ✓ should get all batches
    ✓ should get batches expiring soon
    ✓ should get expired batches
    ✓ should quarantine a batch
  8.2 Temperature & Quality Tracking
    ✓ should record temperature log
    ✓ should get temperature alerts
    ✓ should create quality inspection
    ✓ should get quality inspections by batch
  8.3 Inventory Valuation Methods
    ✓ should get valuation using WEIGHTED_AVERAGE method
    ✓ should get valuation using FIFO method
    ✓ should get valuation using LIFO method
    ✓ should compare valuation methods
    ✓ should get all inventory valuations
  8.4 Complete Fleet Management
    ✓ should create insurance policy
    ✓ should get insurance policies expiring soon
    ✓ should create vehicle document
    ✓ should get vehicle documents expiring soon
    ✓ should create driver license
    ✓ should get driver licenses expiring soon
    ✓ should get fuel efficiency report
    ✓ should get maintenance cost report
    ✓ should get trip analysis by vehicle
    ✓ should get trip analysis by driver
    ✓ should get vehicle downtime report

Test Suites: 1 passed, 1 total
Tests:       31 passed, 31 total
```

---

## Testing Workflow

### 1. Setup Test Data
```bash
# Login and get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@4head.com", "password": "Admin@123"}'

# Get departments
curl -X GET http://localhost:3000/departments \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get products
curl -X GET http://localhost:3000/products \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get vehicles
curl -X GET http://localhost:3000/vehicles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Create Batch with Expiry
- Use the batch creation endpoint
- Set expiry date 30 days from today
- Record initial temperature

### 3. Record Temperature Logs
- Record temperature at different times
- Test threshold violations
- Check alerts

### 4. Perform Quality Inspection
- Create inspection record
- Test PASSED/FAILED status
- Verify automatic quarantine on failure

### 5. Compare Valuation Methods
- Create multiple batches at different costs
- Compare FIFO vs LIFO vs Weighted Average
- Analyze differences

### 6. Test Fleet Management
- Create insurance policies with different expiry dates
- Add vehicle documents (fitness, registration)
- Add driver licenses
- Test expiry alerts

### 7. Generate Reports
- Fuel efficiency by vehicle
- Maintenance costs
- Trip analysis
- Downtime calculation

---

## Common Use Cases

### Use Case 1: Batch Expiry Management
```
1. Create batches with expiry dates
2. Query expiring-soon batches (30 days)
3. Plan clearance sales or usage
4. Mark expired batches
```

### Use Case 2: Quality Control Workflow
```
1. Receive batch with temperature recording
2. Perform quality inspection
3. If failed → automatic quarantine
4. If passed → mark as available
5. Track inspection history
```

### Use Case 3: Inventory Valuation Analysis
```
1. Get current stock
2. Compare FIFO vs LIFO valuation
3. Analyze impact on P&L
4. Choose optimal method for tax planning
```

### Use Case 4: Fleet Compliance
```
1. Track insurance expiry dates
2. Monitor vehicle document validity
3. Check driver license status
4. Get alerts 60 days before expiry
5. Plan renewals
```

### Use Case 5: Fleet Performance Analysis
```
1. Generate fuel efficiency report
2. Identify inefficient vehicles
3. Calculate cost per km
4. Analyze trip patterns
5. Optimize routes and vehicle allocation
```

---

## Troubleshooting

### Batch Not Created
- Check product and department IDs are valid
- Ensure expiry date is after manufacturing date
- Verify quantity is positive

### Temperature Alert Not Showing
- Check if temperature difference exceeds thresholds
  - WARNING: >2 degrees from threshold
  - CRITICAL: >5 degrees from threshold
- Verify logs are within last 24 hours

### Valuation Returns Zero
- Ensure stock balance exists for department+product
- Check if batches are available (not expired/depleted)
- Verify cost per unit is set in batches

### Fleet Reports Empty
- Check if date range contains data
- Verify vehicle/driver IDs exist
- Ensure trip/fuel/maintenance logs are created

---

## Best Practices

### Batch Management
1. Always set expiry dates for perishable items
2. Record temperature at receipt
3. Perform quality inspections regularly
4. Act on expiring-soon alerts promptly

### Temperature Monitoring
1. Set appropriate thresholds per product type
2. Record temperature at critical points (receipt, storage, dispatch)
3. Monitor alerts daily
4. Take corrective action on CRITICAL status

### Inventory Valuation
1. Use FIFO for accurate cost matching
2. Use LIFO for tax optimization (where allowed)
3. Use WEIGHTED_AVERAGE for simplicity
4. Compare methods quarterly

### Fleet Management
1. Add all documents and licenses upfront
2. Set expiry alert thresholds (30-90 days)
3. Review expiring-soon reports weekly
4. Plan renewals in advance
5. Generate performance reports monthly

---

## API Response Examples

### Batch Valuation Comparison
```json
{
  "productId": "uuid",
  "departmentId": "uuid",
  "FIFO": {
    "quantity": 500,
    "value": 75000,
    "averageRate": 150
  },
  "LIFO": {
    "quantity": 500,
    "value": 77500,
    "averageRate": 155
  },
  "WEIGHTED_AVERAGE": {
    "quantity": 500,
    "value": 76250,
    "averageRate": 152.5
  },
  "difference": {
    "fifoVsLifo": -2500,
    "fifoVsWeighted": -1250,
    "lifoVsWeighted": 1250
  }
}
```

### Fuel Efficiency Report
```json
[
  {
    "vehicleId": "uuid",
    "vehicleName": "MH-01-AB-1234",
    "totalFuel": 250,
    "totalCost": 25000,
    "totalDistance": 2500,
    "fuelEfficiency": 10,
    "costPerKm": 10
  }
]
```

### Vehicle Downtime Report
```json
[
  {
    "vehicleId": "uuid",
    "registrationNumber": "MH-01-AB-1234",
    "department": "Supply",
    "totalDays": 30,
    "maintenanceDays": 3,
    "uptimePercentage": 90,
    "status": "ACTIVE"
  }
]
```

---

## Next Steps

After completing Phase 8 testing:

1. **Review Reports**
   - Check all fleet reports for data accuracy
   - Verify valuation comparisons
   - Analyze batch expiry patterns

2. **Plan Phase 9**
   - Audit trail integration
   - RBAC enforcement
   - Maker-checker workflows

3. **User Training**
   - Train on batch tracking workflow
   - Demonstrate temperature monitoring
   - Show fleet management features

---

## Support & Documentation

- **Full Documentation:** `docs/PHASE8_COMPLETION_REPORT.md`
- **Test Suite:** `test/integration/phase8.spec.ts`
- **API Endpoints:** See completion report for full list

---

**Last Updated:** January 2025  
**Version:** 1.0

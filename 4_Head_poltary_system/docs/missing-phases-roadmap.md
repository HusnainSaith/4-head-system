# Missing Phases Roadmap - 4Head Poultry ERP

## Document Version: 1.0
**Status:** Implementation Roadmap
**Last Updated:** January 2025

---

## Overview

This document outlines all remaining work to achieve 100% SRS compliance. The system currently has Phases 1-4 complete (70% overall). This roadmap covers Phases 5-9.

---

## PHASE 5: Core Transactions Completion

**Objective:** Complete all transaction types and workflows per SRS requirements

**Duration:** 2-3 weeks

### 5.1 Return Transactions (FR-075)
**Priority:** High

**Tasks:**
- Implement Purchase Return Service
  - Link to original purchase transaction
  - Reverse inventory movement
  - Reverse GL entries
  - Update party balance (reduce payable)
  - Support partial and full returns
  - Reason tracking

- Implement Sale Return Service
  - Link to original sale transaction
  - Reverse inventory movement (return to stock)
  - Reverse GL entries
  - Update party balance (reduce receivable)
  - Support partial and full returns
  - Quality issue tracking

**API Endpoints:**
```
POST   /returns
POST   /returns/:id/post
GET    /returns
GET    /returns/:id
GET    /returns/purchase/:purchaseId
GET    /returns/sale/:saleId
PATCH  /returns/:id/cancel
```

**Deliverables:**
- Return entity (already exists, needs service)
- ReturnService with GL reversal logic
- ReturnController with validation
- Integration tests (10 tests)

---

### 5.2 Adjustment Transactions (FR-063)
**Priority:** High

**Tasks:**
- Implement Stock Adjustment Service
  - Manual quantity corrections
  - Shrinkage recording
  - Spoilage tracking
  - Write-off for damaged/expired stock
  - Temperature-related loss recording
  - Approval workflow integration
  - GL impact (adjust inventory value)

**Adjustment Types:**
- INCREASE - Add quantity
- DECREASE - Remove quantity
- RECOUNT - Physical count correction
- DAMAGE - Damaged stock write-off
- EXPIRY - Expired stock write-off
- SPOILAGE - Temperature/quality loss
- SHRINKAGE - Handling loss

**API Endpoints:**
```
POST   /adjustments
POST   /adjustments/:id/submit
POST   /adjustments/:id/approve
POST   /adjustments/:id/post
GET    /adjustments
GET    /adjustments/:id
GET    /adjustments/pending-approval
PATCH  /adjustments/:id/reject
```

**Deliverables:**
- Adjustment entity (already exists, needs service)
- AdjustmentService with approval workflow
- AdjustmentController
- Integration with StockMovement
- Integration tests (8 tests)

---

### 5.3 Transfer Transactions (FR-063)
**Priority:** Medium

**Tasks:**
- Implement Inter-Department Transfer Service
  - Transfer between departments
  - Dual stock movement (issue from source, receipt at destination)
  - Transfer-in-transit tracking
  - Approval workflow
  - Vehicle/trip linkage (optional)

**API Endpoints:**
```
POST   /transfers
POST   /transfers/:id/submit
POST   /transfers/:id/approve
POST   /transfers/:id/dispatch
POST   /transfers/:id/receive
GET    /transfers
GET    /transfers/:id
GET    /transfers/in-transit
```

**Deliverables:**
- Transfer entity (new)
- TransferService
- TransferController
- Integration tests (6 tests)

---

### 5.4 Credit Note / Debit Note (FR-075)
**Priority:** Medium

**Tasks:**
- Implement Credit Note (for sale returns/adjustments)
- Implement Debit Note (for purchase returns/adjustments)
- Link to original invoices
- Adjust party balances
- GL posting

**API Endpoints:**
```
POST   /credit-notes
POST   /debit-notes
GET    /credit-notes
GET    /debit-notes
GET    /credit-notes/:id
GET    /debit-notes/:id
```

**Deliverables:**
- CreditNote entity (new)
- DebitNote entity (new)
- Services and controllers
- Integration tests (8 tests)

---

## PHASE 6: Personnel Management Consolidation

**Objective:** Consolidate Employee/Worker tables into User table with role-based management

**Duration:** 1-2 weeks

### 6.1 User Table Enhancement (FR-010, FR-011)
**Priority:** Critical

**Tasks:**
- Extend User entity with personnel fields:
  - employeeId (unique identifier)
  - departmentId (FK to Department)
  - designation
  - salary (monthly)
  - dailyWage
  - bankAccountName
  - bankAccountNumber
  - bankName
  - joiningDate
  - resignationDate
  - Address fields (street, city, state, postalCode, country)
  - Emergency contact fields

- Add user types via roles:
  - ROLE: ADMIN, ACCOUNTANT, MANAGER, DATA_ENTRY, EMPLOYEE, WORKER, DRIVER, AUDITOR

- Migrate existing Employee data to User table
- Migrate existing Worker data to User table
- Remove Employee and Worker tables

**API Endpoints (Enhanced):**
```
GET    /users?departmentId=X&role=EMPLOYEE
GET    /users/employees
GET    /users/workers
GET    /users/drivers
GET    /users/:id/salary-details
PATCH  /users/:id/assign-department
PATCH  /users/:id/update-salary
POST   /users/:id/resignation
```

**Deliverables:**
- Updated User entity with all personnel fields
- Migration script to merge Employee/Worker into User
- Updated UserService with department filtering
- Updated DTOs
- Integration tests (12 tests)

---

### 6.2 Salary Management (New Feature - SRS Extension)
**Priority:** High

**Tasks:**
- Salary configuration per user
- Salary history tracking
- Salary payment recording
- Advance salary management
- Deduction management
- Payslip generation (basic)

**Entities:**
- SalaryConfiguration (userId, effectiveDate, amount, currency)
- SalaryPayment (userId, period, amount, paymentDate, status)
- SalaryAdvance (userId, amount, reason, status, recoverySchedule)
- SalaryDeduction (userId, type, amount, reason)

**API Endpoints:**
```
POST   /salary/configurations
GET    /salary/configurations/:userId
POST   /salary/payments
GET    /salary/payments
GET    /salary/payments/:userId
POST   /salary/advances
GET    /salary/advances/:userId
POST   /salary/deductions
GET    /salary/payslip/:paymentId
```

**Deliverables:**
- 4 new entities
- SalaryManagementService
- SalaryController
- Integration with accounting (GL posting)
- Integration tests (10 tests)

---

## PHASE 7: Accounting & Reporting Completion

**Objective:** Complete all accounting reports and controls per SRS

**Duration:** 2-3 weeks

### 7.1 Core Accounting Reports (FR-100 to FR-108)
**Priority:** High

**Tasks:**

#### 7.1.1 Trial Balance Report (FR-078)
- Account-wise debit/credit totals
- Date range filtering
- Department-wise filtering
- Opening balances
- Current period transactions
- Closing balances
- Balance verification (DR = CR)

#### 7.1.2 General Ledger Report (FR-101)
- Account-wise transaction listing
- Date range filtering
- Running balance
- Voucher reference
- Department filtering
- Transaction type filtering
- Export to Excel/PDF

#### 7.1.3 Cash Book Report (FR-101)
- Cash account transactions only
- Date range filtering
- Opening balance
- Receipts (debits)
- Payments (credits)
- Closing balance
- Department filtering

#### 7.1.4 Bank Book Report (FR-101)
- Bank account transactions only
- Multiple bank accounts support
- Date range filtering
- Reconciliation status
- Check number tracking

#### 7.1.5 Purchase Register (FR-102)
- All purchase transactions
- Party-wise grouping
- Product-wise grouping
- Date range filtering
- Department filtering
- Tax summary
- Payment status
- Export functionality

#### 7.1.6 Sales Register (FR-102)
- All sales transactions
- Customer-wise grouping
- Product-wise grouping
- Date range filtering
- Department filtering
- Tax summary
- Payment status
- Export functionality

#### 7.1.7 Customer Statement (FR-103)
- Opening balance
- Invoice-wise details
- Payment-wise details
- Running balance
- Aging analysis (current, 30d, 60d, 90d+)
- Credit limit vs outstanding

#### 7.1.8 Supplier Statement (FR-103)
- Opening balance
- Purchase-wise details
- Payment-wise details
- Running balance
- Aging analysis

#### 7.1.9 Party-wise Ledger (All Party Types)
- Broker ledger
- Shop Owner ledger
- Farm Owner ledger

**API Endpoints:**
```
GET    /reports/trial-balance
GET    /reports/general-ledger
GET    /reports/cash-book
GET    /reports/bank-book
GET    /reports/purchase-register
GET    /reports/sales-register
GET    /reports/customer-statement/:customerId
GET    /reports/supplier-statement/:supplierId
GET    /reports/party-ledger/:partyType/:partyId
GET    /reports/aging-analysis
```

**Deliverables:**
- Enhanced ReportingService with 9+ new reports
- Updated ReportingController
- Export functionality (PDF/Excel)
- Integration tests (15 tests)

---

### 7.2 Department-wise Profit & Loss (FR-077, FR-100)
**Priority:** High

**Tasks:**
- Enhanced P&L report with department breakdown
- Revenue by department
- COGS by department
- Expenses by department
- Gross profit by department
- Net profit by department
- Comparative analysis (month-over-month, year-over-year)

**API Endpoints:**
```
GET    /reports/profit-loss/department/:departmentId
GET    /reports/profit-loss/comparative
GET    /reports/profit-loss/consolidated
```

**Deliverables:**
- Enhanced P&L reporting
- Department comparison reports
- Integration tests (5 tests)

---

### 7.3 Period-End Closing (FR-078)
**Priority:** Medium

**Tasks:**
- Month-end closing process
- Year-end closing process
- Closing entries generation
- Transfer profit/loss to equity
- Lock closed periods (prevent edits)
- Closing checklist
- Opening balance for next period

**Entities:**
- PeriodClose (period, year, month, status, closedBy, closedAt)

**API Endpoints:**
```
POST   /accounting/period-close
GET    /accounting/period-close/current
GET    /accounting/period-close/history
POST   /accounting/period-close/:id/reopen
```

**Deliverables:**
- PeriodClose entity
- PeriodCloseService
- Controller with approval workflow
- Integration tests (6 tests)

---

### 7.4 Reversal Journal Entries (FR-075, FR-112)
**Priority:** Medium

**Tasks:**
- Implement reversal of posted journal entries
- Create reverse entry with negative amounts
- Link original and reversal entries
- Reason tracking
- Approval workflow
- Audit trail

**API Endpoints:**
```
POST   /accounting/journal-entries/:voucherNumber/reverse
GET    /accounting/journal-entries/:voucherNumber/reversals
```

**Deliverables:**
- Enhanced AccountingService
- Reversal workflow
- Integration tests (4 tests)

---

## PHASE 8: Advanced Inventory & Fleet Features

**Objective:** Complete inventory traceability and fleet management per SRS

**Duration:** 2-3 weeks

### 8.1 Batch/Lot Tracking Enhancement (FR-061, FR-062)
**Priority:** High

**Tasks:**
- Enforce lot/batch tracking on all movements
- Batch-wise stock balance
- Expiry date tracking
- Manufacturing date tracking
- FIFO enforcement for perishable items
- Batch selection on sale (oldest first)
- Expiry alerts (database + notification)
- Near-expiry report

**API Endpoints:**
```
GET    /inventory/batches
GET    /inventory/batches/:batchNumber
GET    /inventory/batches/expiring-soon
GET    /inventory/batches/expired
GET    /inventory/batches/product/:productId
POST   /inventory/batches/:batchId/quarantine
```

**Deliverables:**
- Enhanced batch tracking logic
- Expiry alert service
- Batch-wise reports
- Integration tests (8 tests)

---

### 8.2 Temperature & Quality Tracking (FR-062)
**Priority:** Medium

**Tasks:**
- Temperature recording on stock movements
- Temperature alert thresholds
- Spoilage tracking due to temperature
- Quality inspection records
- Rejection tracking
- Cold chain compliance reporting

**Entities:**
- TemperatureLog (stockMovementId, recordedTemp, threshold, status, recordedAt)
- QualityInspection (batchId, inspectorUserId, status, remarks, inspectedAt)

**API Endpoints:**
```
POST   /inventory/temperature-logs
GET    /inventory/temperature-logs/:stockMovementId
GET    /inventory/temperature-alerts
POST   /inventory/quality-inspections
GET    /inventory/quality-inspections/:batchId
```

**Deliverables:**
- 2 new entities
- TemperatureMonitoringService
- QualityInspectionService
- Integration tests (6 tests)

---

### 8.3 Inventory Valuation Methods (FR-064)
**Priority:** Medium

**Tasks:**
- Implement FIFO valuation
- Implement LIFO valuation
- Configuration per product category
- Valuation comparison report
- Support valuation method change

**API Endpoints:**
```
GET    /inventory/valuation?method=FIFO
GET    /inventory/valuation?method=LIFO
GET    /inventory/valuation?method=WEIGHTED_AVERAGE
GET    /inventory/valuation/comparison
```

**Deliverables:**
- Enhanced StockBalanceService with FIFO/LIFO
- Valuation method configuration
- Comparison reports
- Integration tests (5 tests)

---

### 8.4 Complete Fleet Management (FR-090 to FR-095)
**Priority:** High

**Tasks:**

#### 8.4.1 Trip Management Enhancement
- Detailed trip logging (start location, end location, distance, time)
- Driver assignment validation
- Vehicle availability checking
- Trip expense tracking
- Fuel consumption tracking per trip
- Load tracking (products transported)
- Delivery confirmation

#### 8.4.2 Insurance & License Tracking
- Insurance policy management
- Renewal alerts
- Vehicle fitness certificate tracking
- Driver license tracking
- License renewal alerts
- Document attachment support

#### 8.4.3 Vehicle Reports (FR-105)
- Fuel efficiency report
- Maintenance cost analysis
- Trip analysis by vehicle
- Trip analysis by driver
- Vehicle downtime report
- Cost per kilometer report

**Entities:**
- InsurancePolicy (vehicleId, policyNumber, provider, startDate, endDate, premium, status)
- VehicleDocument (vehicleId, documentType, documentNumber, issueDate, expiryDate, status)
- DriverLicense (userId, licenseNumber, licenseType, issueDate, expiryDate, status)

**API Endpoints:**
```
POST   /fleet/insurance-policies
GET    /fleet/insurance-policies/expiring-soon
POST   /fleet/vehicle-documents
GET    /fleet/vehicle-documents/:vehicleId
POST   /fleet/driver-licenses
GET    /fleet/driver-licenses/expiring-soon
GET    /fleet/reports/fuel-efficiency
GET    /fleet/reports/maintenance-cost
GET    /fleet/reports/trip-analysis
GET    /fleet/reports/vehicle-downtime
```

**Deliverables:**
- 3 new entities
- Enhanced FleetManagementService
- Insurance/Document tracking services
- 4 new fleet reports
- Integration tests (12 tests)

---

## PHASE 9: Security, Audit & Controls

**Objective:** Complete audit trail, RBAC enforcement, and maker-checker workflows

**Duration:** 2-3 weeks

### 9.1 Audit Trail Integration (FR-110 to FR-114)
**Priority:** Critical

**Tasks:**
- Integrate AuditLog into all services
- Automatic logging on:
  - Create operations
  - Update operations
  - Delete operations
  - Approve operations
  - Post operations
  - Reverse operations
  - Login/Logout
  - Permission changes

- Log details:
  - User ID
  - Action type
  - Entity type
  - Entity ID
  - Old values (JSON)
  - New values (JSON)
  - IP address
  - User agent
  - Timestamp
  - Department context

- Audit log viewer API
- Audit report generation
- Immutable log storage

**API Endpoints:**
```
GET    /audit-logs
GET    /audit-logs/user/:userId
GET    /audit-logs/entity/:entityType/:entityId
GET    /audit-logs/action/:actionType
GET    /audit-logs/date-range
GET    /audit-logs/export
```

**Deliverables:**
- AuditLogService with auto-logging
- Integration into all business services
- Audit log viewer
- Export functionality
- Integration tests (8 tests)

---

### 9.2 RBAC Enforcement (FR-002, FR-003, FR-114)
**Priority:** Critical

**Tasks:**
- Enable global JWT authentication guard
- Implement RolesGuard on all controllers
- Implement PermissionsGuard on sensitive endpoints
- Define permission matrix for all modules:
  - Dashboard (VIEW)
  - Master Data (CREATE, READ, UPDATE, DELETE)
  - Transactions (CREATE, READ, UPDATE, DELETE, APPROVE, POST, REVERSE)
  - Accounting (CREATE, READ, POST, REVERSE, REPORT)
  - Inventory (CREATE, READ, UPDATE, ADJUST, TRANSFER)
  - Fleet (CREATE, READ, UPDATE, REPORT)
  - Reports (VIEW, EXPORT)
  - Admin (USER_MANAGEMENT, ROLE_MANAGEMENT, SYSTEM_CONFIG)

- Department-level data isolation
- Own vs All data access control

**Decorators to Implement:**
```typescript
@RequirePermission('PURCHASE_CREATE')
@RequirePermission('PURCHASE_APPROVE')
@RequirePermission('REPORT_VIEW')
@RequireDepartment() // Enforce department context
@RequireOwnership() // Only own records
```

**Deliverables:**
- Permission seed update (100+ permissions)
- Guards implementation on all controllers
- Department isolation middleware
- Integration tests (15 tests)

---

### 9.3 Maker-Checker Workflow (FR-005, FR-112)
**Priority:** High

**Tasks:**
- Implement ApprovalWorkflow integration
- Define approval rules:
  - Purchases > threshold amount
  - Sales > threshold amount
  - Expenses > threshold amount
  - Adjustments (all)
  - Transfers (all)
  - Journal entries (manual)
  - Salary payments
  - Period closing

- Multi-level approval support
- Approval delegation
- Approval notifications
- Rejection with reason
- Approval history

**API Endpoints:**
```
GET    /approvals/pending
GET    /approvals/pending/:userId
GET    /approvals/history
POST   /approvals/:id/approve
POST   /approvals/:id/reject
POST   /approvals/:id/delegate
```

**Deliverables:**
- Enhanced ApprovalWorkflowService
- Integration into transaction services
- Approval configuration
- Notification system (basic)
- Integration tests (10 tests)

---

### 9.4 Attachment Management (FR-083)
**Priority:** Medium

**Tasks:**
- Integrate Attachment entity into workflows
- File upload support (invoices, receipts, contracts)
- Attachment viewing
- Attachment download
- Attachment deletion (soft)
- File storage (local/S3)
- Supported document types:
  - Purchase invoices
  - Sale invoices
  - Expense receipts
  - Vehicle documents
  - Insurance policies
  - Contracts
  - Quality certificates

**API Endpoints:**
```
POST   /attachments/upload
GET    /attachments/:entityType/:entityId
GET    /attachments/:id/download
DELETE /attachments/:id
```

**Deliverables:**
- AttachmentService
- File upload controller
- Integration with business entities
- Storage configuration
- Integration tests (6 tests)

---

## PHASE 10: Department-Specific Features

**Objective:** Implement department-specific business rules per SRS

**Duration:** 2-3 weeks

### 10.1 Brokerage Department (FR-020 to FR-026)
**Priority:** Medium

**Tasks:**
- Commission calculation rules per broker
- Commission-based pricing
- Broker performance reports
- Farm owner transaction reports
- Brokerage P&L report

**API Endpoints:**
```
GET    /departments/brokerage/commission-report
GET    /departments/brokerage/broker-performance
GET    /departments/brokerage/profit-loss
```

---

### 10.2 Supply Department (FR-030 to FR-036)
**Priority:** Medium

**Tasks:**
- Shop owner credit management
- Delivery scheduling
- Route optimization (basic)
- Supply P&L report

**API Endpoints:**
```
GET    /departments/supply/shop-owner-credit
GET    /departments/supply/delivery-schedule
GET    /departments/supply/profit-loss
```

---

### 10.3 Wastage Department (FR-040 to FR-046)
**Priority:** Medium

**Tasks:**
- Waste type categorization
- Waste quality grading
- Factory-wise waste sales
- Wastage P&L report

**API Endpoints:**
```
GET    /departments/wastage/waste-categories
GET    /departments/wastage/factory-sales
GET    /departments/wastage/profit-loss
```

---

### 10.4 Fresh Chicken Shop Department (FR-050 to FR-057)
**Priority:** Medium

**Tasks:**
- Daily sales dashboard
- Customer loyalty tracking
- Margin analysis per product
- Shop P&L report

**API Endpoints:**
```
GET    /departments/fresh-chicken-shop/daily-dashboard
GET    /departments/fresh-chicken-shop/customer-loyalty
GET    /departments/fresh-chicken-shop/margin-analysis
GET    /departments/fresh-chicken-shop/profit-loss
```

---

## PHASE 11: Notifications & Alerts

**Objective:** Real-time alerts and notifications

**Duration:** 1-2 weeks

### 11.1 Notification System
**Priority:** Medium

**Tasks:**
- Notification infrastructure
- Alert types:
  - Low stock alert
  - Expiry alerts (batch, insurance, license, documents)
  - Maintenance due alerts
  - Payment due alerts
  - Approval pending alerts
  - Over-budget alerts
  - Credit limit exceeded alerts

**Entities:**
- Notification (userId, type, title, message, entityType, entityId, isRead, sentAt)

**API Endpoints:**
```
GET    /notifications
GET    /notifications/unread
PATCH  /notifications/:id/read
PATCH  /notifications/mark-all-read
DELETE /notifications/:id
```

**Deliverables:**
- Notification entity
- NotificationService
- Alert scheduling (cron jobs)
- WebSocket integration (optional)
- Integration tests (6 tests)

---

## PHASE 12: Data Export & Backups

**Objective:** Data export and backup functionality

**Duration:** 1 week

### 12.1 Export Functionality
**Priority:** Low

**Tasks:**
- Export reports to Excel
- Export reports to PDF
- Export master data to CSV
- Import master data from CSV/Excel

**API Endpoints:**
```
GET    /export/reports/:reportType?format=xlsx
GET    /export/master-data/:entityType?format=csv
POST   /import/master-data/:entityType
```

---

### 12.2 Database Backup
**Priority:** High

**Tasks:**
- Automated backup scheduling
- Backup storage configuration
- Restore functionality
- Backup monitoring

---

## Summary: Phase Completion Roadmap

| Phase | Focus | Duration | Tests | Priority |
|-------|-------|----------|-------|----------|
| Phase 5 | Core Transactions Completion | 2-3 weeks | 32 | High |
| Phase 6 | Personnel Management Consolidation | 1-2 weeks | 22 | Critical |
| Phase 7 | Accounting & Reporting | 2-3 weeks | 30 | High |
| Phase 8 | Advanced Inventory & Fleet | 2-3 weeks | 31 | High |
| Phase 9 | Security, Audit & Controls | 2-3 weeks | 39 | Critical |
| Phase 10 | Department-Specific Features | 2-3 weeks | 16 | Medium |
| Phase 11 | Notifications & Alerts | 1-2 weeks | 6 | Medium |
| Phase 12 | Export & Backups | 1 week | 4 | Low |

**Total Estimated Duration:** 12-20 weeks (3-5 months)

**Total Additional Tests:** 180+ integration tests

**Total New API Endpoints:** 150+

---

## Acceptance Criteria for 100% SRS Compliance

- [ ] All FR-001 to FR-114 requirements implemented
- [ ] All NFR-001 to NFR-041 requirements met
- [ ] All 9 report types from FR-100 to FR-108 available
- [ ] Complete audit trail on all operations
- [ ] RBAC enforced on all endpoints
- [ ] Department-wise data isolation working
- [ ] Maker-checker workflow on critical transactions
- [ ] All transaction types complete (purchase, sale, return, adjustment, transfer)
- [ ] Batch/lot tracking fully functional
- [ ] Fleet management complete with all reports
- [ ] Salary management operational
- [ ] Personnel consolidated into User table
- [ ] All integration tests passing (400+ tests)
- [ ] Performance benchmarks met (NFR-010, NFR-011)
- [ ] Security requirements met (NFR-001 to NFR-003)

---

**End of Missing Phases Roadmap**

# Poultry ERP Database Schema Design

**Database Name:** 4Head_db

**Database Type:** PostgreSQL

**Design Standards:** Third Normal Form (3NF) with industry-standard constraints and practices

**Document Version:** 1.0

---

## 1. Overview

This document defines the complete relational schema for the Poultry Business Management System (PBMS). The design supports four operational departments with unified accounting, inventory tracking, vehicle management, and audit controls.

### Database Principles Applied

- **Atomicity:** All attributes are atomic; no repeating groups or composite columns.
- **Normalization:** Full 3NF; all non-key attributes depend on the full primary key with no transitive dependencies.
- **Surrogate Keys:** UUID primary keys for all tables.
- **Referential Integrity:** Foreign key constraints with appropriate cascade rules.
- **Soft Deletes:** All master and transactional records support soft delete via `deletedAt` timestamp.
- **Audit Trail:** Immutable AuditLog table for all sensitive DML.
- **Indexed Queries:** Strategic indexes on foreign keys, date ranges, and commonly filtered fields.

---

## 2. Master Data Schema

### 2.1 Department
Represents the four operational heads: Brokerage, Supply, Wastage, Fresh Chicken Shop.

```
departments
├── id (UUID, PK)
├── name (VARCHAR, UNIQUE)
├── description (TEXT, nullable)
├── type (ENUM: BROKERAGE | SUPPLY | WASTAGE | FRESH_CHICKEN_SHOP)
├── headName (VARCHAR, nullable)
├── costCenter (VARCHAR, nullable) — Accounting reference
├── isActive (BOOLEAN, DEFAULT: true)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable) — Soft delete
```

**Constraints:**
- `name` is globally unique.
- `type` restricts to exactly one of four department types.
- One department per type.

---

### 2.2 Employee
Staff members assigned to department(s) with optional user account link.

```
employees
├── id (UUID, PK)
├── firstName (VARCHAR)
├── lastName (VARCHAR)
├── email (VARCHAR, UNIQUE, nullable)
├── phoneNumber (VARCHAR, nullable)
├── departmentId (UUID, FK → Department)
├── userId (UUID, FK → User, nullable) — Link to auth system
├── employeeId (VARCHAR, nullable) — HR ID
├── dateOfBirth (DATE, nullable)
├── address (VARCHAR, nullable)
├── city (VARCHAR, nullable)
├── state (VARCHAR, nullable)
├── postalCode (VARCHAR, nullable)
├── country (VARCHAR, nullable)
├── taxId (VARCHAR, nullable) — PAN, SSN, etc.
├── bankAccount (VARCHAR, nullable)
├── bankIfsc (VARCHAR, nullable)
├── status (ENUM: ACTIVE | INACTIVE | ON_LEAVE | TERMINATED)
├── joinDate (DATE, nullable)
├── separationDate (DATE, nullable)
├── monthlySalary (DECIMAL(10,2), nullable)
├── isActive (BOOLEAN, DEFAULT: true)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

**Constraints:**
- `email` is globally unique (if populated).
- `departmentId` cannot be null.
- Foreign key to `User` table is optional; employees may not have auth accounts.

---

### 2.3 Worker
Operational workers, distinct from employees.

```
workers
├── id (UUID, PK)
├── firstName (VARCHAR)
├── lastName (VARCHAR)
├── email (VARCHAR, UNIQUE, nullable)
├── phoneNumber (VARCHAR, nullable)
├── departmentId (UUID, FK → Department)
├── workerId (VARCHAR, nullable)
├── dateOfBirth (DATE, nullable)
├── address (VARCHAR, nullable)
├── city (VARCHAR, nullable)
├── state (VARCHAR, nullable)
├── postalCode (VARCHAR, nullable)
├── country (VARCHAR, nullable)
├── taxId (VARCHAR, nullable)
├── status (ENUM: ACTIVE | INACTIVE | ON_LEAVE | TERMINATED)
├── joinDate (DATE, nullable)
├── separationDate (DATE, nullable)
├── dailyWage (DECIMAL(10,2), nullable)
├── isActive (BOOLEAN, DEFAULT: true)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

**Constraints:**
- Similar to Employee but simpler structure without bank/salary fields.

---

### 2.4 Customer
Buyers of finished goods; primarily Fresh Chicken Shop.

```
customers
├── id (UUID, PK)
├── name (VARCHAR)
├── email (VARCHAR, UNIQUE, nullable)
├── phoneNumber (VARCHAR, nullable)
├── address (VARCHAR, nullable)
├── city (VARCHAR, nullable)
├── state (VARCHAR, nullable)
├── postalCode (VARCHAR, nullable)
├── country (VARCHAR, nullable)
├── customerType (ENUM: INDIVIDUAL | BUSINESS)
├── taxId (VARCHAR, nullable)
├── status (ENUM: ACTIVE | INACTIVE | BLOCKED)
├── creditLimit (DECIMAL(10,2), DEFAULT: 0)
├── currentBalance (DECIMAL(10,2), DEFAULT: 0) — Derived from GL
├── notes (TEXT, nullable)
├── isActive (BOOLEAN, DEFAULT: true)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

---

### 2.5 ShopOwner
Owner of chicken shops; buyer for Supply and Wastage departments.

```
shop_owners
├── id (UUID, PK)
├── name (VARCHAR)
├── email (VARCHAR, UNIQUE, nullable)
├── phoneNumber (VARCHAR, nullable)
├── address (VARCHAR, nullable)
├── city (VARCHAR, nullable)
├── state (VARCHAR, nullable)
├── postalCode (VARCHAR, nullable)
├── country (VARCHAR, nullable)
├── shopName (VARCHAR, nullable)
├── taxId (VARCHAR, nullable)
├── status (ENUM: ACTIVE | INACTIVE | BLOCKED)
├── creditLimit (DECIMAL(10,2), DEFAULT: 0)
├── currentBalance (DECIMAL(10,2), DEFAULT: 0)
├── notes (TEXT, nullable)
├── isActive (BOOLEAN, DEFAULT: true)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

---

### 2.6 Broker
Intermediaries used by Brokerage and Supply departments.

```
brokers
├── id (UUID, PK)
├── name (VARCHAR)
├── email (VARCHAR, UNIQUE, nullable)
├── phoneNumber (VARCHAR, nullable)
├── address (VARCHAR, nullable)
├── city (VARCHAR, nullable)
├── state (VARCHAR, nullable)
├── postalCode (VARCHAR, nullable)
├── country (VARCHAR, nullable)
├── taxId (VARCHAR, nullable)
├── status (ENUM: ACTIVE | INACTIVE | BLOCKED)
├── commissionRate (DECIMAL(10,2), DEFAULT: 0)
├── currentBalance (DECIMAL(10,2), DEFAULT: 0)
├── notes (TEXT, nullable)
├── isActive (BOOLEAN, DEFAULT: true)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

---

### 2.7 Supplier
Source of products for various departments.

```
suppliers
├── id (UUID, PK)
├── name (VARCHAR)
├── email (VARCHAR, UNIQUE, nullable)
├── phoneNumber (VARCHAR, nullable)
├── address (VARCHAR, nullable)
├── city (VARCHAR, nullable)
├── state (VARCHAR, nullable)
├── postalCode (VARCHAR, nullable)
├── country (VARCHAR, nullable)
├── supplierType (ENUM: POULTRY_FARM | DISTRIBUTOR | WHOLESALE | OTHER)
├── taxId (VARCHAR, nullable)
├── status (ENUM: ACTIVE | INACTIVE | BLOCKED)
├── currentBalance (DECIMAL(10,2), DEFAULT: 0)
├── notes (TEXT, nullable)
├── isActive (BOOLEAN, DEFAULT: true)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

---

### 2.8 FarmOwner
Specific supplier type for Brokerage Department.

```
farm_owners
├── id (UUID, PK)
├── name (VARCHAR)
├── email (VARCHAR, UNIQUE, nullable)
├── phoneNumber (VARCHAR, nullable)
├── address (VARCHAR, nullable)
├── city (VARCHAR, nullable)
├── state (VARCHAR, nullable)
├── postalCode (VARCHAR, nullable)
├── country (VARCHAR, nullable)
├── farmName (VARCHAR, nullable)
├── farmLocation (VARCHAR, nullable)
├── taxId (VARCHAR, nullable)
├── status (ENUM: ACTIVE | INACTIVE | BLOCKED)
├── currentBalance (DECIMAL(10,2), DEFAULT: 0)
├── notes (TEXT, nullable)
├── isActive (BOOLEAN, DEFAULT: true)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

---

### 2.9 Product
Inventory items tracked by weight.

```
products
├── id (UUID, PK)
├── code (VARCHAR, UNIQUE)
├── name (VARCHAR)
├── description (TEXT, nullable)
├── category (ENUM: LIVE_BIRD | FRESH_CHICKEN | PROCESSED | WASTE | OTHER)
├── unitOfMeasure (ENUM: KG | UNIT | LITER | DOZEN)
├── standardWeight (DECIMAL(10,2), nullable)
├── minimumStockLevel (DECIMAL(10,2), nullable)
├── maximumStockLevel (DECIMAL(10,2), nullable)
├── isActive (BOOLEAN, DEFAULT: true)
├── hsn (VARCHAR, nullable)
├── sac (VARCHAR, nullable)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

---

## 3. Transaction Schema

### 3.1 Purchase
Inbound transactions from suppliers, brokers, or farm owners.

```
purchases
├── id (UUID, PK)
├── voucherNumber (VARCHAR, UNIQUE)
├── departmentId (UUID, FK → Department)
├── supplierId (UUID, FK → Supplier, nullable)
├── farmOwnerId (UUID, FK → FarmOwner, nullable)
├── brokerId (UUID, FK → Broker, nullable)
├── productId (UUID, FK → Product)
├── quantity (DECIMAL(12,2))
├── ratePerUnit (DECIMAL(12,2))
├── totalAmount (DECIMAL(14,2))
├── taxAmount (DECIMAL(12,2), nullable)
├── paymentMode (ENUM: CASH | CREDIT | CHEQUE | BANK_TRANSFER)
├── purchaseDate (DATE)
├── dueDate (DATE, nullable)
├── status (ENUM: DRAFT | POSTED | RETURNED | CANCELLED)
├── referenceNumber (VARCHAR, nullable)
├── notes (TEXT, nullable)
├── approverUserId (VARCHAR, nullable)
├── remainingQty (DECIMAL(12,2), nullable)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

**Constraints:**
- Exactly one of `supplierId`, `farmOwnerId`, or `brokerId` should be populated based on department.
- `quantity > 0` and `ratePerUnit ≥ 0`.
- `totalAmount = quantity * ratePerUnit`.
- `voucherNumber` is globally unique but may contain department prefix.

---

### 3.2 Sale
Outbound transactions to customers, shop owners, or brokers.

```
sales
├── id (UUID, PK)
├── voucherNumber (VARCHAR, UNIQUE)
├── departmentId (UUID, FK → Department)
├── customerId (UUID, FK → Customer, nullable)
├── shopOwnerId (UUID, FK → ShopOwner, nullable)
├── brokerId (UUID, FK → Broker, nullable)
├── productId (UUID, FK → Product)
├── quantity (DECIMAL(12,2))
├── ratePerUnit (DECIMAL(12,2))
├── totalAmount (DECIMAL(14,2))
├── commissionRate (DECIMAL(10,2), nullable)
├── commissionAmount (DECIMAL(14,2), nullable)
├── marginAmount (DECIMAL(14,2), nullable)
├── finalAmount (DECIMAL(14,2))
├── taxAmount (DECIMAL(12,2), nullable)
├── paymentMode (ENUM: CASH | CREDIT | CHEQUE | BANK_TRANSFER)
├── saleDate (DATE)
├── dueDate (DATE, nullable)
├── status (ENUM: DRAFT | POSTED | RETURNED | CANCELLED)
├── invoiceNumber (VARCHAR, nullable)
├── notes (TEXT, nullable)
├── approverUserId (VARCHAR, nullable)
├── remainingQty (DECIMAL(12,2), nullable)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

**Constraints:**
- Exactly one of `customerId`, `shopOwnerId`, or `brokerId` should be populated based on department.
- `finalAmount = totalAmount + marginAmount` or `totalAmount + commissionAmount` depending on department logic.

---

### 3.3 Return
Returns of purchases or sales; full or partial.

```
returns
├── id (UUID, PK)
├── voucherNumber (VARCHAR, UNIQUE)
├── departmentId (UUID, FK → Department)
├── purchaseId (UUID, FK → Purchase, nullable)
├── saleId (UUID, FK → Sale, nullable)
├── returnType (ENUM: PURCHASE_RETURN | SALES_RETURN)
├── quantity (DECIMAL(12,2))
├── returnAmount (DECIMAL(14,2))
├── reason (TEXT, nullable)
├── returnMode (ENUM: FULL_RETURN | PARTIAL_RETURN)
├── returnDate (DATE)
├── status (ENUM: DRAFT | POSTED | CANCELLED)
├── approverUserId (VARCHAR, nullable)
├── notes (TEXT, nullable)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

**Constraints:**
- Exactly one of `purchaseId` or `saleId` is populated.
- `quantity ≤ remainingQty` on source purchase/sale.

---

### 3.4 Adjustment
Stock adjustments for shrinkage, loss, damage, spoilage, or corrections.

```
adjustments
├── id (UUID, PK)
├── voucherNumber (VARCHAR, UNIQUE)
├── departmentId (UUID, FK → Department)
├── productId (UUID, FK → Product)
├── adjustmentType (ENUM: SHRINKAGE | LOSS | DAMAGE | SPOILAGE | CORRECTION | OTHER)
├── quantity (DECIMAL(12,2))
├── ratePerUnit (DECIMAL(12,2), nullable)
├── adjustmentAmount (DECIMAL(14,2), nullable)
├── adjustmentDate (DATE)
├── status (ENUM: DRAFT | POSTED | CANCELLED)
├── reason (TEXT, nullable)
├── approverUserId (VARCHAR, nullable)
├── notes (TEXT, nullable)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

**Constraints:**
- `quantity` can be positive (increase) or negative (decrease).

---

### 3.5 Expense
Miscellaneous and operational expenses with approval workflow.

```
expenses
├── id (UUID, PK)
├── voucherNumber (VARCHAR, UNIQUE)
├── departmentId (UUID, FK → Department)
├── expenseCategory (ENUM: FUEL | MAINTENANCE | RENT | UTILITIES | ... | OTHER)
├── amount (DECIMAL(14,2))
├── vehicleId (UUID, FK → Vehicle, nullable)
├── employeeId (UUID, FK → Employee, nullable)
├── expenseDate (DATE)
├── status (ENUM: DRAFT | SUBMITTED | APPROVED | REJECTED | POSTED)
├── approverEmployeeId (UUID, FK → Employee, nullable)
├── approvalDate (DATE, nullable)
├── rejectionReason (TEXT, nullable)
├── description (TEXT, nullable)
├── reference (VARCHAR, nullable)
├── isRecurring (BOOLEAN, DEFAULT: false)
├── recurringFrequency (VARCHAR, nullable)
├── notes (TEXT, nullable)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

**Constraints:**
- One of `vehicleId` or `employeeId` may be populated to link expense to asset or person.
- Approval workflow links to `approverEmployeeId` from same or higher department.

---

## 4. Fleet Management Schema

### 4.1 Vehicle
Fleet asset with ownership, insurance, and operational tracking.

```
vehicles
├── id (UUID, PK)
├── registrationNumber (VARCHAR, UNIQUE)
├── make (VARCHAR)
├── model (VARCHAR)
├── year (INTEGER)
├── color (VARCHAR, nullable)
├── vehicleType (ENUM: TRUCK | VAN | CAR | MOTORCYCLE | OTHER)
├── chassisNumber (VARCHAR, nullable)
├── engineNumber (VARCHAR, nullable)
├── departmentId (UUID, FK → Department)
├── registrationDate (DATE, nullable)
├── registrationExpiry (DATE, nullable)
├── registrationAuthority (VARCHAR, nullable)
├── insuranceExpiryDate (DATE, nullable)
├── insurancePolicyNumber (VARCHAR, nullable)
├── insuranceProvider (VARCHAR, nullable)
├── insurancePremium (DECIMAL(10,2), nullable)
├── currentMileage (DECIMAL(12,2), nullable)
├── fuelCapacity (DECIMAL(12,2), nullable)
├── fuelType (ENUM: DIESEL | PETROL | CNG | ELECTRIC | OTHER)
├── owner (VARCHAR, nullable)
├── ownerContact (VARCHAR, nullable)
├── ownershipType (ENUM: OWNED | LEASED | FINANCED)
├── status (ENUM: ACTIVE | INACTIVE | UNDER_MAINTENANCE | DECOMMISSIONED)
├── isActive (BOOLEAN, DEFAULT: true)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

---

### 4.2 FuelLog
Fuel purchases and consumption.

```
fuel_logs
├── id (UUID, PK)
├── vehicleId (UUID, FK → Vehicle)
├── fuelDate (DATE)
├── quantity (DECIMAL(10,2))
├── costPerLiter (DECIMAL(10,2))
├── totalCost (DECIMAL(12,2))
├── odometer (DECIMAL(12,2), nullable)
├── fuelStation (VARCHAR, nullable)
├── reference (VARCHAR, nullable)
├── notes (TEXT, nullable)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

---

### 4.3 MaintenanceLog
Service, repair, and inspection history.

```
maintenance_logs
├── id (UUID, PK)
├── vehicleId (UUID, FK → Vehicle)
├── maintenanceDate (DATE)
├── maintenanceType (ENUM: SERVICE | REPAIR | INSPECTION | PARTS_REPLACEMENT | OTHER)
├── description (VARCHAR)
├── cost (DECIMAL(12,2))
├── serviceProvider (VARCHAR, nullable)
├── odometer (DECIMAL(12,2), nullable)
├── nextServiceDue (DATE, nullable)
├── reference (VARCHAR, nullable)
├── notes (TEXT, nullable)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

---

### 4.4 TripLog
Trip and delivery records.

```
trip_logs
├── id (UUID, PK)
├── vehicleId (UUID, FK → Vehicle)
├── departmentId (UUID, FK → Department)
├── driverId (VARCHAR, nullable)
├── driverName (VARCHAR, nullable)
├── tripDate (DATE)
├── startLocation (VARCHAR, nullable)
├── endLocation (VARCHAR, nullable)
├── distanceCovered (DECIMAL(10,2))
├── startTime (TIME, nullable)
├── endTime (TIME, nullable)
├── startOdometer (DECIMAL(12,2), nullable)
├── endOdometer (DECIMAL(12,2), nullable)
├── tripType (ENUM: DELIVERY | PICKUP | ROUND_TRIP | OTHER)
├── loadDescription (TEXT, nullable)
├── loadWeight (DECIMAL(12,2), nullable)
├── billReferenceNumber (VARCHAR, nullable)
├── notes (TEXT, nullable)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

---

### 4.5 Driver
Assignment of employees or workers to vehicles.

```
drivers
├── id (UUID, PK)
├── vehicleId (UUID, FK → Vehicle)
├── employeeId (UUID, FK → Employee, nullable)
├── workerId (UUID, FK → Worker, nullable)
├── licenseNumber (VARCHAR, nullable)
├── licenseExpiry (DATE, nullable)
├── status (ENUM: ACTIVE | INACTIVE | SUSPENDED)
├── assignmentDate (DATE)
├── unassignmentDate (DATE, nullable)
├── isActive (BOOLEAN, DEFAULT: true)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

**Constraints:**
- Exactly one of `employeeId` or `workerId` is populated.

---

## 5. Inventory Schema

### 5.1 StockMovement
Detailed ledger of all inventory movements with batch/lot tracking.

```
stock_movements
├── id (UUID, PK)
├── departmentId (UUID, FK → Department)
├── productId (UUID, FK → Product)
├── movementType (ENUM: RECEIPT | ISSUE | TRANSFER | RETURN | ADJUSTMENT | WRITE_OFF)
├── quantity (DECIMAL(12,2))
├── costPerUnit (DECIMAL(12,2), nullable)
├── totalValue (DECIMAL(14,2), nullable)
├── lotNumber (VARCHAR, nullable)
├── batchMetadata (TEXT, nullable) — JSON
├── manufacturingDate (DATE, nullable)
├── expiryDate (DATE, nullable)
├── temperature (DECIMAL(5,2), nullable)
├── purchaseId (UUID, FK → Purchase, nullable)
├── saleId (UUID, FK → Sale, nullable)
├── movementDate (DATE)
├── reference (VARCHAR, nullable)
├── notes (TEXT, nullable)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

**Constraints:**
- Supports full traceability: batch, temperature, quality, expiry.
- Positive for RECEIPT/RETURN, negative for ISSUE/ADJUSTMENT/WRITE_OFF.

---

### 5.2 StockBalance
Cached current balance per product and department.

```
stock_balances
├── id (UUID, PK)
├── departmentId (UUID, FK → Department)
├── productId (UUID, FK → Product)
├── UNIQUE(departmentId, productId)
├── currentQuantity (DECIMAL(12,2), DEFAULT: 0)
├── valuationAmount (DECIMAL(14,2), nullable)
├── valuationMethod (ENUM: FIFO | LIFO | WEIGHTED_AVERAGE)
├── lastReceiptDate (DATE, nullable)
├── lastIssueDate (DATE, nullable)
├── minimumLevel (DECIMAL(12,2), nullable)
├── maximumLevel (DECIMAL(12,2), nullable)
├── createdAt (TIMESTAMP)
└── updatedAt (TIMESTAMP)
```

**Purpose:** Performance optimization; avoids iterating all stock movements for every balance query.

---

## 6. Accounting Schema

### 6.1 Account
Chart of Accounts master.

```
accounts
├── id (UUID, PK)
├── code (VARCHAR, UNIQUE)
├── name (VARCHAR)
├── description (TEXT, nullable)
├── type (ENUM: ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE)
├── normalBalance (ENUM: NORMAL_DEBIT | NORMAL_CREDIT)
├── subType (VARCHAR, nullable)
├── isActive (BOOLEAN, DEFAULT: true)
├── parentAccountId (UUID, nullable)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

**Standard Chart of Accounts Structure:**
- 1000–1999: ASSET (Bank, Cash, Receivables, Inventory)
- 2000–2999: LIABILITY (Payables, Loans)
- 3000–3999: EQUITY (Capital, Retained Earnings)
- 4000–4999: REVENUE (Sales, Commission Income)
- 5000–5999: EXPENSE (COGS, Salary, Fuel, Maintenance)

---

### 6.2 JournalEntry
Individual debit/credit lines for double-entry transactions.

```
journal_entries
├── id (UUID, PK)
├── voucherNumber (VARCHAR, UNIQUE)
├── departmentId (UUID, FK → Department)
├── accountId (UUID, FK → Account)
├── type (ENUM: DEBIT | CREDIT)
├── amount (DECIMAL(14,2))
├── journalDate (DATE)
├── journalType (ENUM: OPERATIONAL | ADJUSTMENT | REVERSAL)
├── purchaseId (UUID, FK → Purchase, nullable)
├── saleId (UUID, FK → Sale, nullable)
├── description (VARCHAR, nullable)
├── reference (VARCHAR, nullable)
├── status (ENUM: DRAFT | POSTED | REVERSED)
├── reversalOfId (UUID, nullable) — If reversal
├── postingUserId (VARCHAR, nullable)
├── postingTime (TIMESTAMP, nullable)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

**Constraints:**
- Every posted transaction creates two or more balanced journal entries (debit = credit).
- Cannot delete posted entries; must reverse.

---

### 6.3 Ledger
Summarized GL postings by account and department.

```
ledgers
├── id (UUID, PK)
├── INDEX(accountId, departmentId)
├── INDEX(accountId, ledgerDate)
├── accountId (UUID, FK → Account)
├── departmentId (UUID, FK → Department)
├── type (ENUM: DEBIT | CREDIT)
├── amount (DECIMAL(14,2))
├── ledgerDate (DATE)
├── description (VARCHAR, nullable)
├── reference (VARCHAR, nullable)
├── journalEntryId (UUID, nullable)
├── createdAt (TIMESTAMP)
└── updatedAt (TIMESTAMP)
```

**Purpose:** Query optimization for GL reports and trial balance.

---

### 6.4 AccountBalance
Running balance for customers, suppliers, brokers, etc.

```
account_balances
├── id (UUID, PK)
├── departmentId (UUID, FK → Department)
├── partyType (ENUM: CUSTOMER | SHOP_OWNER | BROKER | SUPPLIER | FARM_OWNER)
├── customerId (UUID, FK → Customer, nullable)
├── shopOwnerId (UUID, FK → ShopOwner, nullable)
├── brokerId (UUID, FK → Broker, nullable)
├── supplierId (UUID, FK → Supplier, nullable)
├── farmOwnerId (UUID, FK → FarmOwner, nullable)
├── balance (DECIMAL(14,2), DEFAULT: 0)
├── totalDebits (DECIMAL(14,2), DEFAULT: 0)
├── totalCredits (DECIMAL(14,2), DEFAULT: 0)
├── asOfDate (DATE, nullable)
├── createdAt (TIMESTAMP)
└── updatedAt (TIMESTAMP)
```

**Purpose:** Performance optimization; running balance avoids traversing all transactions.

---

## 7. Settlement Schema

### 7.1 Payment
Cash, cheque, or bank transfer payments against open balances.

```
payments
├── id (UUID, PK)
├── voucherNumber (VARCHAR, UNIQUE)
├── departmentId (UUID, FK → Department)
├── payeeType (ENUM: CUSTOMER | SHOP_OWNER | BROKER | SUPPLIER | FARM_OWNER)
├── customerId (UUID, FK → Customer, nullable)
├── shopOwnerId (UUID, FK → ShopOwner, nullable)
├── brokerId (UUID, FK → Broker, nullable)
├── supplierId (UUID, FK → Supplier, nullable)
├── farmOwnerId (UUID, FK → FarmOwner, nullable)
├── amount (DECIMAL(14,2))
├── paymentMode (ENUM: CASH | CHEQUE | BANK_TRANSFER | UPI | OTHER)
├── paymentDate (DATE)
├── referenceNumber (VARCHAR, nullable)
├── bankName (VARCHAR, nullable)
├── chequeNumber (VARCHAR, nullable)
├── chequeDate (DATE, nullable)
├── paymentType (ENUM: ADVANCE | SETTLEMENT | PARTIAL_SETTLEMENT | ADJUSTMENT)
├── purchaseId (UUID, FK → Purchase, nullable)
├── saleId (UUID, FK → Sale, nullable)
├── status (ENUM: DRAFT | POSTED | CLEARED | CANCELLED)
├── notes (TEXT, nullable)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

---

## 8. Control and Audit Schema

### 8.1 Attachment
Document uploads for invoices, receipts, vouchers.

```
attachments
├── id (UUID, PK)
├── parentType (VARCHAR)
├── parentId (UUID)
├── fileName (VARCHAR)
├── fileUrl (VARCHAR)
├── mimeType (VARCHAR, nullable)
├── fileSize (BIGINT, nullable)
├── uploadedBy (VARCHAR, nullable)
├── description (TEXT, nullable)
├── documentType (ENUM: INVOICE | RECEIPT | VOUCHER | PROOF | NOTE | OTHER)
├── createdAt (TIMESTAMP)
├── updatedAt (TIMESTAMP)
└── deletedAt (TIMESTAMP, nullable)
```

---

### 8.2 AuditLog
Immutable log of all sensitive actions.

```
audit_logs
├── id (UUID, PK)
├── INDEX(entityType, entityId)
├── INDEX(userId, actionType)
├── INDEX(createdAt)
├── userId (VARCHAR)
├── entityType (VARCHAR)
├── entityId (UUID)
├── actionType (ENUM: CREATE | UPDATE | DELETE | POST | REVERSE | APPROVE | REJECT | VIEW)
├── oldValues (TEXT, nullable) — JSON
├── newValues (TEXT, nullable) — JSON
├── description (VARCHAR, nullable)
├── ipAddress (VARCHAR, nullable)
├── sessionId (VARCHAR, nullable)
├── userAgent (TEXT, nullable)
├── status (ENUM: SUCCESS | FAILURE)
├── errorMessage (TEXT, nullable)
└── createdAt (TIMESTAMP)
```

**Immutable:** Never update or delete audit_logs; only insert.

---

### 8.3 ApprovalWorkflow
Maker-checker approval state.

```
approval_workflows
├── id (UUID, PK)
├── INDEX(entityType, entityId)
├── INDEX(status)
├── entityType (VARCHAR)
├── entityId (UUID)
├── creatorUserId (VARCHAR)
├── approverUserId (VARCHAR, nullable)
├── status (ENUM: PENDING | APPROVED | REJECTED | CANCELLED)
├── approvalDate (DATE, nullable)
├── approvalNotes (TEXT, nullable)
├── rejectionReason (TEXT, nullable)
├── approvalLevel (ENUM: PENDING_APPROVAL | AUTO_APPROVED | FORCE_POSTED)
├── createdAt (TIMESTAMP)
└── updatedAt (TIMESTAMP)
```

---

## 9. Relationships and Cardinality

### One-to-Many

| Parent | Child | Cardinality | Note |
|--------|-------|-------------|------|
| Department | Employee | 1:N | Employees belong to department |
| Department | Worker | 1:N | Workers belong to department |
| Department | Purchase | 1:N | All purchases linked to dept |
| Department | Sale | 1:N | All sales linked to dept |
| Department | Expense | 1:N | All expenses linked to dept |
| Department | Vehicle | 1:N | Vehicles assigned to dept |
| Product | StockMovement | 1:N | Each product has movement history |
| Product | StockBalance | 1:1 | One balance per product/dept |
| Account | JournalEntry | 1:N | Multiple GL entries per account |
| Account | Ledger | 1:N | Multiple ledger postings per account |
| Purchase | Return | 1:N | Returns link to source purchase |
| Sale | Return | 1:N | Returns link to source sale |
| Vehicle | FuelLog | 1:N | Multiple fuel records per vehicle |
| Vehicle | MaintenanceLog | 1:N | Multiple service records |
| Vehicle | TripLog | 1:N | Multiple trips per vehicle |
| Vehicle | Driver | 1:N | Multiple driver assignments |
| Employee | Driver | 1:N | Employee can drive multiple vehicles |
| Worker | Driver | 1:N | Worker can drive multiple vehicles |

### Many-to-One (Foreign Keys)

- Purchase → Supplier, FarmOwner, or Broker
- Sale → Customer, ShopOwner, or Broker
- Adjustment → Product, Department
- Expense → Department, Vehicle, Employee
- JournalEntry → Department, Account, Purchase, Sale
- Ledger → Department, Account
- Payment → Department, Customer/ShopOwner/Broker/Supplier/FarmOwner
- StockBalance → Department, Product

---

## 10. Indexing Strategy

### Primary Indexes (for FK relationships)
- `departments(id)`
- `employees(departmentId)`
- `workers(departmentId)`
- `customers(id)`, `shop_owners(id)`, `brokers(id)`, `suppliers(id)`, `farm_owners(id)`
- `products(id)`
- `vehicles(departmentId)`
- `purchases(departmentId, productId, supplierId/farmOwnerId/brokerId)`
- `sales(departmentId, productId, customerId/shopOwnerId/brokerId)`
- `stock_movements(departmentId, productId, movementDate)`
- `stock_balances(departmentId, productId)` — UNIQUE
- `journal_entries(departmentId, accountId, journalDate)`
- `ledgers(accountId, departmentId)`, `ledgers(accountId, ledgerDate)`
- `payments(departmentId, paymentDate)`

### Secondary Indexes (for filtering and reporting)
- `purchases(purchaseDate, status)`
- `sales(saleDate, status)`
- `expenses(expenseDate, status, departmentId)`
- `fuel_logs(vehicleId, fuelDate)`
- `maintenance_logs(vehicleId, maintenanceDate)`
- `trip_logs(vehicleId, tripDate)`
- `stock_movements(movementDate, departmentId)`
- `journal_entries(journalDate, departmentId, status)`
- `audit_logs(createdAt, userId, entityType)`
- `account_balances(departmentId, partyType)`

---

## 11. Constraints Summary

### Unique Constraints
- `departments(name)`
- `employees(email)` — Where not null
- `workers(email)` — Where not null
- `customers(email)` — Where not null
- `shop_owners(email)` — Where not null
- `brokers(email)` — Where not null
- `suppliers(email)` — Where not null
- `farm_owners(email)` — Where not null
- `products(code)`
- `vehicles(registrationNumber)`
- `purchases(voucherNumber)`
- `sales(voucherNumber)`
- `returns(voucherNumber)`
- `adjustments(voucherNumber)`
- `expenses(voucherNumber)`
- `journal_entries(voucherNumber)`
- `payments(voucherNumber)`
- `accounts(code)`
- `stock_balances(departmentId, productId)`

### Check Constraints
- `purchases(quantity > 0, ratePerUnit ≥ 0, totalAmount = quantity * ratePerUnit)`
- `sales(quantity > 0, ratePerUnit ≥ 0, finalAmount ≥ totalAmount)`
- `stock_movements(movementDate ≥ purchaseDate | saleDate)`
- `stock_balances(currentQuantity ≥ 0)`
- `accounts(type IN (...), normalBalance IN (...))`
- `payments(amount > 0, paymentDate ≤ today)`

### Foreign Key Cascade Rules
- `departmentId` → CASCADE DELETE (rarely used; soft delete preferred)
- `supplierId`, `customerId`, etc. → RESTRICT (must deactivate first)
- `productId` → RESTRICT (must deactivate first)

---

## 12. Denormalization and Performance Considerations

### Cached Fields (Denormalized for Speed)
- `purchases.remainingQty` — Decremented on returns; derived from `stock_movements`
- `sales.remainingQty` — Decremented on returns; derived from `stock_movements`
- `customers.currentBalance`, `suppliers.currentBalance`, etc. — Derived from GL and payments
- `stock_balances` — Entire table is a cached view of `stock_movements`

### Maintenance
- Balance and stock balance updates triggered on every transaction post.
- Batch reconciliation scheduled nightly to catch anomalies.

---

## 13. Data Integrity Rules

1. **Balanced Accounting:** Sum(DEBIT) = Sum(CREDIT) for every posted transaction.
2. **Stock Reconciliation:** Σ(stock_movements) ≤ stock_balances(currentQuantity).
3. **Party Uniqueness:** One customer/supplier/etc. per master record; no duplicates.
4. **Voucher Sequencing:** Voucher numbers follow sequential order within department.
5. **Immutable Posted Records:** Once status = 'POSTED', cannot update; must reverse.
6. **Soft Deletes:** All business records soft-deleted (deletedAt != null) rather than hard-deleted.
7. **Audit Trail:** Every DML captured in `audit_logs`; immutable.

---

## 14. Sample Normalization Validation

### Example: Purchase Order Normalization Check

| Step | Rule | Validation |
|------|------|-----------|
| 1NF | No repeating groups | Each attribute is atomic; no arrays or JSON in base columns |
| 2NF | All non-key attributes depend on full PK | `voucherNumber` depends on `purchases(id)` + `departmentId` |
| 3NF | No transitive dependencies | `totalAmount = quantity * ratePerUnit` (calculated, not stored) OR stored with check constraint |

**Result:** ✅ 3NF Compliant

---

## 15. Summary

This schema supports:
- ✅ Full double-entry accounting with chart of accounts
- ✅ Department-wise transaction tracking and P&L analysis
- ✅ Weight-based inventory with lot/batch/temperature/spoilage tracking
- ✅ Multi-party transactions (customers, suppliers, brokers, shop owners, farm owners)
- ✅ Vehicle and fleet management with fuel, maintenance, trip logs
- ✅ Commission and margin calculation
- ✅ Credit and settlement management
- ✅ Soft delete and reversal-based corrections
- ✅ Audit trail and maker-checker approval workflows
- ✅ Attachment and document management
- ✅ Industry-standard 3NF normalization with strategic denormalization for performance

**Compliance:** This schema fully implements the requirements of the Poultry ERP SRS (Section 4.1–4.12, Sections 6–7).

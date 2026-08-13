# Software Requirements Specification

## Poultry Business Management System

**Document Version:** 2.0

**Status:** Updated - Personnel Consolidation

**Last Updated:** January 2025

**Standard Basis:** IEEE-style SRS structure adapted for business and accounting requirements

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and non-functional requirements for a Poultry Business Management System (PBMS) that manages four operational departments under a single company structure:

1. Brokerage Department
2. Supply Department
3. Wastage Department
4. Fresh Chicken Shop Department

The system must support full operational control, accounting-grade financial tracking, departmental reporting, inventory traceability, vehicle management, employee/worker records, and centralized expense management.

### 1.2 Scope

The system will provide:

- Double-entry accounting
- Department-wise profit and loss analysis
- Purchase, sale, return, cancellation, and adjustment workflows
- Credit and cash settlement handling
- Inventory movement and valuation
- Lot/batch, spoilage, shrinkage, and temperature-related stock tracking
- Vehicle, fuel, maintenance, insurance, driver, and trip tracking
- Master data management for all parties and personnel (managed via Users)
- Personnel management with role-based access and salary tracking
- Expense approvals and centralized expense visibility
- Audit trail, maker-checker controls, and role-based permissions
- Reports for accounting, operations, inventory, and settlements

### 1.3 Intended Audience

- Business owner and management team
- Accounting team
- Department supervisors
- Operations staff
- Software development team
- QA and testing team
- Implementation and support team

### 1.4 Definitions

- **Department**: A business head or operational unit under the same company.
- **Chart of Accounts**: Structured list of ledger accounts used for accounting.
- **Journal Entry**: Double-entry accounting record with debit and credit lines.
- **Maker-Checker**: Workflow where one user creates a record and another approves it.
- **Lot/Batch**: Traceable inventory grouping for operational and quality control purposes.
- **Shrinkage**: Inventory loss due to handling, transport, or operational variance.
- **Spoilage**: Inventory loss due to quality deterioration or temperature issues.
- **Settlement**: Payment or balancing of a credit transaction.

### 1.5 References

- IEEE SRS structure principles
- Standard accounting practices for double-entry bookkeeping
- Standard internal control practices for operational systems

---

## 2. Overall Description

### 2.1 Product Perspective

PBMS is a centralized enterprise system for a poultry-related business with multiple departments sharing a common accounting core. Each department operates with its own operational workflows while posting financial impact into a unified ledger structure.

### 2.2 Product Functions

The system shall support:

- User authentication and authorization
- Master data registration
- Department-specific purchase and sales workflows
- Invoice, voucher, and document numbering
- Accounting postings for every financial transaction
- Expense tracking and approval
- Vehicle and logistics operations
- Inventory tracing and reconciliation
- Reporting and analytics
- Audit logging and document attachment support

### 2.3 User Classes

- **Administrator**: Full system control and configuration
- **Accountant**: Financial entry, reconciliation, reporting, and approvals
- **Department Manager**: Operational supervision and approvals within a department
- **Data Entry Operator**: Transaction entry and documentation
- **Employee**: Department-assigned personnel with monthly salary
- **Worker**: Department-assigned personnel with daily wage
- **Driver**: Personnel assigned to vehicles for logistics operations
- **Auditor/Viewer**: Read-only access to reports and logs

**Note**: All user types (Admin, Accountant, Manager, Employee, Worker, Driver, etc.) are managed through a single Users table with role-based differentiation and department assignment.

### 2.4 Operating Environment

- Web-based application
- Centralized backend with relational database
- Role-based access control
- Support for desktop and mobile browser usage
- File attachment storage for vouchers, invoices, and supporting documents

### 2.5 Design and Implementation Constraints

- All financial entries must follow double-entry accounting rules.
- Every transaction must be traceable by voucher number and audit log.
- Departmental cost/profit reporting must be preserved even when accounts are centralized.
- The system shall support configurable permissions by role and department.
- Tax handling shall remain generic and country-neutral unless configured otherwise later.

### 2.6 Assumptions and Dependencies

- The company operates under one legal entity.
- Inventory is primarily weight-based.
- Separate master records exist for brokers, suppliers/farm owners, customers, and shop owners.
- All personnel (employees, workers, drivers) are managed through the Users table with role-based assignment.
- Users are assigned to specific departments and have associated salary/wage information.
- Transactions may involve cash, credit, partial payment, or advance settlement.

---

## 3. Business Model and Department Structure

### 3.1 Common Enterprise Model

The system shall treat the organization as a single company with four departments. Every financial and operational transaction must be linked to a department.

### 3.2 Department Responsibilities

#### 3.2.1 Brokerage Department

- Purchases poultry products from external poultry farms at farm-set rates
- Sells onward after adding commission
- Tracks purchases, sales, expenses, vehicles, and personnel (users assigned to department)
- Posts all related financial entries into the accounting system

#### 3.2.2 Supply Department

- Purchases poultry products through brokers at agreed rates
- Sells to chicken shops after adding commission
- Tracks shop owners, vehicles, personnel (users assigned to department), purchases, sales, and expenses
- Posts all related financial entries into the accounting system

#### 3.2.3 Wastage Department

- Purchases poultry waste from chicken shops at agreed rates
- Sells to factories after adding commission
- Tracks shop owners, vehicles, personnel (users assigned to department), purchases, sales, and expenses
- Posts all related financial entries into the accounting system

#### 3.2.4 Fresh Chicken Shop Department

- Purchases chickens from Supply Department
- Sells fresh chicken products directly to customers after adding profit margin
- Tracks customer accounts, inventory, daily purchase and sales, personnel (users assigned to department), and expenses
- Posts all related financial entries into the accounting system

### 3.3 Centralized Expense Management

All departments shall contribute to a centralized expense management layer for consolidated visibility, approval, and reporting.

---

## 4. Functional Requirements

### 4.1 Authentication and Access Control

FR-001 The system shall require authenticated access for all internal users.

FR-002 The system shall enforce role-based access control.

FR-003 The system shall support a detailed permissions matrix by role and department.

FR-004 The system shall record access-sensitive actions in an audit log.

FR-005 The system shall support maker-checker approval for controlled transactions.

### 4.2 Master Data Management

FR-010 The system shall manage master records for:
- Business parties: customers, shop owners, brokers, suppliers, farm owners
- Operational data: vehicles, products, accounts, departments
- Personnel: managed through Users table with role and department assignment

FR-011 The system shall allow create, view, update, deactivate, and search operations for master data.

FR-012 The system shall support unique identifiers for each master record type.

FR-013 The system shall support contact, address, tax, credit, and status information for parties.

FR-014 The system shall support assigning users to specific departments with appropriate roles.

### 4.2.1 Personnel Management (Users Table)

FR-015 The system shall maintain all personnel records in a unified Users table.

FR-016 The system shall support the following personnel-related fields in the Users table:
- Basic: name, email, phone, address fields
- Employment: employeeId, departmentId, designation, joiningDate, resignationDate
- Compensation: employmentType (SALARY/DAILY_WAGE), monthlySalary, dailyWage
- Banking: bankAccountName, bankAccountNumber, bankName, bankBranch
- Emergency: emergencyContactName, emergencyContactPhone
- Status: isActive, verifiedAt

FR-017 The system shall support role-based user types including:
- ADMIN - Full system access
- ACCOUNTANT - Financial operations
- MANAGER - Department management
- DATA_ENTRY - Transaction entry
- EMPLOYEE - Department employee with monthly salary
- WORKER - Department worker with daily wage
- DRIVER - Vehicle operations
- AUDITOR - Read-only access

FR-018 The system shall filter users by department for department-specific operations.

FR-019 The system shall track salary history and payment records for all personnel.

FR-020 The system shall support salary advances and deductions tracking.

### 4.3 Brokerage Department Requirements

FR-021 The system shall record purchase transactions from external poultry farms.

FR-022 The system shall record sales transactions to onward buyers.

FR-023 The system shall calculate commission-based sale pricing per configured rule or transaction.

FR-024 The system shall maintain brokerage department accounts separately within the common ledger.

FR-025 The system shall track brokerage-specific vehicle usage, fuel, maintenance, and trip logs.

FR-026 The system shall maintain user records (personnel) assigned to the Brokerage Department with appropriate roles.

FR-027 The system shall allow brokerage-specific expenses and approvals.

### 4.4 Supply Department Requirements

FR-028 The system shall record purchases from brokers.

FR-029 The system shall record sales to chicken shops.

FR-030 The system shall track shop owner accounts and transaction histories.

FR-031 The system shall calculate commission or margin per configured rule or transaction.

FR-032 The system shall track supply vehicles, fuel, maintenance, driver assignment, insurance, and trip logs.

FR-033 The system shall maintain user records (personnel) assigned to the Supply Department with appropriate roles.

FR-034 The system shall allow supply-specific expenses and approvals.

### 4.5 Wastage Department Requirements

FR-035 The system shall record purchases of poultry waste from chicken shops.

FR-036 The system shall record sales of poultry waste to factories.

FR-037 The system shall track shop owner accounts and waste-related transaction histories.

FR-038 The system shall calculate commission or margin per configured rule or transaction.

FR-039 The system shall track wastage vehicles, fuel, maintenance, driver assignment, insurance, and trip logs.

FR-040 The system shall maintain user records (personnel) assigned to the Wastage Department with appropriate roles.

FR-041 The system shall allow wastage-specific expenses and approvals.

### 4.6 Fresh Chicken Shop Requirements

FR-042 The system shall record purchases from the Supply Department.

FR-043 The system shall record sales to customers.

FR-044 The system shall track customer accounts and full transaction histories.

FR-045 The system shall calculate profit margin per configured rule or transaction.

FR-046 The system shall maintain daily purchase and sales records.

FR-047 The system shall maintain user records (personnel) assigned to the Fresh Chicken Shop Department with appropriate roles.

FR-048 The system shall support inventory-related activities for shop operations.

FR-049 The system shall allow fresh chicken shop-specific expenses and approvals.

### 4.7 Inventory Management

FR-050 The system shall track inventory using weight-based quantities.

FR-051 The system shall support lot and batch identification for inventory movement.

FR-052 The system shall track shrinkage, loss, spoilage, and temperature-related quality issues.

FR-053 The system shall support stock receipts, issues, transfers, returns, adjustments, and write-offs.

FR-054 The system shall support inventory valuation reporting.

FR-055 The system shall maintain inventory movement history by department, product, and batch.

### 4.8 Accounting and Finance

FR-056 The system shall maintain a chart of accounts.

FR-057 The system shall post every financial transaction as a balanced double-entry journal entry.

FR-058 The system shall maintain general ledger, sub-ledger, cash book, and bank book records.

FR-059 The system shall support customer, supplier, broker, and department balances.

FR-060 The system shall support credit sales, purchase settlements, partial payments, and advances.

FR-061 The system shall support returns, cancellations, reversals, and corrective journal entries.

FR-062 The system shall generate voucher numbers and document references sequentially.

FR-063 The system shall support departmental profit and loss reporting.

FR-064 The system shall support trial balance and period-end closing reports.

### 4.9 Expense Management

FR-065 The system shall record all miscellaneous and operational expenses across all departments.

FR-066 The system shall allow expenses to be tied to a department, vehicle, user (personnel), or project-like cost center.

FR-067 The system shall support department-level approval of expenses.

FR-068 The system shall support attachment upload for supporting documents.

FR-069 The system shall support expense categorization and recurring expense tracking where configured.

### 4.10 Vehicle and Logistics Management

FR-070 The system shall maintain vehicle registration, ownership, status, and assignment data.

FR-071 The system shall record fuel purchases and consumption.

FR-072 The system shall record maintenance and service history.

FR-073 The system shall record insurance and renewal dates.

FR-074 The system shall record driver assignments (users with driver role) and trip details.

FR-075 The system shall link vehicle expenses to the relevant department and financial postings.

### 4.11 Reporting

FR-076 The system shall generate department-wise profit and loss statements.

FR-077 The system shall generate trial balance, general ledger, cash book, and bank book reports.

FR-078 The system shall generate purchase and sales registers.

FR-079 The system shall generate customer and supplier statements.

FR-080 The system shall generate inventory movement and stock valuation reports.

FR-081 The system shall generate vehicle fuel and maintenance reports.

FR-082 The system shall generate personnel salary and settlement reports.

FR-083 The system shall provide centralized expense reports by department and category.

FR-084 The system shall support date-range, department, party, and voucher-based report filters.

### 4.12 Audit and Controls

FR-085 The system shall maintain an immutable audit trail for all key business actions.

FR-086 The system shall support soft delete for operational records where business rules allow it.

FR-087 The system shall support reversal rather than destructive editing for posted financial transactions.

FR-088 The system shall retain the source user, timestamp, department, and IP or session metadata where available.

FR-089 The system shall restrict sensitive financial actions to authorized roles.

---

## 5. Primary Workflows and Scenarios

### 5.1 Purchase Workflow

1. User creates purchase draft.
2. System validates party, department, quantity, rate, and payment terms.
3. System calculates value, tax if applicable, and expected accounting impact.
4. Authorized user approves or posts the transaction.
5. System creates inventory movement and journal entries.

### 5.2 Sales Workflow

1. User creates sales draft.
2. System validates customer, department, quantity, rate, commission or margin, and credit terms.
3. System checks stock availability where applicable.
4. Authorized user posts the sale.
5. System updates receivables, inventory, and accounting entries.

### 5.3 Return and Cancellation Workflow

1. User selects the original transaction.
2. System identifies whether the reversal is full or partial.
3. System updates inventory and accounting through reversal entries.
4. System logs the reason for the return or cancellation.
5. If approval is required, the maker-checker flow applies.

### 5.4 Expense Workflow

1. User enters expense details and attaches evidence if available.
2. System checks department, category, amount, and approval rule.
3. Approver reviews the expense.
4. System records the approved expense and accounting impact.
5. Expense appears in departmental and centralized reports.

### 5.5 Vehicle Fuel and Maintenance Workflow

1. User logs fuel or maintenance activity.
2. System validates vehicle, driver, department, and cost.
3. System posts the cost to the assigned department.
4. Activity is available in vehicle and expense reporting.

### 5.6 Settlement Workflow

1. User records payment against a customer or supplier balance.
2. System applies payment to open items according to configured logic.
3. System supports partial settlement and advance recording.
4. Remaining balance stays open until fully cleared.

---

## 6. Accounting Rules

AR-001 Every posted financial transaction shall produce balanced debits and credits.

AR-002 Every operational department shall have traceable accounting impact in the common ledger.

AR-003 Revenue, expense, asset, liability, and equity accounts shall be classified in a standard chart of accounts.

AR-004 Commission and margin calculations shall be configurable by transaction, party, or department settings.

AR-005 Credit balances shall be maintained by party type and department where relevant.

AR-006 Reversals shall preserve audit history rather than overwriting the original transaction.

AR-007 Period closing shall not delete historical data.

AR-008 Department-level profit reporting shall be derived from ledger postings and operational data.

---

## 7. Data Requirements

### 7.1 Core Data Entities

**Authentication & Authorization:**
- Users (includes all personnel: employees, workers, drivers, managers, etc.)
- Roles
- Permissions
- RolePermissions

**Master Data:**
- Departments
- Customers
- Shop Owners
- Brokers
- Suppliers
- Farm Owners
- Vehicles
- Products
- Accounts (Chart of Accounts)

**Transactions:**
- Purchases
- Sales
- Returns
- Adjustments
- Transfers
- Expenses

**Inventory:**
- Stock Movements
- Stock Balance
- Batches (Lot tracking)

**Fleet Management:**
- Fuel Logs
- Maintenance Logs
- Trip Logs
- Insurance Policies
- Vehicle Documents

**Accounting:**
- Journal Entries
- Ledger
- Account Balance
- Voucher Counters

**Salary Management (NEW):**
- Salary Configurations
- Salary Payments
- Salary Advances
- Salary Deductions

**Payments & Settlements:**
- Payments

**Controls:**
- Attachments
- Audit Logs
- Approval Workflows
- Period Close

### 7.2 Data Integrity Rules

- Each transactional record shall reference a department.
- Each financial posting shall reference the source business document.
- Each stock movement shall reference quantity, weight, and batch where applicable.
- Each attachment shall reference the parent transaction.
- Each approval shall reference the approver and approval time.

---

## 8. Non-Functional Requirements

### 8.1 Security

NFR-001 The system shall enforce authentication and authorization for all protected features.

NFR-002 The system shall restrict access by role and department.

NFR-003 The system shall log sensitive operations for audit purposes.

### 8.2 Performance

NFR-010 The system shall support operational entry screens with responsive performance for normal business workloads.

NFR-011 Reports shall be filterable and return within acceptable operational time for the current data volume.

### 8.3 Reliability

NFR-020 The system shall prevent posting of unbalanced accounting transactions.

NFR-021 The system shall preserve historical financial data after correction or reversal.

### 8.4 Usability

NFR-030 The system shall support business users with minimal accounting knowledge through guided forms and validation.

NFR-031 The system shall provide clear error messages for missing or invalid data.

### 8.5 Maintainability

NFR-040 The system shall keep department logic modular so future departments or branches can be added.

NFR-041 The system shall keep accounting rules configurable rather than hard-coded where feasible.

---

## 9. Permissions Matrix Requirement

The system shall define permissions by role and by module. At minimum, permissions shall cover:

- Dashboard access
- Master data management
- Department transaction entry
- Approval workflows
- Accounting entry posting
- Ledger and report access
- Expense authorization
- Vehicle and logistics management
- Inventory adjustment authority
- User and role administration
- Audit log viewing

Each permission shall be scoped to one of the following actions as applicable:

- Create
- Read
- Update
- Delete
- Approve
- Reject
- Post
- Reverse
- View all
- View own
- Report
- Configure
- Export
- Import

---

## 10. Acceptance Criteria

The system shall be considered ready for implementation when:

1. Each department workflow is traceable end-to-end.
2. All financial transactions produce valid accounting entries.
3. Department-wise reporting can be generated from ledger and operational data.
4. Inventory movements reconcile with purchase, sales, returns, and adjustments.
5. Approval and audit controls are enforced.
6. Vehicle, expense, and settlement records are linked to accounting impact.
7. Role-based access covers the required business areas.

---

## 11. Out of Scope for This Draft

- Payroll engine and statutory salary processing
- Full tax filing automation beyond generic tax support
- External accounting software synchronization
- Multi-company consolidation
- Advanced forecasting and AI-driven optimization
- Mobile native applications

---

## 12. Implementation Notes

### 12.1 Completed Phases (Phase 1-4)
- ✅ Users, roles, permissions, and authentication foundation
- ✅ Department management
- ✅ Product and inventory management
- ✅ Accounting core (journal entries, voucher numbering)
- ✅ Master data (customers, suppliers, brokers, etc.)
- ✅ Purchase and sales transactions with GL posting
- ✅ Stock movement automation
- ✅ Fleet management basics
- ✅ Basic reporting

### 12.2 Personnel Consolidation Changes
**IMPORTANT**: This version consolidates Employee and Worker tables into the Users table.

**Migration Required:**
1. Extend Users table with employment fields (salary, department, employee ID, etc.)
2. Migrate existing Employee records to Users table with role=EMPLOYEE
3. Migrate existing Worker records to Users table with role=WORKER
4. Add Driver role for vehicle operators
5. Drop Employee and Worker tables after successful migration
6. Update all foreign key references from employeeId/workerId to userId

**Benefits:**
- Unified authentication and personnel management
- Single source of truth for all personnel data
- Simplified role-based access control
- Easier department filtering
- Integrated salary and compensation management

### 12.3 Next Implementation Phases
Refer to `missing-phases-roadmap.md` for detailed implementation plan of remaining features.

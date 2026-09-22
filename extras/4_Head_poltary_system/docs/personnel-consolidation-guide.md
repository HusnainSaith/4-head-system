# Personnel Consolidation Implementation Guide

## Document Version: 1.0
**Last Updated:** January 2025

---

## Overview

This guide consolidates Employee and Worker tables into the Users table with role-based management.

---

## Migration Steps

### STEP 1: Backup Current Database
```bash
pg_dump -U postgres -d 4Head_db > backup_before_consolidation.sql
```

### STEP 2: Run Migration (See migration file below)

### STEP 3: Update Application Code (See code updates below)

### STEP 4: Test & Verify

---

## Database Changes

### New User Table Fields
- employeeId (unique)
- departmentId (FK to departments)
- designation
- joiningDate, resignationDate
- employmentType (SALARY/DAILY_WAGE)
- monthlySalary, dailyWage
- Bank details (accountName, accountNumber, bankName, branch)
- Address (street, city, state, postalCode, country)
- Emergency contact
- nationalIdNumber, dateOfBirth, bloodGroup, gender

### Tables to Drop
- employees
- workers

### Foreign Key Updates
- expenses.employeeId → expenses.userId
- trip_logs.driverEmployeeId → trip_logs.driverUserId
- All other employee/worker references → userId

---

## New Roles
- EMPLOYEE (monthly salary)
- WORKER (daily wage)
- DRIVER (vehicle operations)

---

## API Changes

### New Endpoints
```
GET    /users/employees?departmentId=X
GET    /users/workers?departmentId=X
GET    /users/drivers?departmentId=X
GET    /users/department/:departmentId
GET    /users/:id/salary-details
PATCH  /users/:id/assign-department
PATCH  /users/:id/update-salary
POST   /users/:id/resignation
```

### Deprecated Endpoints
```
/employees/* (all endpoints)
/workers/* (all endpoints)
```

---

## Verification Checklist

- [ ] All employees migrated with employmentType=SALARY
- [ ] All workers migrated with employmentType=DAILY_WAGE
- [ ] Roles assigned correctly
- [ ] Department assignments preserved
- [ ] Foreign keys updated
- [ ] Old tables dropped
- [ ] Tests passing

---

**Refer to migration file and updated entity for implementation details**

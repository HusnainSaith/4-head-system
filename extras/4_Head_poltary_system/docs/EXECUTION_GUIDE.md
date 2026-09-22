# Personnel Consolidation - Execution Guide

## ⚡ Quick Start (5 Minutes)

### Prerequisites
- ✅ Database backup completed
- ✅ Application not running
- ✅ All code changes committed

---

## Step-by-Step Execution

### 1️⃣ Backup Database (MANDATORY)
```bash
cd d:\work\4Head\4Head_backend
pg_dump -U postgres -d 4Head_db > backup_before_consolidation_$(date +%Y%m%d_%H%M%S).sql
```

### 2️⃣ Run Migration
```bash
npm run migration:run
```

**Expected Output:**
```
Migration 1737849600000-ConsolidatePersonnelIntoUsers has been executed successfully.
```

### 3️⃣ Verify Migration Success
```bash
# Connect to database
psql -U postgres -d 4Head_db

# Run verification queries
SELECT 
  'Users' as table_name,
  COUNT(*) as total,
  SUM(CASE WHEN employment_type = 'SALARY' THEN 1 ELSE 0 END) as employees,
  SUM(CASE WHEN employment_type = 'DAILY_WAGE' THEN 1 ELSE 0 END) as workers
FROM users WHERE deleted_at IS NULL;

# Check old tables are gone
\dt employees
\dt workers

# Exit psql
\q
```

### 4️⃣ Start Application
```bash
npm run start:dev
```

**Expected Output:**
```
[Nest] Application successfully started
```

### 5️⃣ Test New Endpoints

#### Get JWT Token First
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'

# Save the token from response
export TOKEN="<your-jwt-token>"
```

#### Test Employees Endpoint
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/users/employees
```

#### Test Workers Endpoint
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/users/workers
```

#### Test Department Filtering
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/users/employees?departmentId=<dept-id>"
```

---

## 🔴 If Something Goes Wrong

### Rollback Procedure
```bash
# Stop application
# Ctrl+C

# Revert migration
npm run migration:revert

# Restart application
npm run start:dev
```

### Restore from Backup
```bash
# Stop application
# Drop and recreate database
psql -U postgres -c "DROP DATABASE 4Head_db;"
psql -U postgres -c "CREATE DATABASE 4Head_db;"

# Restore backup
psql -U postgres -d 4Head_db < backup_before_consolidation_*.sql

# Restart application
npm run start:dev
```

---

## ✅ Success Checklist

After execution, verify:

- [ ] Migration completed without errors
- [ ] Application starts successfully
- [ ] `/users/employees` returns data
- [ ] `/users/workers` returns data
- [ ] No errors in console
- [ ] Old `/employees` endpoints return 404 (expected after module removal)
- [ ] Database backup exists

---

## 📊 Quick Health Check

```bash
# Check application is running
curl http://localhost:3000/

# Check employees endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/users/employees | jq '.data | length'

# Check workers endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/users/workers | jq '.data | length'
```

---

## 🎯 What Changed

### Database
- ✅ `employees` table → merged into `users`
- ✅ `workers` table → merged into `users`
- ✅ `users` table: +27 new columns
- ✅ New roles: EMPLOYEE, WORKER, DRIVER

### API
- ✅ 9 new personnel endpoints
- ✅ Department filtering support
- ✅ Salary management endpoints

### Code
- ✅ User entity extended
- ✅ UserService enhanced
- ✅ UserController updated
- ✅ DTOs updated

---

## 📞 Support

### If Migration Fails
1. Check error message
2. Run rollback: `npm run migration:revert`
3. Fix issue
4. Try again: `npm run migration:run`

### If Application Won't Start
1. Check console for errors
2. Verify migration completed: `npm run migration:show`
3. Check database connection
4. Review logs

### If Endpoints Don't Work
1. Verify authentication token is valid
2. Check user has correct permissions
3. Verify migration completed successfully
4. Check application logs

---

## 🚀 Next Steps After Success

1. **Update Related Services**
   - Expense service
   - Trip log service
   - Driver service

2. **Remove Old Modules** (optional)
   - Delete employee/worker services
   - Delete employee/worker controllers

3. **Phase 6.2: Implement Salary Management**
   - Salary configurations
   - Salary payments
   - Salary advances

4. **Update Tests**
   - Integration tests
   - E2E tests

---

## 📝 Command Cheat Sheet

```bash
# Migration
npm run migration:run          # Execute migration
npm run migration:revert       # Rollback migration
npm run migration:show         # Show migration status

# Application
npm run start:dev              # Start in development
npm run build                  # Build for production
npm run start:prod             # Start in production

# Database
pg_dump -U postgres 4Head_db > backup.sql  # Backup
psql -U postgres -d 4Head_db < backup.sql  # Restore

# Testing
npm run test                   # Unit tests
npm run test:e2e              # E2E tests
```

---

**Status**: ✅ READY  
**Estimated Time**: 5 minutes  
**Risk Level**: Low (rollback available)

# PHASE 9: Security, Audit & Controls - Quick Start Guide

## Overview
Phase 9 implements enterprise-grade security with audit trails, RBAC, maker-checker workflows, and attachment management.

---

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Migrations
```bash
npm run migration:run
```

### 3. Seed Permissions
```bash
npm run seed
```

### 4. Start Server
```bash
npm run start:dev
```

---

## Key Features

### 🔍 Audit Trail
- Automatic logging of all operations
- Query by user, entity, action, date
- Export functionality

### 🔒 RBAC
- 100+ granular permissions
- Role-based access control
- Permission guards on all endpoints

### ✅ Maker-Checker
- Approval workflows
- Configurable thresholds
- Multi-level support

### 📎 Attachments
- File upload/download
- Document management
- Parent entity linking

---

## Testing Phase 9

### Run All Tests
```bash
npm run test:e2e -- test/integration/phase9.e2e-spec.ts
```

### Test Individual Features
```bash
# Audit Trail
curl -H "Authorization: Bearer <token>" http://localhost:3000/audit-logs

# Approvals
curl -H "Authorization: Bearer <token>" http://localhost:3000/approvals/pending

# Attachments
curl -H "Authorization: Bearer <token>" http://localhost:3000/attachments/statistics
```

---

## API Usage

### Get Audit Logs
```bash
GET /audit-logs
GET /audit-logs/user/:userId
GET /audit-logs/entity/:entityType/:entityId
```

### Approval Workflow
```bash
GET /approvals/pending
POST /approvals/:id/approve
POST /approvals/:id/reject
```

### Attachment Management
```bash
POST /attachments/upload
GET /attachments/:parentType/:parentId
GET /attachments/:id/download
DELETE /attachments/:id
```

---

## Permission Examples

### Purchase with Permission
```typescript
@Post()
@Permissions('purchases.create')
create(@Body() dto: CreatePurchaseDto) {
  return this.service.create(dto);
}
```

### Report Access
```typescript
@Get('profit-loss')
@Permissions('reports.view_all')
getProfitLoss() {
  return this.service.getProfitLoss();
}
```

---

## Troubleshooting

### "Access denied" error
- Check user has required permission
- Verify role has permission assigned
- Check JWT token is valid

### Audit logs not appearing
- Ensure user is authenticated
- Check operation is not GET request
- Wait 500ms for async logging

### File upload fails
- Check file size < 10MB
- Verify multipart/form-data
- Ensure uploads directory exists

---

## Next Phase
Phase 10: Department-Specific Features

See `PHASE9_COMPLETION_REPORT.md` for detailed documentation.

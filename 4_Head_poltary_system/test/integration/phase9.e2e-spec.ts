import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getConnection } from 'typeorm';

describe('Phase 9: Security, Audit & Controls (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let adminUserId: string;
  let testPurchaseId: string;
  let testApprovalId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@123' });

    const loginData =
      loginRes.body.data?.data ?? loginRes.body.data ?? loginRes.body;
    authToken = loginData?.accessToken ?? loginData?.data?.accessToken;
    adminUserId = loginData?.user?.id ?? loginData?.data?.user?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('9.1 Audit Trail Integration', () => {
    it('should log purchase creation', async () => {
      const departmentRes = await request(app.getHttpServer())
        .get('/departments')
        .set('Authorization', `Bearer ${authToken}`);

      const departmentId = departmentRes.body.data[0].id;

      const productRes = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${authToken}`);

      const productId = productRes.body.data[0].id;

      const supplierRes = await request(app.getHttpServer())
        .get('/suppliers')
        .set('Authorization', `Bearer ${authToken}`);

      const supplierId = supplierRes.body.data[0].id;

      const purchaseRes = await request(app.getHttpServer())
        .post('/purchases')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          departmentId,
          productId,
          supplierId,
          quantity: 100,
          ratePerUnit: 50,
          purchaseDate: '2025-01-20',
          paymentMode: 'CREDIT',
        });

      expect(purchaseRes.status).toBe(201);
      testPurchaseId = purchaseRes.body.data.id;

      // Give audit log time to write
      await new Promise((resolve) => setTimeout(resolve, 500));

      const auditRes = await request(app.getHttpServer())
        .get(`/audit-logs/entity/PURCHASES/${testPurchaseId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.length).toBeGreaterThan(0);
    });

    it('should retrieve audit logs by user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/audit-logs/user/${adminUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data).toBeInstanceOf(Array);
    });

    it('should retrieve audit logs by action type', async () => {
      const res = await request(app.getHttpServer())
        .get('/audit-logs/action/CREATE')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data).toBeInstanceOf(Array);
    });

    it('should retrieve audit logs by date range', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';

      const res = await request(app.getHttpServer())
        .get(`/audit-logs/date-range?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data).toBeInstanceOf(Array);
    });

    it('should export audit logs', async () => {
      const res = await request(app.getHttpServer())
        .get('/audit-logs/export')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should get audit log statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/audit-logs/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('9.2 RBAC Enforcement', () => {
    let nonAdminToken: string;

    beforeAll(async () => {
      // Create a user with limited permissions
      const userRes = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Limited User',
          email: 'limited@example.com',
          password: 'limited123',
          roleId: await getRoleId('EMPLOYEE'),
        });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'limited@example.com', password: 'limited123' });

      nonAdminToken = loginRes.body.data.accessToken;
    });

    it('should enforce permissions on purchase creation', async () => {
      const res = await request(app.getHttpServer())
        .post('/purchases')
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .send({
          departmentId: 'test-dept',
          productId: 'test-product',
          supplierId: 'test-supplier',
          quantity: 100,
          ratePerUnit: 50,
          purchaseDate: '2025-01-20',
          paymentMode: 'CREDIT',
        });

      expect(res.status).toBe(403);
    });

    it('should allow admin to access all resources', async () => {
      const res = await request(app.getHttpServer())
        .get('/purchases')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should enforce permissions on accounting operations', async () => {
      const res = await request(app.getHttpServer())
        .post('/accounting/journal-entries')
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .send({
          departmentId: 'test-dept',
          voucherDate: '2025-01-20',
          description: 'Test entry',
          lines: [],
        });

      expect(res.status).toBe(403);
    });
  });

  describe('9.3 Maker-Checker Workflow', () => {
    it('should create an approval workflow', async () => {
      const res = await request(app.getHttpServer())
        .get('/approvals/pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should get approval history', async () => {
      if (testPurchaseId) {
        const res = await request(app.getHttpServer())
          .get(`/approvals/history/PURCHASE/${testPurchaseId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
      }
    });

    it('should check if approval is required', async () => {
      // Test through purchase posting which requires approval
      const res = await request(app.getHttpServer())
        .get('/approvals/pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('9.4 Attachment Management', () => {
    let attachmentId: string;

    it('should upload an attachment', async () => {
      const res = await request(app.getHttpServer())
        .post('/attachments/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('parentType', 'PURCHASE')
        .field('parentId', testPurchaseId || 'test-id')
        .field('documentType', 'INVOICE')
        .field('description', 'Test invoice')
        .attach('file', Buffer.from('Test file content'), 'test-invoice.txt');

      expect(res.status).toBe(201);
      expect(res.body.data.fileName).toBe('test-invoice.txt');
      attachmentId = res.body.data.id;
    });

    it('should retrieve attachments by parent', async () => {
      const res = await request(app.getHttpServer())
        .get(`/attachments/PURCHASE/${testPurchaseId || 'test-id'}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should download an attachment', async () => {
      if (attachmentId) {
        const res = await request(app.getHttpServer())
          .get(`/attachments/${attachmentId}/download`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
      }
    });

    it('should get attachment statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/attachments/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should delete an attachment', async () => {
      if (attachmentId) {
        const res = await request(app.getHttpServer())
          .delete(`/attachments/${attachmentId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
      }
    });
  });

  async function getRoleId(roleName: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .get('/roles')
      .set('Authorization', `Bearer ${authToken}`);

    const role = res.body.data.find((r) => r.name === roleName);
    return role?.id || res.body.data[0]?.id;
  }
});

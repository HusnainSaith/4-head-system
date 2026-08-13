import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Phase 5: Core Transactions Completion (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let departmentId: string;
  let productId: string;
  let customerId: string;
  let supplierId: string;
  let purchaseId: string;
  let saleId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin_labverse@gmail.com', password: 'Admin@12345' })
      .expect(200);

    authToken = loginResponse.body.data.accessToken;

    // Get or create department
    const deptResponse = await request(app.getHttpServer())
      .get('/departments')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    departmentId = deptResponse.body.data[0]?.id;

    // Get or create product
    const productResponse = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    productId = productResponse.body.data[0]?.id;

    // Get customer and supplier
    const customerResponse = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    customerId = customerResponse.body.data[0]?.id;

    const supplierResponse = await request(app.getHttpServer())
      .get('/suppliers')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    supplierId = supplierResponse.body.data[0]?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('5.1 Return Transactions', () => {
    it('should create a purchase', async () => {
      const response = await request(app.getHttpServer())
        .post('/purchases')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          departmentId,
          supplierId,
          productId,
          quantity: 100,
          rate: 50,
          totalAmount: 5000,
          purchaseDate: new Date().toISOString(),
          paymentTerms: 'CREDIT',
        })
        .expect(201);

      purchaseId = response.body.data?.id || response.body.id;
      expect(purchaseId).toBeDefined();
    });

    it('should post the purchase', async () => {
      await request(app.getHttpServer())
        .post(`/purchases/${purchaseId}/post`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ approverUserId: 'system' })
        .expect(200);
    });

    it('should create a purchase return', async () => {
      const response = await request(app.getHttpServer())
        .post('/returns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          purchaseId,
          quantity: 20,
          returnAmount: 1000,
          reason: 'Quality issue',
          returnDate: new Date().toISOString(),
        })
        .expect(201);

      expect(
        response.body.data?.voucherNumber || response.body.voucherNumber,
      ).toBeDefined();
    });

    it('should create a sale', async () => {
      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          departmentId,
          customerId,
          productId,
          quantity: 30,
          rate: 75,
          totalAmount: 2250,
          saleDate: new Date().toISOString(),
          paymentTerms: 'CREDIT',
        })
        .expect(201);

      saleId = response.body.data?.id || response.body.id;
      expect(saleId).toBeDefined();
    });

    it('should post the sale', async () => {
      await request(app.getHttpServer())
        .post(`/sales/${saleId}/post`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ approverUserId: 'system' })
        .expect(200);
    });

    it('should create a sale return', async () => {
      const response = await request(app.getHttpServer())
        .post('/returns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          saleId,
          quantity: 5,
          returnAmount: 375,
          reason: 'Customer dissatisfaction',
          returnDate: new Date().toISOString(),
        })
        .expect(201);

      expect(
        response.body.data?.voucherNumber || response.body.voucherNumber,
      ).toBeDefined();
    });

    it('should get all returns', async () => {
      const response = await request(app.getHttpServer())
        .get('/returns')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it('should get returns by purchase', async () => {
      const response = await request(app.getHttpServer())
        .get(`/returns/purchase/${purchaseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it('should get returns by sale', async () => {
      const response = await request(app.getHttpServer())
        .get(`/returns/sale/${saleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });
  });

  describe('5.2 Adjustment Transactions', () => {
    let adjustmentId: string;

    it('should create a stock adjustment (increase)', async () => {
      const response = await request(app.getHttpServer())
        .post('/adjustments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          departmentId,
          productId,
          adjustmentType: 'CORRECTION',
          quantity: 10,
          ratePerUnit: 50,
          adjustmentDate: new Date().toISOString(),
          reason: 'Physical count correction',
        })
        .expect(201);

      adjustmentId = response.body.data?.id || response.body.id;
      expect(adjustmentId).toBeDefined();
    });

    it('should submit adjustment for approval', async () => {
      await request(app.getHttpServer())
        .post(`/adjustments/${adjustmentId}/submit`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should approve adjustment', async () => {
      await request(app.getHttpServer())
        .post(`/adjustments/${adjustmentId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ approverUserId: 'system' })
        .expect(200);
    });

    it('should post adjustment', async () => {
      await request(app.getHttpServer())
        .post(`/adjustments/${adjustmentId}/post`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ approverUserId: 'system' })
        .expect(200);
    });

    it('should create a shrinkage adjustment', async () => {
      const response = await request(app.getHttpServer())
        .post('/adjustments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          departmentId,
          productId,
          adjustmentType: 'SHRINKAGE',
          quantity: -5,
          ratePerUnit: 50,
          adjustmentDate: new Date().toISOString(),
          reason: 'Handling loss',
        })
        .expect(201);

      expect(response.body.data?.id || response.body.id).toBeDefined();
    });

    it('should create a spoilage adjustment', async () => {
      const response = await request(app.getHttpServer())
        .post('/adjustments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          departmentId,
          productId,
          adjustmentType: 'SPOILAGE',
          quantity: -3,
          ratePerUnit: 50,
          adjustmentDate: new Date().toISOString(),
          reason: 'Temperature issue',
        })
        .expect(201);

      expect(response.body.data?.id || response.body.id).toBeDefined();
    });

    it('should get all adjustments', async () => {
      const response = await request(app.getHttpServer())
        .get('/adjustments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it('should get pending approval adjustments', async () => {
      const response = await request(app.getHttpServer())
        .get('/adjustments/pending-approval')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });
  });

  describe('5.3 Transfer Transactions', () => {
    let transferId: string;
    let destinationDeptId: string;

    beforeAll(async () => {
      const deptResponse = await request(app.getHttpServer())
        .get('/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const depts = deptResponse.body.data || deptResponse.body;
      destinationDeptId = depts[1]?.id || depts[0]?.id;
    });

    it('should create a transfer', async () => {
      const response = await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceDepartmentId: departmentId,
          destinationDepartmentId: destinationDeptId,
          productId,
          quantity: 15,
          transferRate: 50,
          transferDate: new Date().toISOString(),
          reason: 'Stock rebalancing',
        })
        .expect(201);

      transferId = response.body.data?.id || response.body.id;
      expect(transferId).toBeDefined();
    });

    it('should submit transfer', async () => {
      await request(app.getHttpServer())
        .post(`/transfers/${transferId}/submit`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should approve transfer', async () => {
      await request(app.getHttpServer())
        .post(`/transfers/${transferId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ approverUserId: 'system' })
        .expect(200);
    });

    it('should dispatch transfer', async () => {
      await request(app.getHttpServer())
        .post(`/transfers/${transferId}/dispatch`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should receive transfer', async () => {
      await request(app.getHttpServer())
        .post(`/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ receiverUserId: 'system' })
        .expect(200);
    });

    it('should get all transfers', async () => {
      const response = await request(app.getHttpServer())
        .get('/transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it('should get in-transit transfers', async () => {
      const response = await request(app.getHttpServer())
        .get('/transfers/in-transit')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });
  });

  describe('5.4 Credit Note / Debit Note', () => {
    let creditNoteId: string;
    let debitNoteId: string;

    it('should create a credit note', async () => {
      const response = await request(app.getHttpServer())
        .post('/credit-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          departmentId,
          saleId,
          customerId,
          creditNoteType: 'SALES_RETURN',
          creditAmount: 500,
          creditNoteDate: new Date().toISOString(),
          reason: 'Quality issue',
        })
        .expect(201);

      creditNoteId = response.body.data?.id || response.body.id;
      expect(creditNoteId).toBeDefined();
    });

    it('should post a credit note', async () => {
      await request(app.getHttpServer())
        .post(`/credit-notes/${creditNoteId}/post`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ approverUserId: 'system' })
        .expect(200);
    });

    it('should get all credit notes', async () => {
      const response = await request(app.getHttpServer())
        .get('/credit-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it('should create a debit note', async () => {
      const response = await request(app.getHttpServer())
        .post('/debit-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          departmentId,
          purchaseId,
          supplierId,
          debitNoteType: 'PURCHASE_RETURN',
          debitAmount: 800,
          debitNoteDate: new Date().toISOString(),
          reason: 'Overcharged',
        })
        .expect(201);

      debitNoteId = response.body.data?.id || response.body.id;
      expect(debitNoteId).toBeDefined();
    });

    it('should post a debit note', async () => {
      await request(app.getHttpServer())
        .post(`/debit-notes/${debitNoteId}/post`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ approverUserId: 'system' })
        .expect(200);
    });

    it('should get all debit notes', async () => {
      const response = await request(app.getHttpServer())
        .get('/debit-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });
  });

  describe('Phase 5 Summary Tests', () => {
    it('should verify all transaction types are operational', async () => {
      const endpoints = [
        '/purchases',
        '/sales',
        '/returns',
        '/adjustments',
        '/transfers',
        '/credit-notes',
        '/debit-notes',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body.data || response.body)).toBe(true);
      }
    });

    it('should verify stock balance after all transactions', async () => {
      const response = await request(app.getHttpServer())
        .get('/stock-balance')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ departmentId, productId })
        .expect(200);

      const balance = response.body.data || response.body;
      expect(balance).toBeDefined();
    });
  });
});

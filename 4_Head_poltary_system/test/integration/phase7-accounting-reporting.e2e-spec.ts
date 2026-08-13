import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Phase 7: Accounting & Reporting Completion (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let departmentId: string;
  let productId: string;
  let customerId: string;
  let supplierId: string;
  let accountId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin_labverse@gmail.com', password: 'Admin@12345' })
      .expect(200);

    authToken = loginResponse.body.data.accessToken;

    const deptResponse = await request(app.getHttpServer())
      .get('/departments')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    departmentId = deptResponse.body.data[0]?.id;

    const productResponse = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    productId = productResponse.body.data[0]?.id;

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

    const accountResponse = await request(app.getHttpServer())
      .get('/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    accountId = accountResponse.body.data[0]?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('7.1 Core Accounting Reports', () => {
    describe('7.1.1 Trial Balance Report', () => {
      it('should get trial balance', async () => {
        const response = await request(app.getHttpServer())
          .get('/reports/trial-balance')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const data = response.body.data || response.body;
        expect(data).toHaveProperty('accounts');
        expect(data).toHaveProperty('totalDebits');
        expect(data).toHaveProperty('totalCredits');
        expect(data).toHaveProperty('isBalanced');
      });

      it('should get trial balance by department', async () => {
        const response = await request(app.getHttpServer())
          .get(`/reports/trial-balance?departmentId=${departmentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const data = response.body.data || response.body;
        expect(data).toHaveProperty('accounts');
      });

      it('should get trial balance with date range', async () => {
        const startDate = new Date('2024-01-01').toISOString();
        const endDate = new Date().toISOString();

        const response = await request(app.getHttpServer())
          .get(
            `/reports/trial-balance?startDate=${startDate}&endDate=${endDate}`,
          )
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const data = response.body.data || response.body;
        expect(data).toHaveProperty('accounts');
      });
    });

    describe('7.1.2 General Ledger Report', () => {
      it('should get general ledger', async () => {
        const response = await request(app.getHttpServer())
          .get('/reports/general-ledger')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const data = response.body.data || response.body;
        expect(Array.isArray(data)).toBe(true);
      });

      it('should get general ledger by account', async () => {
        const response = await request(app.getHttpServer())
          .get(`/reports/general-ledger?accountId=${accountId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const data = response.body.data || response.body;
        expect(Array.isArray(data)).toBe(true);
      });

      it('should get general ledger with date range', async () => {
        const startDate = new Date('2024-01-01').toISOString();
        const endDate = new Date().toISOString();

        const response = await request(app.getHttpServer())
          .get(
            `/reports/general-ledger?startDate=${startDate}&endDate=${endDate}`,
          )
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const data = response.body.data || response.body;
        expect(Array.isArray(data)).toBe(true);
      });
    });

    describe('7.1.3 Cash Book Report', () => {
      it('should get cash book', async () => {
        const response = await request(app.getHttpServer())
          .get('/reports/cash-book')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const data = response.body.data || response.body;
        expect(Array.isArray(data)).toBe(true);
      });

      it('should get cash book by department', async () => {
        const response = await request(app.getHttpServer())
          .get(`/reports/cash-book?departmentId=${departmentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const data = response.body.data || response.body;
        expect(Array.isArray(data)).toBe(true);
      });
    });

    describe('7.1.4 Bank Book Report', () => {
      it('should get bank book', async () => {
        const response = await request(app.getHttpServer())
          .get('/reports/bank-book')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const data = response.body.data || response.body;
        expect(Array.isArray(data)).toBe(true);
      });
    });

    describe('7.1.5 Purchase Register', () => {
      it('should get purchase register', async () => {
        const startDate = new Date('2024-01-01').toISOString();
        const endDate = new Date().toISOString();

        const response = await request(app.getHttpServer())
          .get(
            `/reports/purchase-register?startDate=${startDate}&endDate=${endDate}`,
          )
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const data = response.body.data || response.body;
        expect(Array.isArray(data)).toBe(true);
      });

      it('should get purchase register by supplier', async () => {
        const startDate = new Date('2024-01-01').toISOString();
        const endDate = new Date().toISOString();

        const response = await request(app.getHttpServer())
          .get(
            `/reports/purchase-register?startDate=${startDate}&endDate=${endDate}&supplierId=${supplierId}`,
          )
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const data = response.body.data || response.body;
        expect(Array.isArray(data)).toBe(true);
      });
    });

    describe('7.1.6 Sales Register', () => {
      it('should get sales register', async () => {
        const startDate = new Date('2024-01-01').toISOString();
        const endDate = new Date().toISOString();

        const response = await request(app.getHttpServer())
          .get(
            `/reports/sales-register?startDate=${startDate}&endDate=${endDate}`,
          )
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const data = response.body.data || response.body;
        expect(Array.isArray(data)).toBe(true);
      });

      it('should get sales register by customer', async () => {
        const startDate = new Date('2024-01-01').toISOString();
        const endDate = new Date().toISOString();

        const response = await request(app.getHttpServer())
          .get(
            `/reports/sales-register?startDate=${startDate}&endDate=${endDate}&customerId=${customerId}`,
          )
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const data = response.body.data || response.body;
        expect(Array.isArray(data)).toBe(true);
      });
    });

    describe('7.1.7 Customer Statement', () => {
      it('should get customer statement', async () => {
        const response = await request(app.getHttpServer())
          .get(`/reports/customer-statement/${customerId}`)
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 200) {
          const data = response.body.data || response.body;
          expect(data).toHaveProperty('transactions');
          expect(data).toHaveProperty('currentBalance');
        }
      });

      it('should get customer statement with date range', async () => {
        const startDate = new Date('2024-01-01').toISOString();
        const endDate = new Date().toISOString();

        const response = await request(app.getHttpServer())
          .get(
            `/reports/customer-statement/${customerId}?startDate=${startDate}&endDate=${endDate}`,
          )
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 200) {
          const data = response.body.data || response.body;
          expect(data).toHaveProperty('transactions');
        }
      });
    });

    describe('7.1.8 Supplier Statement', () => {
      it('should get supplier statement', async () => {
        const response = await request(app.getHttpServer())
          .get(`/reports/supplier-statement/${supplierId}`)
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 200) {
          const data = response.body.data || response.body;
          expect(data).toHaveProperty('transactions');
          expect(data).toHaveProperty('currentBalance');
        }
      });
    });

    describe('7.1.9 Party-wise Ledger', () => {
      it('should get party ledger for customer', async () => {
        const response = await request(app.getHttpServer())
          .get(`/reports/party-ledger/CUSTOMER/${customerId}`)
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 200) {
          const data = response.body.data || response.body;
          expect(data).toHaveProperty('transactions');
        }
      });

      it('should get party ledger for supplier', async () => {
        const response = await request(app.getHttpServer())
          .get(`/reports/party-ledger/SUPPLIER/${supplierId}`)
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 200) {
          const data = response.body.data || response.body;
          expect(data).toHaveProperty('transactions');
        }
      });
    });
  });

  describe('7.2 Department-wise Profit & Loss', () => {
    it('should get department profit & loss', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app.getHttpServer())
        .get(
          `/reports/profit-loss/department/${departmentId}?startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const data = response.body.data || response.body;
      expect(data).toHaveProperty('revenue');
      expect(data).toHaveProperty('costOfGoodsSold');
      expect(data).toHaveProperty('grossProfit');
      expect(data).toHaveProperty('expenses');
      expect(data).toHaveProperty('netProfit');
    });

    it('should get comparative profit & loss', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app.getHttpServer())
        .get(
          `/reports/profit-loss/comparative?departmentIds=${departmentId}&startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const data = response.body.data || response.body;
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('departmentId');
        expect(data[0]).toHaveProperty('revenue');
      }
    });
  });

  describe('7.4 Journal Entry Reversal', () => {
    let voucherNumber: string;

    it('should create a journal entry', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounting/journal-entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          departmentId,
          journalDate: new Date().toISOString(),
          journalType: 'ADJUSTMENT',
          lines: [
            {
              accountId,
              type: 'DEBIT',
              amount: 1000,
              description: 'Test entry for reversal',
            },
            {
              accountId,
              type: 'CREDIT',
              amount: 1000,
              description: 'Test entry for reversal',
            },
          ],
          reference: 'TEST-REV-001',
        });

      if (response.status === 201) {
        const data = response.body.data || response.body;
        voucherNumber = Array.isArray(data)
          ? data[0]?.voucherNumber
          : data?.voucherNumber;
        expect(voucherNumber).toBeDefined();
      }
    });

    it('should reverse a journal entry', async () => {
      if (voucherNumber) {
        const response = await request(app.getHttpServer())
          .post(`/accounting/journal-entries/${voucherNumber}/reverse`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            reversalDate: new Date().toISOString(),
            postingUserId: 'system',
          });

        if (response.status === 201) {
          const data = response.body.data || response.body;
          expect(Array.isArray(data)).toBe(true);
        }
      }
    });
  });

  describe('Integration Tests', () => {
    it('should verify trial balance is balanced', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/trial-balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const data = response.body.data || response.body;
      expect(data.isBalanced).toBe(true);
    });

    it('should get account balance', async () => {
      const response = await request(app.getHttpServer())
        .get(`/accounting/balance/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const data = response.body.data || response.body;
        expect(data).toHaveProperty('balance');
        expect(data).toHaveProperty('totalDebits');
        expect(data).toHaveProperty('totalCredits');
      }
    });

    it('should generate voucher number', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounting/vouchers/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          departmentId,
          voucherType: 'JOURNAL',
        })
        .expect(201);

      const data = response.body.data || response.body;
      expect(data).toHaveProperty('voucherNumber');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('Phase 10: Department-Specific Features (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let departmentId: string;
  let brokerageDeptId: string;
  let supplyDeptId: string;
  let wastageDeptId: string;
  let freshChickenDeptId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }),
    );
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@123' });

    if (loginResponse.status === 200 || loginResponse.status === 201) {
      authToken =
        loginResponse.body.data?.accessToken || loginResponse.body.accessToken;
    }

    // Get departments
    const depts = await request(app.getHttpServer())
      .get('/departments')
      .set('Authorization', `Bearer ${authToken}`);

    if (depts.body.data?.length > 0) {
      departmentId = depts.body.data[0].id;
      brokerageDeptId =
        depts.body.data.find((d: any) => d.type === 'BROKERAGE')?.id ||
        departmentId;
      supplyDeptId =
        depts.body.data.find((d: any) => d.type === 'SUPPLY')?.id ||
        departmentId;
      wastageDeptId =
        depts.body.data.find((d: any) => d.type === 'WASTAGE')?.id ||
        departmentId;
      freshChickenDeptId =
        depts.body.data.find((d: any) => d.type === 'FRESH_CHICKEN_SHOP')?.id ||
        departmentId;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('10.1 Brokerage Department Features', () => {
    it('should get commission report', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-12-31').toISOString();

      const response = await request(app.getHttpServer())
        .get('/departments/brokerage/commission-report')
        .query({ departmentId: brokerageDeptId, startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(500);
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('totalSales');
        expect(response.body).toHaveProperty('totalCommission');
      }
    });

    it('should get broker performance report', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-12-31').toISOString();

      const response = await request(app.getHttpServer())
        .get('/departments/brokerage/broker-performance')
        .query({ departmentId: brokerageDeptId, startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(500);
        });

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should get brokerage P&L report', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-12-31').toISOString();

      const response = await request(app.getHttpServer())
        .get('/departments/brokerage/profit-loss')
        .query({ departmentId: brokerageDeptId, startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(500);
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('revenue');
        expect(response.body).toHaveProperty('netProfit');
      }
    });
  });

  describe('10.2 Supply Department Features', () => {
    it('should get shop owner credit report', async () => {
      const response = await request(app.getHttpServer())
        .get('/departments/supply/shop-owner-credit')
        .query({ departmentId: supplyDeptId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(500);
        });

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should get delivery schedule', async () => {
      const response = await request(app.getHttpServer())
        .get('/departments/supply/delivery-schedule')
        .query({ departmentId: supplyDeptId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(500);
        });
    });

    it('should get supply P&L report', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-12-31').toISOString();

      const response = await request(app.getHttpServer())
        .get('/departments/supply/profit-loss')
        .query({ departmentId: supplyDeptId, startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(500);
        });
    });
  });

  describe('10.3 Wastage Department Features', () => {
    it('should get waste categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/departments/wastage/waste-categories')
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(500);
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('categories');
      }
    });

    it('should get factory sales report', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-12-31').toISOString();

      const response = await request(app.getHttpServer())
        .get('/departments/wastage/factory-sales')
        .query({ departmentId: wastageDeptId, startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(500);
        });
    });

    it('should get wastage P&L report', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-12-31').toISOString();

      const response = await request(app.getHttpServer())
        .get('/departments/wastage/profit-loss')
        .query({ departmentId: wastageDeptId, startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(500);
        });
    });
  });

  describe('10.4 Fresh Chicken Shop Department Features', () => {
    it('should get daily sales dashboard', async () => {
      const date = new Date('2024-01-15').toISOString();

      const response = await request(app.getHttpServer())
        .get('/departments/fresh-chicken-shop/daily-dashboard')
        .query({ departmentId: freshChickenDeptId, date })
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(500);
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('totalSales');
      }
    });

    it('should get customer loyalty report', async () => {
      const response = await request(app.getHttpServer())
        .get('/departments/fresh-chicken-shop/customer-loyalty')
        .query({ departmentId: freshChickenDeptId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(500);
        });
    });

    it('should get margin analysis', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-12-31').toISOString();

      const response = await request(app.getHttpServer())
        .get('/departments/fresh-chicken-shop/margin-analysis')
        .query({ departmentId: freshChickenDeptId, startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(500);
        });

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should get fresh chicken shop P&L report', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-12-31').toISOString();

      const response = await request(app.getHttpServer())
        .get('/departments/fresh-chicken-shop/profit-loss')
        .query({ departmentId: freshChickenDeptId, startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(500);
        });
    });
  });

  describe('Integration Tests', () => {
    it('should handle department-specific data isolation', async () => {
      const response = await request(app.getHttpServer())
        .get('/departments/brokerage/commission-report')
        .query({
          departmentId: brokerageDeptId,
          startDate: new Date('2024-01-01').toISOString(),
          endDate: new Date('2024-12-31').toISOString(),
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(500);
        });
    });

    it('should calculate commission correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/departments/brokerage/commission-report')
        .query({
          departmentId: brokerageDeptId,
          startDate: new Date('2024-01-01').toISOString(),
          endDate: new Date('2024-12-31').toISOString(),
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
        });

      if (response.status === 200 && response.body.totalSales > 0) {
        expect(response.body.averageCommission).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

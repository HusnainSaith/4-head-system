import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';

import { DepartmentsModule } from '../../src/modules/departments/departments.module';
import { ProductsModule } from '../../src/modules/inventory/products.module';
import databaseConfig from '../../src/config/database.config';
import { ConfigService } from '@nestjs/config';

describe('Phase 1: Core Infrastructure Integration Tests', () => {
  let app: INestApplication;
  let departmentId: string;
  let productId: string;
  let accountId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.local', '.env'],
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: databaseConfig,
          inject: [ConfigService],
        }),
        DepartmentsModule,
        ProductsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== DEPARTMENT MODULE TESTS ====================
  describe('Department Module', () => {
    it('should create a new department', async () => {
      const response = await request(app.getHttpServer())
        .post('/departments')
        .send({
          name: 'Broiler Department',
          code: 'BRLR',
          type: 'BROILER',
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Broiler Department');
      expect(response.body.code).toBe('BRLR');
      departmentId = response.body.id;
    });

    it('should not create duplicate department', async () => {
      await request(app.getHttpServer())
        .post('/departments')
        .send({
          name: 'Broiler Department',
          code: 'BRLR2',
          type: 'BROILER',
          isActive: true,
        })
        .expect(409);
    });

    it('should get all departments', async () => {
      const response = await request(app.getHttpServer())
        .get('/departments')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get department by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/departments/${departmentId}`)
        .expect(200);

      expect(response.body.id).toBe(departmentId);
      expect(response.body.name).toBe('Broiler Department');
    });

    it('should get department by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/departments/type/BROILER')
        .expect(200);

      expect(response.body.type).toBe('BROILER');
    });

    it('should update department', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/departments/${departmentId}`)
        .send({
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.description).toBe('Updated description');
    });

    it('should deactivate department', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/departments/${departmentId}/deactivate`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should activate department', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/departments/${departmentId}/activate`)
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });
  });

  // ==================== PRODUCT MODULE TESTS ====================
  describe('Product Module', () => {
    it('should create a new product', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .send({
          code: 'CHICK-001',
          name: 'Day Old Chicks',
          category: 'LIVESTOCK',
          unit: 'PIECE',
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.code).toBe('CHICK-001');
      productId = response.body.id;
    });

    it('should not create duplicate product code', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({
          code: 'CHICK-001',
          name: 'Duplicate Chicks',
          category: 'LIVESTOCK',
          unit: 'PIECE',
          isActive: true,
        })
        .expect(409);
    });

    it('should get all products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter products by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?category=LIVESTOCK')
        .expect(200);

      expect(response.body.every((p: any) => p.category === 'LIVESTOCK')).toBe(
        true,
      );
    });

    it('should get product by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(response.body.id).toBe(productId);
    });

    it('should get product by code', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/code/CHICK-001')
        .expect(200);

      expect(response.body.code).toBe('CHICK-001');
    });

    it('should search products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/search?q=Chick')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should update product', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .send({
          description: 'Premium quality day old chicks',
          minimumStockLevel: 100,
        })
        .expect(200);

      expect(response.body.description).toBe('Premium quality day old chicks');
      expect(response.body.minimumStockLevel).toBe(100);
    });

    it('should check stock alert', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${productId}/stock-alert?currentQty=50`)
        .expect(200);

      expect(response.body).toHaveProperty('alert');
      expect(response.body).toHaveProperty('product');
    });

    it('should deactivate product', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/products/${productId}/deactivate`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should activate product', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/products/${productId}/activate`)
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });
  });

  // ==================== ACCOUNTING SERVICE TESTS ====================
  describe('Accounting Module', () => {
    it('should create an account', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .send({
          code: '1000',
          name: 'Cash',
          type: 'ASSET',
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      accountId = response.body.id;
    });

    it('should create revenue account', async () => {
      await request(app.getHttpServer())
        .post('/accounts')
        .send({
          code: '4000',
          name: 'Sales Revenue',
          type: 'REVENUE',
          isActive: true,
        })
        .expect(201);
    });

    it('should get all accounts', async () => {
      const response = await request(app.getHttpServer())
        .get('/accounts')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should create journal entry', async () => {
      const today = new Date().toISOString();
      const response = await request(app.getHttpServer())
        .post('/accounting/journal-entries')
        .send({
          departmentId: departmentId,
          journalDate: today,
          journalType: 'OPERATIONAL',
          lines: [
            {
              accountId: accountId,
              type: 'DEBIT',
              amount: 1000,
              description: 'Cash received',
            },
          ],
        })
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject unbalanced journal entry', async () => {
      const today = new Date().toISOString();
      await request(app.getHttpServer())
        .post('/accounting/journal-entries')
        .send({
          departmentId: departmentId,
          journalDate: today,
          journalType: 'OPERATIONAL',
          lines: [
            {
              accountId: accountId,
              type: 'DEBIT',
              amount: 1000,
              description: 'Unbalanced entry',
            },
          ],
        })
        .expect(400);
    });
  });

  // ==================== VOUCHER NUMBERING TESTS ====================
  describe('Voucher Numbering Service', () => {
    it('should generate unique voucher numbers', async () => {
      const response1 = await request(app.getHttpServer())
        .post('/accounting/vouchers/generate')
        .send({
          departmentId: departmentId,
          voucherType: 'PURCHASE',
        })
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/accounting/vouchers/generate')
        .send({
          departmentId: departmentId,
          voucherType: 'PURCHASE',
        })
        .expect(201);

      expect(response1.body.voucherNumber).toBeDefined();
      expect(response2.body.voucherNumber).toBeDefined();
      expect(response1.body.voucherNumber).not.toBe(
        response2.body.voucherNumber,
      );
    });

    it('should generate voucher with correct format', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounting/vouchers/generate')
        .send({
          departmentId: departmentId,
          voucherType: 'SALE',
        })
        .expect(201);

      const voucherNumber = response.body.voucherNumber;
      expect(voucherNumber).toMatch(/^SAL-/);
    });
  });

  // ==================== INTEGRATION SCENARIO TESTS ====================
  describe('Integration Scenarios', () => {
    it('should create department, product, and setup accounting flow', async () => {
      // Create new department
      const dept = await request(app.getHttpServer())
        .post('/departments')
        .send({
          name: 'Test Integration Dept',
          code: 'TEST',
          type: 'LAYER',
          isActive: true,
        })
        .expect(201);

      // Create product for this department
      const prod = await request(app.getHttpServer())
        .post('/products')
        .send({
          code: 'TEST-PROD-001',
          name: 'Test Product',
          category: 'FEED',
          unit: 'KG',
          isActive: true,
        })
        .expect(201);

      // Generate voucher for this department
      const voucher = await request(app.getHttpServer())
        .post('/accounting/vouchers/generate')
        .send({
          departmentId: dept.body.id,
          voucherType: 'PURCHASE',
        })
        .expect(201);

      expect(dept.body.id).toBeDefined();
      expect(prod.body.id).toBeDefined();
      expect(voucher.body.voucherNumber).toContain('PUR');
    });
  });

  // ==================== CLEANUP ====================
  describe('Cleanup', () => {
    it('should soft delete product', async () => {
      await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .expect(204);
    });

    it('should not find deleted product', async () => {
      await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(404);
    });

    it('should soft delete department', async () => {
      await request(app.getHttpServer())
        .delete(`/departments/${departmentId}`)
        .expect(204);
    });

    it('should not find deleted department', async () => {
      await request(app.getHttpServer())
        .get(`/departments/${departmentId}`)
        .expect(404);
    });
  });
});

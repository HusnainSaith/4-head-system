import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as request from 'supertest';

import { MasterDataModule } from '../../src/modules/master-data/master-data.module';
import { DepartmentsModule } from '../../src/modules/departments/departments.module';
import databaseConfig from '../../src/config/database.config';

describe('Phase 2: Master Data Integration Tests', () => {
  let app: INestApplication;
  let departmentId: string;
  let customerId: string;
  let supplierId: string;
  let brokerId: string;
  let shopOwnerId: string;
  let farmOwnerId: string;

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
        MasterDataModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    // Create test department
    const dept = await request(app.getHttpServer()).post('/departments').send({
      name: 'Test Brokerage',
      code: 'TBRK',
      type: 'BROKERAGE',
      isActive: true,
    });
    departmentId = dept.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== CUSTOMER MODULE TESTS ====================
  describe('Customer Module', () => {
    it('should create a new customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/customers')
        .send({
          name: 'Test Customer',
          email: 'customer@test.com',
          phoneNumber: '1234567890',
          address: '123 Test St',
          customerType: 'INDIVIDUAL',
          creditLimit: 50000,
          currentBalance: 0,
          status: 'ACTIVE',
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Customer');
      customerId = response.body.id;
    });

    it('should not create duplicate customer email', async () => {
      await request(app.getHttpServer())
        .post('/customers')
        .send({
          name: 'Duplicate Customer',
          email: 'customer@test.com',
          phoneNumber: '9999999999',
        })
        .expect(409);
    });

    it('should get all customers', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should search customers', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/search?q=Test')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get customer by email', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/email/customer@test.com')
        .expect(200);

      expect(response.body.email).toBe('customer@test.com');
    });

    it('should check credit limit', async () => {
      const response = await request(app.getHttpServer())
        .get(`/customers/${customerId}/credit-check?amount=10000`)
        .expect(200);

      expect(response.body).toHaveProperty('allowed');
      expect(response.body).toHaveProperty('available');
    });

    it('should update customer', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/customers/${customerId}`)
        .send({ address: 'Updated Address' })
        .expect(200);

      expect(response.body.address).toBe('Updated Address');
    });

    it('should block customer', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/customers/${customerId}/block`)
        .expect(200);

      expect(response.body.status).toBe('BLOCKED');
    });

    it('should activate customer', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/customers/${customerId}/activate`)
        .expect(200);

      expect(response.body.isActive).toBe(true);
      expect(response.body.status).toBe('ACTIVE');
    });
  });

  // ==================== SUPPLIER MODULE TESTS ====================
  describe('Supplier Module', () => {
    it('should create a new supplier', async () => {
      const response = await request(app.getHttpServer())
        .post('/suppliers')
        .send({
          name: 'Test Supplier',
          email: 'supplier@test.com',
          phoneNumber: '9876543210',
          supplierType: 'POULTRY_FARM',
          address: '456 Supplier Ave',
          status: 'ACTIVE',
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      supplierId = response.body.id;
    });

    it('should get all suppliers', async () => {
      const response = await request(app.getHttpServer())
        .get('/suppliers')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter suppliers by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/suppliers?type=POULTRY_FARM')
        .expect(200);

      expect(
        response.body.every((s: any) => s.supplierType === 'POULTRY_FARM'),
      ).toBe(true);
    });

    it('should update supplier', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/suppliers/${supplierId}`)
        .send({ notes: 'Updated supplier notes' })
        .expect(200);

      expect(response.body.notes).toBe('Updated supplier notes');
    });
  });

  // ==================== BROKER MODULE TESTS ====================
  describe('Broker Module', () => {
    it('should create a new broker', async () => {
      const response = await request(app.getHttpServer())
        .post('/brokers')
        .send({
          name: 'Test Broker',
          email: 'broker@test.com',
          phoneNumber: '5551234567',
          commissionRate: 2.5,
          status: 'ACTIVE',
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      brokerId = response.body.id;
    });

    it('should get all brokers', async () => {
      const response = await request(app.getHttpServer())
        .get('/brokers')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should update broker', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/brokers/${brokerId}`)
        .send({ commissionRate: 3.0 })
        .expect(200);

      expect(response.body.commissionRate).toBe(3.0);
    });
  });

  // ==================== SHOP OWNER MODULE TESTS ====================
  describe('Shop Owner Module', () => {
    it('should create a new shop owner', async () => {
      const response = await request(app.getHttpServer())
        .post('/shop-owners')
        .send({
          name: 'Test Shop Owner',
          shopName: 'Test Poultry Shop',
          phoneNumber: '7778889999',
          address: '789 Shop St',
          status: 'ACTIVE',
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      shopOwnerId = response.body.id;
    });

    it('should get all shop owners', async () => {
      const response = await request(app.getHttpServer())
        .get('/shop-owners')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should search shop owners', async () => {
      const response = await request(app.getHttpServer())
        .get('/shop-owners/search?q=Test')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ==================== FARM OWNER MODULE TESTS ====================
  describe('Farm Owner Module', () => {
    it('should create a new farm owner', async () => {
      const response = await request(app.getHttpServer())
        .post('/farm-owners')
        .send({
          name: 'Test Farm Owner',
          farmName: 'Test Poultry Farm',
          phoneNumber: '3334445555',
          address: '321 Farm Rd',
          status: 'ACTIVE',
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      farmOwnerId = response.body.id;
    });

    it('should get all farm owners', async () => {
      const response = await request(app.getHttpServer())
        .get('/farm-owners')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ==================== PARTY VALIDATION TESTS ====================
  describe('Party Validation Service', () => {
    it('should get allowed parties for BROKERAGE department', async () => {
      const response = await request(app.getHttpServer())
        .get(`/party-validation/allowed-parties/${departmentId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain('BROKER');
      expect(response.body).toContain('FARM_OWNER');
      expect(response.body).toContain('CUSTOMER');
      expect(response.body).toContain('SHOP_OWNER');
    });

    it('should validate broker for BROKERAGE department', async () => {
      const response = await request(app.getHttpServer())
        .get('/party-validation/validate')
        .query({
          departmentId: departmentId,
          partyType: 'BROKER',
          partyId: brokerId,
        })
        .expect(200);

      expect(response.body.valid).toBe(true);
    });

    it('should validate customer for BROKERAGE department', async () => {
      const response = await request(app.getHttpServer())
        .get('/party-validation/validate')
        .query({
          departmentId: departmentId,
          partyType: 'CUSTOMER',
          partyId: customerId,
        })
        .expect(200);

      expect(response.body.valid).toBe(true);
    });
  });

  // ==================== INTEGRATION SCENARIO TESTS ====================
  describe('Integration Scenarios', () => {
    it('should create complete brokerage transaction flow', async () => {
      // Create a broiler department
      const broilerDept = await request(app.getHttpServer())
        .post('/departments')
        .send({
          name: 'Broiler Dept',
          code: 'BRLR',
          type: 'BROILER',
          isActive: true,
        })
        .expect(201);

      // Create supplier for broiler
      const supplier = await request(app.getHttpServer())
        .post('/suppliers')
        .send({
          name: 'Broiler Feed Supplier',
          supplierType: 'DISTRIBUTOR',
          phoneNumber: '1231231234',
          status: 'ACTIVE',
          isActive: true,
        })
        .expect(201);

      // Create customer for broiler
      const customer = await request(app.getHttpServer())
        .post('/customers')
        .send({
          name: 'Broiler Customer',
          phoneNumber: '9879879876',
          customerType: 'BUSINESS',
          creditLimit: 100000,
          status: 'ACTIVE',
          isActive: true,
        })
        .expect(201);

      // Validate supplier for broiler department
      const validation = await request(app.getHttpServer())
        .get('/party-validation/validate')
        .query({
          departmentId: broilerDept.body.id,
          partyType: 'SUPPLIER',
          partyId: supplier.body.id,
        })
        .expect(200);

      expect(validation.body.valid).toBe(true);
    });
  });

  // ==================== CLEANUP ====================
  describe('Cleanup', () => {
    it('should delete customer', async () => {
      await request(app.getHttpServer())
        .delete(`/customers/${customerId}`)
        .expect(204);
    });

    it('should delete supplier', async () => {
      await request(app.getHttpServer())
        .delete(`/suppliers/${supplierId}`)
        .expect(204);
    });

    it('should delete broker', async () => {
      await request(app.getHttpServer())
        .delete(`/brokers/${brokerId}`)
        .expect(204);
    });

    it('should delete shop owner', async () => {
      await request(app.getHttpServer())
        .delete(`/shop-owners/${shopOwnerId}`)
        .expect(204);
    });

    it('should delete farm owner', async () => {
      await request(app.getHttpServer())
        .delete(`/farm-owners/${farmOwnerId}`)
        .expect(204);
    });
  });
});

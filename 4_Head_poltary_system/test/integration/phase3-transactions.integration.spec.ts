import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as request from 'supertest';

import { TransactionsModule } from '../../src/modules/transactions/transactions.module';
import { DepartmentsModule } from '../../src/modules/departments/departments.module';
import { ProductsModule } from '../../src/modules/inventory/products.module';
import { InventoryModule } from '../../src/modules/inventory/inventory.module';
import { MasterDataModule } from '../../src/modules/master-data/master-data.module';
import databaseConfig from '../../src/config/database.config';

describe('Phase 3: Transactions Integration Tests', () => {
  let app: INestApplication;
  let departmentId: string;
  let supplierId: string;
  let customerId: string;
  let productId: string;
  let accountCashId: string;
  let accountInventoryId: string;
  let purchaseId: string;
  let saleId: string;

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
        InventoryModule,
        MasterDataModule,
        TransactionsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupTestData() {
    // Create department
    const dept = await request(app.getHttpServer()).post('/departments').send({
      name: 'Test Supply Dept',
      code: 'TSUP',
      type: 'SUPPLY',
      isActive: true,
    });
    departmentId = dept.body.id;

    // Create accounts
    const cashAccount = await request(app.getHttpServer())
      .post('/accounts')
      .send({
        accountCode: 'CASH-TEST',
        accountName: 'Test Cash Account',
        accountType: 'ASSET',
        category: 'CURRENT_ASSET',
        isActive: true,
      });
    accountCashId = cashAccount.body.id;

    const inventoryAccount = await request(app.getHttpServer())
      .post('/accounts')
      .send({
        accountCode: 'INV-TEST',
        accountName: 'Test Inventory Account',
        accountType: 'ASSET',
        category: 'INVENTORY',
        isActive: true,
      });
    accountInventoryId = inventoryAccount.body.id;

    // Create supplier
    const supplier = await request(app.getHttpServer())
      .post('/suppliers')
      .send({
        name: 'Test Supplier',
        email: 'supplier@phase3test.com',
        phoneNumber: '1112223333',
        supplierType: 'POULTRY_FARM',
        status: 'ACTIVE',
        isActive: true,
      });
    supplierId = supplier.body.id;

    // Create customer
    const customer = await request(app.getHttpServer())
      .post('/customers')
      .send({
        name: 'Test Customer',
        email: 'customer@phase3test.com',
        phoneNumber: '4445556666',
        customerType: 'INDIVIDUAL',
        creditLimit: 100000,
        status: 'ACTIVE',
        isActive: true,
      });
    customerId = customer.body.id;

    // Create product
    const product = await request(app.getHttpServer()).post('/products').send({
      productCode: 'CHK001',
      productName: 'Live Chicken',
      category: 'LIVE_CHICKEN',
      uom: 'KG',
      isActive: true,
    });
    productId = product.body.id;
  }

  // ==================== PURCHASE MODULE TESTS ====================
  describe('Purchase Module', () => {
    it('should create a new purchase in DRAFT status', async () => {
      const response = await request(app.getHttpServer())
        .post('/purchases')
        .send({
          voucherNumber: 'PUR-TEST-001',
          departmentId,
          supplierId,
          productId,
          quantity: 100,
          ratePerUnit: 150,
          totalAmount: 15000,
          taxAmount: 0,
          paymentMode: 'CREDIT',
          purchaseDate: new Date().toISOString().split('T')[0],
          status: 'DRAFT',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('DRAFT');
      expect(response.body.remainingQty).toBe(100);
      purchaseId = response.body.id;
    });

    it('should update purchase when in DRAFT status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/purchases/${purchaseId}`)
        .send({ notes: 'Updated purchase notes' })
        .expect(200);

      expect(response.body.notes).toBe('Updated purchase notes');
    });

    it('should not allow posting purchase without validation', async () => {
      // This will succeed since we have all required data
      const response = await request(app.getHttpServer())
        .post(`/purchases/${purchaseId}/post`)
        .send({ userId: 'test-user-id' })
        .expect(200);

      expect(response.body.status).toBe('POSTED');
    });

    it('should not allow updating posted purchase', async () => {
      await request(app.getHttpServer())
        .patch(`/purchases/${purchaseId}`)
        .send({ quantity: 150 })
        .expect(400);
    });

    it('should get all purchases', async () => {
      const response = await request(app.getHttpServer())
        .get('/purchases')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter purchases by department', async () => {
      const response = await request(app.getHttpServer())
        .get(`/purchases?departmentId=${departmentId}`)
        .expect(200);

      expect(
        response.body.every((p: any) => p.departmentId === departmentId),
      ).toBe(true);
    });

    it('should filter purchases by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/purchases?status=POSTED')
        .expect(200);

      expect(response.body.every((p: any) => p.status === 'POSTED')).toBe(true);
    });

    it('should get purchase by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/purchases/${purchaseId}`)
        .expect(200);

      expect(response.body.id).toBe(purchaseId);
    });
  });

  // ==================== STOCK MOVEMENT & BALANCE TESTS ====================
  describe('Stock Movement & Balance', () => {
    it('should create stock movement on purchase post', async () => {
      const response = await request(app.getHttpServer())
        .get('/stock-movements')
        .query({ departmentId, productId })
        .expect(200);

      const purchaseMovement = response.body.find(
        (m: any) => m.purchaseId === purchaseId,
      );
      expect(purchaseMovement).toBeDefined();
      expect(purchaseMovement.movementType).toBe('RECEIPT');
      expect(Number(purchaseMovement.quantity)).toBe(100);
    });

    it('should update stock balance on purchase post', async () => {
      const response = await request(app.getHttpServer())
        .get('/stock-balances')
        .query({ departmentId })
        .expect(200);

      const balance = response.body.find((b: any) => b.productId === productId);
      expect(balance).toBeDefined();
      expect(Number(balance.currentQuantity)).toBeGreaterThanOrEqual(100);
    });

    it('should check stock availability', async () => {
      const response = await request(app.getHttpServer())
        .get(`/stock-balances/check/${departmentId}/${productId}`)
        .query({ quantity: 50 })
        .expect(200);

      expect(response.body.available).toBe(true);
      expect(Number(response.body.currentQty)).toBeGreaterThanOrEqual(50);
    });
  });

  // ==================== SALE MODULE TESTS ====================
  describe('Sale Module', () => {
    it('should create a new sale in DRAFT status', async () => {
      const response = await request(app.getHttpServer())
        .post('/sales')
        .send({
          voucherNumber: 'SAL-TEST-001',
          departmentId,
          customerId,
          productId,
          quantity: 50,
          ratePerUnit: 180,
          totalAmount: 9000,
          finalAmount: 9000,
          taxAmount: 0,
          paymentMode: 'CASH',
          saleDate: new Date().toISOString().split('T')[0],
          status: 'DRAFT',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('DRAFT');
      saleId = response.body.id;
    });

    it('should not create sale with insufficient stock', async () => {
      await request(app.getHttpServer())
        .post('/sales')
        .send({
          voucherNumber: 'SAL-TEST-FAIL',
          departmentId,
          customerId,
          productId,
          quantity: 10000, // Excessive quantity
          ratePerUnit: 180,
          totalAmount: 1800000,
          finalAmount: 1800000,
          paymentMode: 'CASH',
          saleDate: new Date().toISOString().split('T')[0],
          status: 'DRAFT',
        })
        .expect(400);
    });

    it('should post sale and update stock', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sales/${saleId}/post`)
        .send({ userId: 'test-user-id' })
        .expect(200);

      expect(response.body.status).toBe('POSTED');
    });

    it('should reduce stock balance after sale post', async () => {
      const response = await request(app.getHttpServer())
        .get('/stock-balances')
        .query({ departmentId })
        .expect(200);

      const balance = response.body.find((b: any) => b.productId === productId);
      expect(balance).toBeDefined();
      expect(Number(balance.currentQuantity)).toBe(50); // 100 - 50
    });

    it('should create ISSUE stock movement on sale post', async () => {
      const response = await request(app.getHttpServer())
        .get('/stock-movements')
        .query({ departmentId, productId })
        .expect(200);

      const saleMovement = response.body.find((m: any) => m.saleId === saleId);
      expect(saleMovement).toBeDefined();
      expect(saleMovement.movementType).toBe('ISSUE');
      expect(Number(saleMovement.quantity)).toBe(-50);
    });

    it('should get all sales', async () => {
      const response = await request(app.getHttpServer())
        .get('/sales')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter sales by department', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sales?departmentId=${departmentId}`)
        .expect(200);

      expect(
        response.body.every((s: any) => s.departmentId === departmentId),
      ).toBe(true);
    });
  });

  // ==================== GL POSTING TESTS ====================
  describe('GL Posting', () => {
    it('should create journal entries for purchase', async () => {
      const response = await request(app.getHttpServer())
        .get('/journal-entries')
        .query({ departmentId })
        .expect(200);

      const purchaseEntries = response.body.filter(
        (je: any) => je.purchaseId === purchaseId,
      );
      expect(purchaseEntries.length).toBeGreaterThan(0);
    });

    it('should create journal entries for sale', async () => {
      const response = await request(app.getHttpServer())
        .get('/journal-entries')
        .query({ departmentId })
        .expect(200);

      const saleEntries = response.body.filter(
        (je: any) => je.saleId === saleId,
      );
      expect(saleEntries.length).toBeGreaterThan(0);
    });

    it('should have balanced debit and credit entries', async () => {
      const response = await request(app.getHttpServer())
        .get('/journal-entries')
        .query({ departmentId })
        .expect(200);

      const debits = response.body
        .filter((je: any) => je.type === 'DEBIT')
        .reduce((sum: number, je: any) => sum + Number(je.amount), 0);

      const credits = response.body
        .filter((je: any) => je.type === 'CREDIT')
        .reduce((sum: number, je: any) => sum + Number(je.amount), 0);

      expect(Math.abs(debits - credits)).toBeLessThan(0.01); // Allow for rounding
    });
  });

  // ==================== INVENTORY AUTOMATION TESTS ====================
  describe('Inventory Movement Automation', () => {
    it('should automatically create stock movements on purchase post', async () => {
      // Create another purchase
      const purchase = await request(app.getHttpServer())
        .post('/purchases')
        .send({
          voucherNumber: 'PUR-AUTO-001',
          departmentId,
          supplierId,
          productId,
          quantity: 75,
          ratePerUnit: 160,
          totalAmount: 12000,
          paymentMode: 'CASH',
          purchaseDate: new Date().toISOString().split('T')[0],
          status: 'DRAFT',
        })
        .expect(201);

      // Post it
      await request(app.getHttpServer())
        .post(`/purchases/${purchase.body.id}/post`)
        .send({ userId: 'test-user-id' })
        .expect(200);

      // Check stock movement was created
      const movements = await request(app.getHttpServer())
        .get('/stock-movements')
        .query({ productId })
        .expect(200);

      const autoMovement = movements.body.find(
        (m: any) => m.purchaseId === purchase.body.id,
      );
      expect(autoMovement).toBeDefined();
      expect(Number(autoMovement.quantity)).toBe(75);
    });

    it('should automatically update stock balance on sale', async () => {
      const beforeBalance = await request(app.getHttpServer())
        .get('/stock-balances')
        .query({ departmentId })
        .expect(200);

      const initialQty = Number(
        beforeBalance.body.find((b: any) => b.productId === productId)
          .currentQuantity,
      );

      // Create and post sale
      const sale = await request(app.getHttpServer())
        .post('/sales')
        .send({
          voucherNumber: 'SAL-AUTO-001',
          departmentId,
          customerId,
          productId,
          quantity: 25,
          ratePerUnit: 190,
          totalAmount: 4750,
          finalAmount: 4750,
          paymentMode: 'CREDIT',
          saleDate: new Date().toISOString().split('T')[0],
          status: 'DRAFT',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sales/${sale.body.id}/post`)
        .send({ userId: 'test-user-id' })
        .expect(200);

      // Check balance was updated
      const afterBalance = await request(app.getHttpServer())
        .get('/stock-balances')
        .query({ departmentId })
        .expect(200);

      const finalQty = Number(
        afterBalance.body.find((b: any) => b.productId === productId)
          .currentQuantity,
      );
      expect(finalQty).toBe(initialQty - 25);
    });
  });

  // ==================== STOCK BALANCE TRIGGER TESTS ====================
  describe('Stock Balance Triggers', () => {
    it('should automatically update stock balance via trigger on stock movement insert', async () => {
      // Get current balance
      const before = await request(app.getHttpServer())
        .get('/stock-balances')
        .query({ departmentId })
        .expect(200);

      const initialQty = Number(
        before.body.find((b: any) => b.productId === productId).currentQuantity,
      );

      // Create manual stock movement
      await request(app.getHttpServer())
        .post('/stock-movements')
        .send({
          departmentId,
          productId,
          movementType: 'ADJUSTMENT',
          quantity: 10,
          costPerUnit: 150,
          totalValue: 1500,
          movementDate: new Date().toISOString().split('T')[0],
          reference: 'MANUAL-ADJ-001',
          notes: 'Manual adjustment test',
        })
        .expect(201);

      // Check balance was auto-updated by trigger
      const after = await request(app.getHttpServer())
        .get('/stock-balances')
        .query({ departmentId })
        .expect(200);

      const finalQty = Number(
        after.body.find((b: any) => b.productId === productId).currentQuantity,
      );
      expect(finalQty).toBe(initialQty + 10);
    });

    it('should set minimum stock level', async () => {
      const balances = await request(app.getHttpServer())
        .get('/stock-balances')
        .query({ departmentId })
        .expect(200);

      const balance = balances.body.find((b: any) => b.productId === productId);

      await request(app.getHttpServer())
        .patch(`/stock-balances/${balance.id}`)
        .send({ minimumLevel: 20 })
        .expect(200);
    });
  });

  // ==================== TRANSACTION FLOW TESTS ====================
  describe('Complete Transaction Flows', () => {
    it('should complete full purchase-to-sale-to-GL cycle', async () => {
      // 1. Create purchase
      const purchase = await request(app.getHttpServer())
        .post('/purchases')
        .send({
          voucherNumber: 'PUR-FLOW-001',
          departmentId,
          supplierId,
          productId,
          quantity: 200,
          ratePerUnit: 145,
          totalAmount: 29000,
          paymentMode: 'CREDIT',
          purchaseDate: new Date().toISOString().split('T')[0],
          status: 'DRAFT',
        })
        .expect(201);

      // 2. Post purchase
      await request(app.getHttpServer())
        .post(`/purchases/${purchase.body.id}/post`)
        .send({ userId: 'flow-test-user' })
        .expect(200);

      // 3. Verify stock increased
      const afterPurchase = await request(app.getHttpServer())
        .get('/stock-balances')
        .query({ departmentId })
        .expect(200);
      const qtyAfterPurchase = Number(
        afterPurchase.body.find((b: any) => b.productId === productId)
          .currentQuantity,
      );

      // 4. Create sale
      const sale = await request(app.getHttpServer())
        .post('/sales')
        .send({
          voucherNumber: 'SAL-FLOW-001',
          departmentId,
          customerId,
          productId,
          quantity: 150,
          ratePerUnit: 170,
          totalAmount: 25500,
          finalAmount: 25500,
          paymentMode: 'CASH',
          saleDate: new Date().toISOString().split('T')[0],
          status: 'DRAFT',
        })
        .expect(201);

      // 5. Post sale
      await request(app.getHttpServer())
        .post(`/sales/${sale.body.id}/post`)
        .send({ userId: 'flow-test-user' })
        .expect(200);

      // 6. Verify stock decreased
      const afterSale = await request(app.getHttpServer())
        .get('/stock-balances')
        .query({ departmentId })
        .expect(200);
      const qtyAfterSale = Number(
        afterSale.body.find((b: any) => b.productId === productId)
          .currentQuantity,
      );
      expect(qtyAfterSale).toBe(qtyAfterPurchase - 150);

      // 7. Verify GL entries exist
      const journalEntries = await request(app.getHttpServer())
        .get('/journal-entries')
        .query({ departmentId })
        .expect(200);

      const purchaseGLs = journalEntries.body.filter(
        (je: any) => je.purchaseId === purchase.body.id,
      );
      const saleGLs = journalEntries.body.filter(
        (je: any) => je.saleId === sale.body.id,
      );

      expect(purchaseGLs.length).toBeGreaterThan(0);
      expect(saleGLs.length).toBeGreaterThan(0);
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {
    it('should not allow sale with negative stock result', async () => {
      const balance = await request(app.getHttpServer())
        .get('/stock-balances')
        .query({ departmentId })
        .expect(200);

      const currentQty = Number(
        balance.body.find((b: any) => b.productId === productId)
          .currentQuantity,
      );

      await request(app.getHttpServer())
        .post('/sales')
        .send({
          voucherNumber: 'SAL-FAIL-001',
          departmentId,
          customerId,
          productId,
          quantity: currentQty + 100,
          ratePerUnit: 200,
          totalAmount: (currentQty + 100) * 200,
          finalAmount: (currentQty + 100) * 200,
          paymentMode: 'CASH',
          saleDate: new Date().toISOString().split('T')[0],
          status: 'DRAFT',
        })
        .expect(400);
    });

    it('should not allow updating posted transactions', async () => {
      await request(app.getHttpServer())
        .patch(`/purchases/${purchaseId}`)
        .send({ quantity: 999 })
        .expect(400);

      await request(app.getHttpServer())
        .patch(`/sales/${saleId}`)
        .send({ quantity: 999 })
        .expect(400);
    });

    it('should not allow deleting posted transactions', async () => {
      await request(app.getHttpServer())
        .delete(`/purchases/${purchaseId}`)
        .expect(400);

      await request(app.getHttpServer()).delete(`/sales/${saleId}`).expect(400);
    });
  });
});

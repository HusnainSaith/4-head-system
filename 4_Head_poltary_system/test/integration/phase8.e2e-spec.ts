import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Phase 8: Advanced Inventory & Fleet Features (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let departmentId: string;
  let productId: string;
  let vehicleId: string;
  let batchId: string;
  let driverId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@4head.com', password: 'Admin@123' });
    authToken = loginResponse.body.accessToken;

    // Get or create department
    const deptResponse = await request(app.getHttpServer())
      .get('/departments')
      .set('Authorization', `Bearer ${authToken}`);
    departmentId = deptResponse.body[0]?.id;

    // Get or create product
    const prodResponse = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${authToken}`);
    productId = prodResponse.body[0]?.id;

    if (!productId) {
      const createProdResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Chicken Product',
          sku: 'TEST-CHICKEN-001',
          category: 'POULTRY',
          unit: 'KG',
          description: 'Test product for Phase 8',
        });
      productId = createProdResponse.body.id;
    }

    // Get or create vehicle
    const vehicleResponse = await request(app.getHttpServer())
      .get('/vehicles')
      .set('Authorization', `Bearer ${authToken}`);
    vehicleId = vehicleResponse.body[0]?.id;

    if (!vehicleId) {
      const createVehicleResponse = await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          registrationNumber: 'TEST-VEH-001',
          vehicleType: 'TRUCK',
          departmentId,
          status: 'ACTIVE',
        });
      vehicleId = createVehicleResponse.body.id;
    }

    // Get users for driver
    const usersResponse = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${authToken}`);
    const users = Array.isArray(usersResponse.body)
      ? usersResponse.body
      : usersResponse.body.data || [];
    driverId = users.find((u: any) => u.role === 'DRIVER')?.id || users[0]?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('8.1 Batch/Lot Tracking Enhancement', () => {
    it('should create a batch with expiry tracking', async () => {
      const today = new Date();
      const manufactureDate = new Date(today);
      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + 30);

      const response = await request(app.getHttpServer())
        .post('/inventory/batches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          batchNumber: `BATCH-${Date.now()}`,
          productId,
          departmentId,
          manufacturingDate: manufactureDate.toISOString().split('T')[0],
          expiryDate: expiryDate.toISOString().split('T')[0],
          initialQuantity: 100,
          currentQuantity: 100,
          costPerUnit: 150,
          status: 'AVAILABLE',
          temperatureAtReceipt: 4,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.batchNumber).toContain('BATCH-');
      expect(response.body.status).toBe('AVAILABLE');
      batchId = response.body.id;
    });

    it('should get all batches', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/batches')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get batches expiring soon', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/batches/expiring-soon?daysAhead=30')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get expired batches', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/batches/expired')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should quarantine a batch', async () => {
      if (!batchId) {
        console.log('Skipping: No batch ID available');
        return;
      }

      const response = await request(app.getHttpServer())
        .post(`/inventory/batches/${batchId}/quarantine`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Quality inspection failed' });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('QUARANTINED');
    });
  });

  describe('8.2 Temperature & Quality Tracking', () => {
    it('should record temperature log', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/temperature-logs/record')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          batchId,
          recordedTemp: 5.5,
          threshold: 4.0,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toMatch(/NORMAL|WARNING|CRITICAL/);
    });

    it('should get temperature alerts', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/temperature-logs/alerts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create quality inspection', async () => {
      if (!batchId || !driverId) {
        console.log('Skipping: No batch or driver ID available');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/inventory/quality-inspections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          batchId,
          inspectorUserId: driverId,
          status: 'PASSED',
          remarks: 'Good quality',
          temperatureReading: 4.5,
          qualityGrade: 'A',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('PASSED');
    });

    it('should get quality inspections by batch', async () => {
      if (!batchId) {
        console.log('Skipping: No batch ID available');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/inventory/quality-inspections/batch/${batchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('8.3 Inventory Valuation Methods', () => {
    it('should get valuation using WEIGHTED_AVERAGE method', async () => {
      if (!departmentId || !productId) {
        console.log('Skipping: No department or product ID available');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(
          `/stock-balances/valuation/${departmentId}/${productId}?method=WEIGHTED_AVERAGE`,
        )
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('quantity');
      expect(response.body).toHaveProperty('value');
      expect(response.body).toHaveProperty('averageRate');
    });

    it('should get valuation using FIFO method', async () => {
      if (!departmentId || !productId) {
        console.log('Skipping: No department or product ID available');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(
          `/stock-balances/valuation/${departmentId}/${productId}?method=FIFO`,
        )
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('quantity');
      expect(response.body).toHaveProperty('value');
    });

    it('should get valuation using LIFO method', async () => {
      if (!departmentId || !productId) {
        console.log('Skipping: No department or product ID available');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(
          `/stock-balances/valuation/${departmentId}/${productId}?method=LIFO`,
        )
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('quantity');
      expect(response.body).toHaveProperty('value');
    });

    it('should compare valuation methods', async () => {
      if (!departmentId || !productId) {
        console.log('Skipping: No department or product ID available');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(
          `/stock-balances/valuation-comparison/${departmentId}/${productId}`,
        )
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('FIFO');
      expect(response.body).toHaveProperty('LIFO');
      expect(response.body).toHaveProperty('WEIGHTED_AVERAGE');
      expect(response.body).toHaveProperty('difference');
    });

    it('should get all inventory valuations', async () => {
      const response = await request(app.getHttpServer())
        .get('/stock-balances/valuations/all?method=FIFO')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('8.4 Complete Fleet Management', () => {
    let insurancePolicyId: string;
    let vehicleDocumentId: string;
    let driverLicenseId: string;

    it('should create insurance policy', async () => {
      if (!vehicleId) {
        console.log('Skipping: No vehicle ID available');
        return;
      }

      const today = new Date();
      const endDate = new Date(today);
      endDate.setFullYear(endDate.getFullYear() + 1);

      const response = await request(app.getHttpServer())
        .post('/fleet/insurance-policies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId,
          policyNumber: `POL-${Date.now()}`,
          provider: 'Test Insurance Company',
          startDate: today.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          premium: 15000,
          coverageAmount: 500000,
          status: 'ACTIVE',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      insurancePolicyId = response.body.id;
    });

    it('should get insurance policies expiring soon', async () => {
      const response = await request(app.getHttpServer())
        .get('/fleet/insurance-policies/expiring-soon?daysAhead=60')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create vehicle document', async () => {
      if (!vehicleId) {
        console.log('Skipping: No vehicle ID available');
        return;
      }

      const today = new Date();
      const expiryDate = new Date(today);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const response = await request(app.getHttpServer())
        .post('/fleet/vehicle-documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId,
          documentType: 'FITNESS',
          documentNumber: `FIT-${Date.now()}`,
          issueDate: today.toISOString().split('T')[0],
          expiryDate: expiryDate.toISOString().split('T')[0],
          issuingAuthority: 'RTO Test',
          status: 'VALID',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      vehicleDocumentId = response.body.id;
    });

    it('should get vehicle documents expiring soon', async () => {
      const response = await request(app.getHttpServer())
        .get('/fleet/vehicle-documents/expiring-soon?daysAhead=60')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create driver license', async () => {
      if (!driverId) {
        console.log('Skipping: No driver ID available');
        return;
      }

      const today = new Date();
      const expiryDate = new Date(today);
      expiryDate.setFullYear(expiryDate.getFullYear() + 5);

      const response = await request(app.getHttpServer())
        .post('/fleet/driver-licenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: driverId,
          licenseNumber: `DL-${Date.now()}`,
          licenseType: 'HEAVY_VEHICLE',
          issueDate: today.toISOString().split('T')[0],
          expiryDate: expiryDate.toISOString().split('T')[0],
          issuingAuthority: 'RTO Test',
          status: 'VALID',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      driverLicenseId = response.body.id;
    });

    it('should get driver licenses expiring soon', async () => {
      const response = await request(app.getHttpServer())
        .get('/fleet/driver-licenses/expiring-soon?daysAhead=90')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get fuel efficiency report', async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 1);

      const response = await request(app.getHttpServer())
        .get(
          `/reports/fleet/fuel-efficiency?startDate=${startDate.toISOString().split('T')[0]}&endDate=${today.toISOString().split('T')[0]}`,
        )
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get maintenance cost report', async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 1);

      const response = await request(app.getHttpServer())
        .get(
          `/reports/fleet/maintenance-cost?startDate=${startDate.toISOString().split('T')[0]}&endDate=${today.toISOString().split('T')[0]}`,
        )
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get trip analysis by vehicle', async () => {
      if (!vehicleId) {
        console.log('Skipping: No vehicle ID available');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/reports/fleet/trip-analysis/vehicle/${vehicleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalTrips');
      expect(response.body).toHaveProperty('totalDistance');
    });

    it('should get trip analysis by driver', async () => {
      if (!driverId) {
        console.log('Skipping: No driver ID available');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/reports/fleet/trip-analysis/driver/${driverId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalTrips');
      expect(response.body).toHaveProperty('totalDistance');
    });

    it('should get vehicle downtime report', async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 1);

      const response = await request(app.getHttpServer())
        .get(
          `/reports/fleet/vehicle-downtime?startDate=${startDate.toISOString().split('T')[0]}&endDate=${today.toISOString().split('T')[0]}`,
        )
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

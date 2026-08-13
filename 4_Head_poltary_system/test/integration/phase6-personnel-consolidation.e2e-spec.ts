import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Phase 6: Personnel Management Consolidation (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let departmentId: string;
  let employeeId: string;
  let workerId: string;
  let driverId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin_labverse@gmail.com', password: 'Admin@12345' })
      .expect(200);

    authToken = loginResponse.body.data.accessToken;

    // Get department
    const deptResponse = await request(app.getHttpServer())
      .get('/departments')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    departmentId = deptResponse.body.data[0]?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('6.1 User Table Enhancement', () => {
    it('should create an employee user', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: `employee_${Date.now()}@test.com`,
          password: 'Test@12345',
          fullName: 'Test Employee',
          phone: '1234567890',
          roleId: await getRoleId(app, authToken, 'EMPLOYEE'),
          departmentId,
          employeeId: `EMP${Date.now()}`,
          designation: 'Senior Manager',
          joiningDate: new Date().toISOString(),
          employmentType: 'SALARY',
          monthlySalary: 50000,
          bankAccountName: 'Test Employee',
          bankAccountNumber: '123456789',
          bankName: 'Test Bank',
          city: 'Test City',
          country: 'Pakistan',
        })
        .expect(201);

      employeeId = response.body.data?.id || response.body.id;
      expect(employeeId).toBeDefined();
    });

    it('should create a worker user', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: `worker_${Date.now()}@test.com`,
          password: 'Test@12345',
          fullName: 'Test Worker',
          phone: '9876543210',
          roleId: await getRoleId(app, authToken, 'WORKER'),
          departmentId,
          employeeId: `WRK${Date.now()}`,
          employmentType: 'DAILY_WAGE',
          dailyWage: 1500,
          city: 'Test City',
        })
        .expect(201);

      workerId = response.body.data?.id || response.body.id;
      expect(workerId).toBeDefined();
    });

    it('should create a driver user', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: `driver_${Date.now()}@test.com`,
          password: 'Test@12345',
          fullName: 'Test Driver',
          phone: '5555555555',
          roleId: await getRoleId(app, authToken, 'DRIVER'),
          departmentId,
          employeeId: `DRV${Date.now()}`,
          designation: 'Driver',
          employmentType: 'DAILY_WAGE',
          dailyWage: 2000,
        })
        .expect(201);

      driverId = response.body.data?.id || response.body.id;
      expect(driverId).toBeDefined();
    });

    it('should get all employees', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it('should get all workers', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/workers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it('should get all drivers', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/drivers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it('should filter users by department', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/department/${departmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it('should assign department to user', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${employeeId}/assign-department`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ departmentId })
        .expect(200);
    });

    it('should update monthly salary', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${employeeId}/update-salary`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ salary: 55000 })
        .expect(200);
    });

    it('should update daily wage', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${workerId}/update-daily-wage`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ wage: 1600 })
        .expect(200);
    });

    it('should get salary details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${employeeId}/salary-details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data || response.body).toBeDefined();
    });

    it('should record resignation', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      await request(app.getHttpServer())
        .post(`/users/${workerId}/resignation`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ resignationDate: futureDate.toISOString() })
        .expect(200);
    });
  });

  describe('6.2 Salary Management', () => {
    let configId: string;
    let paymentId: string;
    let advanceId: string;

    it('should create salary configuration', async () => {
      const response = await request(app.getHttpServer())
        .post('/salary/configurations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: employeeId,
          effectiveDate: new Date().toISOString(),
          amount: 50000,
          currency: 'PKR',
          salaryType: 'SALARY',
          notes: 'Initial configuration',
        })
        .expect(201);

      configId = response.body.data?.id || response.body.id;
      expect(configId).toBeDefined();
    });

    it('should get configurations by user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/salary/configurations/${employeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it('should create salary payment', async () => {
      const response = await request(app.getHttpServer())
        .post('/salary/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: employeeId,
          period: '2025-01',
          amount: 50000,
          paymentDate: new Date().toISOString(),
          paymentMethod: 'Bank Transfer',
          notes: 'January salary',
        })
        .expect(201);

      paymentId = response.body.data?.id || response.body.id;
      expect(paymentId).toBeDefined();
    });

    it('should approve salary payment', async () => {
      await request(app.getHttpServer())
        .patch(`/salary/payments/${paymentId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ approverUserId: 'system' })
        .expect(200);
    });

    it('should mark payment as paid', async () => {
      await request(app.getHttpServer())
        .patch(`/salary/payments/${paymentId}/mark-paid`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should get all payments', async () => {
      const response = await request(app.getHttpServer())
        .get('/salary/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it('should get payments by user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/salary/payments/${employeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it('should create salary advance', async () => {
      const response = await request(app.getHttpServer())
        .post('/salary/advances')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: employeeId,
          amount: 10000,
          reason: 'Medical emergency',
          advanceDate: new Date().toISOString(),
          recoveryMonths: 5,
          monthlyDeduction: 2000,
        })
        .expect(201);

      advanceId = response.body.data?.id || response.body.id;
      expect(advanceId).toBeDefined();
    });

    it('should approve salary advance', async () => {
      await request(app.getHttpServer())
        .patch(`/salary/advances/${advanceId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ approverUserId: 'system' })
        .expect(200);
    });

    it('should get advances by user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/salary/advances/${employeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it('should get payslip', async () => {
      const response = await request(app.getHttpServer())
        .get(`/salary/payslip/${paymentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data || response.body).toBeDefined();
    });
  });
});

// Helper function to get role ID
async function getRoleId(
  app: INestApplication,
  token: string,
  roleName: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .get('/roles')
    .set('Authorization', `Bearer ${token}`);

  const role = (response.body.data || response.body).find(
    (r: any) => r.name === roleName,
  );
  return role?.id || null;
}

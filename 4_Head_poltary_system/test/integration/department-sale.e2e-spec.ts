import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Department Sale e2e', () => {
  let app: INestApplication;
  let authToken: string;
  let departmentId: string;
  let productId: string;
  let customerId: string;
  let createdId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin_labverse@gmail.com', password: 'Admin@12345' });

    authToken =
      loginResponse.body.data?.accessToken || loginResponse.body.accessToken;

    const deptRes = await request(app.getHttpServer())
      .get('/departments')
      .set('Authorization', `Bearer ${authToken}`);
    departmentId = deptRes.body.data?.[0]?.id;

    const prodRes = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${authToken}`);
    productId = prodRes.body.data?.[0]?.id;

    const custRes = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${authToken}`);
    customerId = custRes.body.data?.[0]?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates and lists a department sale', async () => {
    const payload = {
      voucherNumber: `TEST-SALE-${Date.now()}`,
      departmentId,
      customerId,
      productId,
      quantity: 2,
      ratePerUnit: 200,
      totalAmount: 400,
      finalAmount: 400,
      status: 'DRAFT',
      paymentMode: 'CASH',
      saleDate: new Date().toISOString(),
    } as any;

    const createRes = await request(app.getHttpServer())
      .post('/departments/sales')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    createdId = createRes.body.data?.id || createRes.body.id;
    expect(createdId).toBeDefined();

    const listRes = await request(app.getHttpServer())
      .get('/sales')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const responseText = JSON.stringify(listRes.body);
    const voucher = payload.voucherNumber;
    expect(responseText.includes(voucher)).toBe(true);
  });
});

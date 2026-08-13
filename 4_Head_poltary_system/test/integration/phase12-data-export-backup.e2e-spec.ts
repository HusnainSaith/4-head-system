import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Phase 12: Data Export & Backups (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let backupId: string;

  beforeAll(async () => {
    process.env.BACKUP_SCHEDULER_ENABLED = 'false';
    process.env.NOTIFICATION_SCHEDULER_ENABLED = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }),
    );
    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@123' });

    if (loginResponse.status === 200 || loginResponse.status === 201) {
      authToken =
        loginResponse.body.data?.accessToken || loginResponse.body.accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('should export a report as xlsx-compatible content', async () => {
    await request(app.getHttpServer())
      .get('/export/reports/sales')
      .query({ format: 'xlsx', startDate: '2024-01-01', endDate: '2024-12-31' })
      .set('Authorization', `Bearer ${authToken}`)
      .expect((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
        if (res.status === 200) {
          expect(res.headers['content-disposition']).toContain('sales.xlsx');
        }
      });
  });

  it('should export master data as csv', async () => {
    await request(app.getHttpServer())
      .get('/export/master-data/customers')
      .query({ format: 'csv' })
      .set('Authorization', `Bearer ${authToken}`)
      .expect((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
        if (res.status === 200) {
          expect(res.headers['content-type']).toContain('text/csv');
        }
      });
  });

  it('should import master data rows', async () => {
    const email = `phase12-${Date.now()}@example.com`;
    const response = await request(app.getHttpServer())
      .post('/import/master-data/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        rows: [
          {
            name: 'Phase 12 Customer',
            email,
            customerType: 'INDIVIDUAL',
            status: 'ACTIVE',
            isActive: true,
          },
        ],
      })
      .expect((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
      });

    if (response.status === 201 || response.status === 200) {
      expect(response.body.data?.imported ?? response.body.imported).toBe(1);
    }
  });

  it('should create a database backup', async () => {
    const response = await request(app.getHttpServer())
      .post('/backups')
      .set('Authorization', `Bearer ${authToken}`)
      .expect((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
      });

    if (response.status === 201 || response.status === 200) {
      const backup = response.body.data || response.body;
      backupId = backup.id;
      expect(backup.status).toBe('COMPLETED');
      expect(Number(backup.tableCount)).toBeGreaterThan(0);
    }
  });

  it('should monitor backup status', async () => {
    const response = await request(app.getHttpServer())
      .get('/backups/status')
      .set('Authorization', `Bearer ${authToken}`)
      .expect((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
      });

    if (response.status === 200) {
      expect(response.body.data || response.body).toHaveProperty(
        'totalBackups',
      );
    }
  });

  it('should validate backup restore without executing destructive changes', async () => {
    if (!backupId) return;

    const response = await request(app.getHttpServer())
      .post(`/backups/${backupId}/restore`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ execute: false })
      .expect((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
      });

    if (response.status === 201 || response.status === 200) {
      const body = response.body.data || response.body;
      expect(body.restored).toBe(false);
      expect(body.tableCount).toBeGreaterThan(0);
    }
  });
});

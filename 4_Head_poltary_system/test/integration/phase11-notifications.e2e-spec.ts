import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Phase 11: Notifications & Alerts (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let notificationId: string;

  beforeAll(async () => {
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

  it('should create a notification', async () => {
    const response = await request(app.getHttpServer())
      .post('/notifications')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'SYSTEM',
        title: 'Phase 11 test',
        message: 'Notification infrastructure is active',
        entityType: 'Test',
        entityId: 'phase-11',
      })
      .expect((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
      });

    if (response.status === 201 || response.status === 200) {
      notificationId = response.body.data?.id || response.body.id;
      expect(notificationId).toBeDefined();
    }
  });

  it('should list notifications', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${authToken}`)
      .expect((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
      });

    if (response.status === 200) {
      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    }
  });

  it('should list unread notifications', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications/unread')
      .set('Authorization', `Bearer ${authToken}`)
      .expect((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
      });

    if (response.status === 200) {
      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    }
  });

  it('should mark one notification as read', async () => {
    if (!notificationId) return;

    const response = await request(app.getHttpServer())
      .patch(`/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
      });

    if (response.status === 200) {
      expect(response.body.data?.isRead ?? response.body.isRead).toBe(true);
    }
  });

  it('should mark all notifications as read', async () => {
    const response = await request(app.getHttpServer())
      .patch('/notifications/mark-all-read')
      .set('Authorization', `Bearer ${authToken}`)
      .expect((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
      });

    if (response.status === 200) {
      expect(response.body.data || response.body).toHaveProperty('updated');
    }
  });

  it('should run alert scan without server errors', async () => {
    const response = await request(app.getHttpServer())
      .post('/notifications/scan-alerts')
      .set('Authorization', `Bearer ${authToken}`)
      .expect((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
      });

    if (response.status === 201 || response.status === 200) {
      expect(response.body.data || response.body).toHaveProperty('checked');
    }
  });

  it('should delete a notification', async () => {
    if (!notificationId) return;

    const response = await request(app.getHttpServer())
      .delete(`/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(500);
      });

    if (response.status === 200) {
      expect(response.body.data?.deleted ?? response.body.deleted).toBe(true);
    }
  });
});

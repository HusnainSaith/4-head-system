import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Notification } from './notification.entity';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

describe('NotificationsService actions', () => {
  const repository = {
    create: jest.fn((value) => value),
    findOne: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<NotificationsRepository>;
  const mailer = {
    sendMail: jest.fn(),
  } as unknown as jest.Mocked<MailerService>;
  const config = {
    get: jest.fn((_key: string, fallback: string) => fallback),
  } as unknown as ConfigService;
  const users = {} as Repository<User>;
  const service = new NotificationsService(repository, mailer, config, users);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.save.mockImplementation(async (value) => value);
  });

  it('persists an in-app activity notification without email delivery', async () => {
    await service.sendInApp({
      type: 'system',
      title: 'Payment created',
      message: 'A payment was created',
      recipientUserId: '11111111-1111-4111-8111-111111111111',
      sourceType: 'payments',
      sourceId: '22222222-2222-4222-8222-222222222222',
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent', sentAt: expect.any(Date) }),
    );
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it('resends an existing sent notification using the same record', async () => {
    const notification = {
      id: 'notification-1',
      type: 'sale',
      title: 'Sale recorded',
      message: 'A sale was recorded',
      recipientEmail: 'owner@example.com',
      sourceType: 'sale',
      sourceId: '11111111-1111-4111-8111-111111111111',
      status: 'sent',
      sentAt: new Date('2026-07-14'),
      context: {},
    } as Notification;
    repository.findOne.mockResolvedValue(notification);
    mailer.sendMail.mockResolvedValue({} as never);

    await expect(service.resend(notification.id)).resolves.toMatchObject({
      id: notification.id,
      status: 'sent',
      errorMessage: null,
    });
    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@example.com',
        subject: 'Sale recorded',
      }),
    );
  });

  it('soft-deletes a notification without removing its delivery history', async () => {
    repository.findOne.mockResolvedValue({
      id: 'notification-1',
    } as Notification);

    await expect(
      service.remove('notification-1', 'owner-1'),
    ).resolves.toMatchObject({ success: true, data: null });
    expect(repository.softDelete).toHaveBeenCalledWith(
      'notification-1',
      'owner-1',
    );
  });
});

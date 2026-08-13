import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { Repository } from 'typeorm';
import { User } from '../../../src/modules/users/entities/user.entity';
import { Notification } from '../../../src/modules/notifications/notification.entity';
import { NotificationsRepository } from '../../../src/modules/notifications/notifications.repository';
import { NotificationsService } from '../../../src/modules/notifications/notifications.service';

describe('NotificationsService', () => {
  const repository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  };
  const mailer = { sendMail: jest.fn() };
  const config = {
    get: jest.fn((_key: string, fallback: unknown) => fallback),
  };
  const users = { findOne: jest.fn() };
  const service = new NotificationsService(
    repository as unknown as NotificationsRepository,
    mailer as unknown as MailerService,
    config as unknown as ConfigService,
    users as unknown as Repository<User>,
  );
  const dto = {
    type: 'sale',
    title: 'Sale Invoice',
    message: 'Sale recorded',
    recipientEmail: 'owner@example.com',
    sourceType: 'sale',
    sourceId: '00000000-0000-4000-8000-000000000001',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.create.mockImplementation((value) => value);
    repository.save.mockImplementation(async (value) => ({
      id: 'notification-1',
      ...value,
    }));
  });

  it('persists and sends an email notification', async () => {
    mailer.sendMail.mockResolvedValue({});
    const result = await service.send(dto);
    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: dto.recipientEmail, template: 'sale' }),
    );
    expect(result.status).toBe('sent');
  });

  it('marks notification failed when SMTP throws', async () => {
    mailer.sendMail.mockRejectedValue(new Error('SMTP unavailable'));
    const result = await service.send(dto);
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toBe('SMTP unavailable');
  });

  it('retries the same failed notification without creating a duplicate row', async () => {
    repository.findOne.mockResolvedValue({
      id: 'notification-1',
      ...dto,
      status: 'failed',
      context: {},
    } as Notification);
    mailer.sendMail.mockResolvedValue({});
    const result = await service.retry('notification-1');
    expect(repository.create).not.toHaveBeenCalled();
    expect(result.status).toBe('sent');
  });

  it('sends every bulk notification', async () => {
    const spy = jest
      .spyOn(service, 'send')
      .mockResolvedValue({} as Notification);
    await service.sendBulk([
      dto,
      { ...dto, sourceId: '00000000-0000-4000-8000-000000000002' },
    ]);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

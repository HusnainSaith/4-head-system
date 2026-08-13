import { lastValueFrom, of } from 'rxjs';
import { AuditLoggingInterceptor } from './audit-logging.interceptor';

describe('AuditLoggingInterceptor important route notifications', () => {
  const audit = { log: jest.fn(), logFailure: jest.fn() };
  const notifications = { sendInApp: jest.fn().mockResolvedValue(undefined) };
  const interceptor = new AuditLoggingInterceptor(
    audit as never,
    notifications as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates an in-app notification after a successful financial mutation', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/zakat-funds/payments',
          user: { id: '11111111-1111-4111-8111-111111111111' },
          body: { amount: '3000.00' },
          params: {},
          ip: '127.0.0.1',
          headers: {},
        }),
      }),
    };

    await lastValueFrom(
      interceptor.intercept(context as never, {
        handle: () => of({ id: '22222222-2222-4222-8222-222222222222' }),
      }),
    );
    await Promise.resolve();

    expect(notifications.sendInApp).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: '11111111-1111-4111-8111-111111111111',
        sourceType: 'zakat_funds',
        sourceId: '22222222-2222-4222-8222-222222222222',
        message: expect.stringContaining('Rs 3000.00'),
      }),
    );
  });

  it('does not notify for read-only routes', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/investors',
          user: { id: '11111111-1111-4111-8111-111111111111' },
          body: {},
          params: {},
          headers: {},
        }),
      }),
    };
    await lastValueFrom(
      interceptor.intercept(context as never, { handle: () => of([]) }),
    );
    expect(notifications.sendInApp).not.toHaveBeenCalled();
  });
});

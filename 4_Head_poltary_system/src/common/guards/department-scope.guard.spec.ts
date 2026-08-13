import { ForbiddenException } from '@nestjs/common';
import { DepartmentScopeGuard } from './department-scope.guard';

const context = (request: any) =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;

describe('DepartmentScopeGuard', () => {
  const dataSource = { query: jest.fn() } as any;
  const guard = new DepartmentScopeGuard(dataSource);
  const staff = {
    id: 'user-1',
    role: { name: 'department_staff' },
    departmentId: '11111111-1111-4111-8111-111111111111',
    departmentType: 'BROKERAGE',
  };

  beforeEach(() => jest.clearAllMocks());

  it('rejects a spoofed body department', async () => {
    await expect(
      guard.canActivate(
        context({
          user: staff,
          method: 'POST',
          body: { departmentId: '22222222-2222-4222-8222-222222222222' },
          query: {},
          params: {},
          originalUrl: '/expenses',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("binds write requests to the staff member's assigned department when absent", async () => {
    const request: any = {
      user: staff,
      method: 'POST',
      body: {},
      query: {},
      params: {},
      originalUrl: '/expenses',
    };

    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request.body.departmentId).toBe(staff.departmentId);
  });

  it('forces GET filters to the assigned department', async () => {
    const request: any = {
      user: staff,
      method: 'GET',
      body: {},
      query: {},
      params: {},
      originalUrl: '/expenses',
    };
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request.query.departmentId).toBe(staff.departmentId);
  });

  it('rejects a direct record owned by another department', async () => {
    dataSource.query.mockResolvedValue([
      { department_id: '22222222-2222-4222-8222-222222222222' },
    ]);
    await expect(
      guard.canActivate(
        context({
          user: staff,
          method: 'GET',
          body: {},
          query: {},
          params: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
          originalUrl: '/expenses/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not restrict owners', async () => {
    await expect(
      guard.canActivate(
        context({ user: { role: { name: 'owner' } }, body: {}, query: {} }),
      ),
    ).resolves.toBe(true);
  });
});

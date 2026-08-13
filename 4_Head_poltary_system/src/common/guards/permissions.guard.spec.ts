import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { PermissionsGuard } from './permissions.guard';
import { User } from '../../modules/users/entities/user.entity';

describe('PermissionsGuard', () => {
  it('allows the full-access owner without requiring seeded permissions', async () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(['users.read']),
    } as unknown as Reflector;
    const query = jest.fn();
    const repository = {
      manager: { query },
    } as unknown as Repository<User>;
    const request = {
      user: { id: 'user-1', role: { name: 'owner' } },
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(
      new PermissionsGuard(reflector, repository).canActivate(context),
    ).resolves.toBe(true);
    expect(query).not.toHaveBeenCalled();
  });
});

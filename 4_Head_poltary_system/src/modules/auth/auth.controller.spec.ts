import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController cookie sessions', () => {
  const authService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
    validateUser: jest.fn(),
  };
  const controller = new AuthController(authService as unknown as AuthService);
  const response = () =>
    ({ cookie: jest.fn(), clearCookie: jest.fn() }) as unknown as Response;

  beforeEach(() => jest.clearAllMocks());

  it('sets httpOnly tokens and does not expose them in the login body', async () => {
    authService.login.mockResolvedValue({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: 'access',
        refreshToken: 'refresh',
        user: {
          id: 'u1',
          role: { id: 'r1', name: 'owner', description: null },
        },
      },
    });
    const res = response();
    const result = await controller.login(
      { email: 'a@b.com', password: 'Password1' },
      res,
    );
    expect(res.cookie).toHaveBeenCalledWith(
      '4head_access_token',
      'access',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      '4head_refresh_token',
      'refresh',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
    );
    expect(result.data).toEqual({
      user: { id: 'u1', role: { id: 'r1', name: 'owner', description: null } },
    });
  });

  it('rotates both session cookies on refresh', async () => {
    authService.refreshToken.mockResolvedValue({
      success: true,
      message: 'refreshed',
      data: { accessToken: 'next-access', refreshToken: 'next-refresh' },
    });
    const res = response();
    await controller.refresh(
      {},
      { headers: { cookie: '4head_refresh_token=old' } } as Request,
      res,
    );
    expect(authService.refreshToken).toHaveBeenCalledWith({
      refreshToken: 'old',
    });
    expect(res.cookie).toHaveBeenCalledWith(
      '4head_refresh_token',
      'next-refresh',
      expect.objectContaining({ httpOnly: true }),
    );
  });
});

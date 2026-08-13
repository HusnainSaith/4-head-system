import type { NextFunction, Request, Response } from 'express';
import { csrfProtection } from './csrf-protection.middleware';

function request(overrides: Partial<Request>): Request {
  return {
    method: 'POST',
    path: '/expenses',
    headers: {},
    header: jest.fn(),
    ...overrides,
  } as unknown as Request;
}

describe('csrfProtection', () => {
  it('blocks a cookie-authenticated write without the matching header', () => {
    const next = jest.fn() as NextFunction;
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    csrfProtection(
      request({
        headers: { cookie: '4head_access_token=jwt; 4head_csrf_token=abc' },
      }),
      { status } as unknown as Response,
      next,
    );
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a matching double-submit token', () => {
    const next = jest.fn() as NextFunction;
    const req = request({
      headers: { cookie: '4head_access_token=jwt; 4head_csrf_token=abc' },
      header: jest.fn(() => 'abc') as any,
    });
    csrfProtection(req, {} as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not interfere with bearer-only API clients', () => {
    const next = jest.fn() as NextFunction;
    csrfProtection(request({ headers: {} }), {} as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

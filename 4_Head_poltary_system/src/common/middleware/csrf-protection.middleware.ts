import type { NextFunction, Request, Response } from 'express';

const PUBLIC_WRITES = [
  '/auth/login',
  '/auth/register',
  '/auth/password-forgot',
  '/auth/reset-password',
];

function parseCookies(header = ''): Record<string, string> {
  return Object.fromEntries(
    header
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [key, ...value] = item.split('=');
        return [key, decodeURIComponent(value.join('='))];
      }),
  );
}

/** Double-submit protection for browser cookie sessions. Bearer clients are unaffected. */
export function csrfProtection(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
  if (PUBLIC_WRITES.some((path) => request.path.endsWith(path))) return next();
  const cookies = parseCookies(request.headers.cookie);
  const usesCookieAuth = Boolean(
    cookies['4head_access_token'] || cookies['4head_refresh_token'],
  );
  if (!usesCookieAuth) return next();
  const csrfHeader = request.header('x-csrf-token');
  if (!csrfHeader || csrfHeader !== cookies['4head_csrf_token']) {
    return response.status(403).json({
      statusCode: 403,
      message: 'Invalid CSRF token',
      error: 'Forbidden',
    });
  }
  return next();
}

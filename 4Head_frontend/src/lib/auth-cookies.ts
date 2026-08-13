import Cookies from "js-cookie";

const AUTH_PROFILE_COOKIE = "4head_auth_profile";
const CSRF_TOKEN_COOKIE = "4head_csrf_token";

const cookieOptions: Cookies.CookieAttributes = {
  path: "/",
  secure: !import.meta.env.DEV,
  sameSite: "strict",
};

export function setAuthProfile(profile: unknown): void {
  Cookies.set(AUTH_PROFILE_COOKIE, JSON.stringify(profile), {
    ...cookieOptions,
    expires: 7,
  });
}

export function getAuthProfile(): unknown {
  const profile = Cookies.get(AUTH_PROFILE_COOKIE);
  if (!profile) return null;
  try {
    return JSON.parse(profile) as unknown;
  } catch {
    return null;
  }
}

export function getCsrfToken(): string | null {
  return Cookies.get(CSRF_TOKEN_COOKIE) ?? null;
}

export function clearAuthCookies(): void {
  Cookies.remove(AUTH_PROFILE_COOKIE, cookieOptions);
}

/** Claims emitted by the backend auth service. */
export interface JwtPayload {
  sub: string;
  email?: string;
  departmentCode?: string | null;
  type?: "refresh" | "password-reset";
  iat?: number;
  exp: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Decodes claims without verifying the signature; the API remains authoritative. */
export function decodeJwtPayload(token: string): JwtPayload | null {
  const segments = token.split(".");
  if (segments.length !== 3) return null;

  try {
    const normalized = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(padded), (character) =>
      character.charCodeAt(0),
    );
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));

    if (
      !isRecord(parsed) ||
      typeof parsed.sub !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    return parsed as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenExpiration(token: string): Date | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return new Date(payload.exp * 1000);
}

export function getTokenSecondsUntilExpiry(token: string): number {
  const expiration = getTokenExpiration(token);
  if (!expiration) return 0;
  return Math.max(0, Math.floor((expiration.getTime() - Date.now()) / 1000));
}

export function isTokenUnexpired(token: string): boolean {
  return getTokenSecondsUntilExpiry(token) > 0;
}

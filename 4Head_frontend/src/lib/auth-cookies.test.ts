import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieMocks = vi.hoisted(() => ({
  get: vi.fn<(name: string) => string | undefined>(),
  set: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("js-cookie", () => ({ default: cookieMocks }));

import {
  clearAuthCookies,
  getAuthProfile,
  getCsrfToken,
  setAuthProfile,
} from "@/lib/auth-cookies";

beforeEach(() => vi.clearAllMocks());

describe("auth-cookies", () => {
  it("stores only non-sensitive profile bootstrap data", () => {
    const profile = { id: "user-1", fullName: "Owner" };
    setAuthProfile(profile);
    expect(cookieMocks.set).toHaveBeenCalledWith(
      "4head_auth_profile",
      JSON.stringify(profile),
      expect.objectContaining({
        sameSite: "strict",
        expires: 7,
      }),
    );
    cookieMocks.get.mockReturnValue(JSON.stringify(profile));
    expect(getAuthProfile()).toEqual(profile);
    cookieMocks.get.mockReturnValue("csrf-value");
    expect(getCsrfToken()).toBe("csrf-value");

    clearAuthCookies();
    expect(cookieMocks.remove).toHaveBeenCalledTimes(1);
    expect(cookieMocks.remove).toHaveBeenCalledWith(
      "4head_auth_profile",
      expect.objectContaining({ sameSite: "strict" }),
    );
  });
});

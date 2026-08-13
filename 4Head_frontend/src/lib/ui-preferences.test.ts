import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieMocks = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    get: vi.fn((name: string) => values.get(name)),
    set: vi.fn((name: string, value: string) => {
      values.set(name, value);
    }),
  };
});

vi.mock("js-cookie", () => ({ default: cookieMocks }));

import {
  getSidebarCollapsed,
  setSidebarCollapsed,
} from "@/lib/ui-preferences";

beforeEach(() => {
  cookieMocks.values.clear();
  vi.clearAllMocks();
});

describe("sidebar preference cookie", () => {
  it("defaults to expanded and restores the saved state across reads", () => {
    expect(getSidebarCollapsed()).toBe(false);
    setSidebarCollapsed(true);
    expect(getSidebarCollapsed()).toBe(true);
    expect(cookieMocks.set).toHaveBeenCalledWith(
      "4head_sidebar_collapsed",
      "true",
      expect.objectContaining({ path: "/", expires: 365 }),
    );
    setSidebarCollapsed(false);
    expect(getSidebarCollapsed()).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "./api-error";

describe("getApiErrorMessage", () => {
  it("returns the exact backend message from an RTK Query response", () => {
    expect(
      getApiErrorMessage({
        status: 400,
        data: { message: "Insufficient stock: only 12.5 kg is available" },
      }),
    ).toBe("Insufficient stock: only 12.5 kg is available");
  });

  it("prefers actionable backend validation details", () => {
    expect(
      getApiErrorMessage({
        status: 400,
        data: {
          message: "Validation failed",
          details: ["quantity_kg must be positive", "party_id must be a UUID"],
        },
      }),
    ).toBe("quantity_kg must be positive, party_id must be a UUID");
  });

  it("supports NestJS message arrays", () => {
    expect(
      getApiErrorMessage({
        status: 400,
        data: { message: ["email must be an email", "password is too short"] },
      }),
    ).toBe("email must be an email, password is too short");
  });

  it("supports nested error envelopes", () => {
    expect(
      getApiErrorMessage({
        response: { data: { message: "This party is inactive" } },
      }),
    ).toBe("This party is inactive");
  });

  it("supports ordinary errors", () => {
    expect(getApiErrorMessage(new Error("Database request was rejected"))).toBe(
      "Database request was rejected",
    );
  });

  it("uses a network-specific fallback when no backend response exists", () => {
    expect(
      getApiErrorMessage({ status: "FETCH_ERROR", error: "Failed to fetch" }),
    ).toBe(
      "Unable to connect to the server. Check your connection and try again.",
    );
  });
});

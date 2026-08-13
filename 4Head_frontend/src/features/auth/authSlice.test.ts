import { describe, expect, it } from "vitest";
import authReducer, {
  credentialsSet,
  loggedOut,
} from "@/features/auth/authSlice";
import { ownerUser } from "@/test/auth-fixtures";

describe("authSlice", () => {
  it("sets credentials and resets the derived session on logout", () => {
    const authenticated = authReducer(undefined, credentialsSet(ownerUser));

    expect(authenticated).toEqual({
      user: ownerUser,
      isAuthenticated: true,
      isCheckingAuth: false,
    });

    expect(authReducer(authenticated, loggedOut())).toEqual({
      user: null,
      isAuthenticated: false,
      isCheckingAuth: false,
    });
  });
});

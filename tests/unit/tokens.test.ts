import { describe, expect, it } from "vitest";
import { signAccessToken, signRefreshToken, verifyToken } from "@/lib/auth/tokens";

describe("JWT tokens", () => {
  it("round-trips claims through sign and verify", async () => {
    const token = await signAccessToken({ sub: "user-123", role: "ADMIN" });
    const claims = await verifyToken(token);
    expect(claims).toEqual({ sub: "user-123", role: "ADMIN" });
  });

  it("verifies refresh tokens with the same secret", async () => {
    const token = await signRefreshToken({ sub: "user-456", role: "STUDENT" });
    expect((await verifyToken(token))?.role).toBe("STUDENT");
  });

  it("rejects tampered, malformed and missing tokens", async () => {
    const token = await signAccessToken({ sub: "user-123", role: "ADMIN" });
    expect(await verifyToken(`${token}tampered`)).toBeNull();
    expect(await verifyToken("not-a-jwt")).toBeNull();
    expect(await verifyToken(undefined)).toBeNull();
  });
});

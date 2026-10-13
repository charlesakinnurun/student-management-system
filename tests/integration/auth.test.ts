import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { verifyToken } from "@/lib/auth/tokens";
import { authenticate } from "@/lib/services/auth.service";
import { resetDatabase } from "../helpers/db";

beforeEach(async () => {
  await resetDatabase();
});

async function makeUser(status = "ACTIVE") {
  return prisma.user.create({
    data: {
      email: "admin@test.edu",
      passwordHash: await hashPassword("Password1"),
      role: "ADMIN",
      status,
    },
  });
}

describe("authentication", () => {
  it("issues access and refresh tokens for valid credentials", async () => {
    const user = await makeUser();
    const result = await authenticate("admin@test.edu", "Password1");

    expect(result.user.id).toBe(user.id);
    expect(result.user.role).toBe("ADMIN");

    const claims = await verifyToken(result.accessToken);
    expect(claims).toEqual({ sub: user.id, role: "ADMIN" });
    expect(await verifyToken(result.refreshToken)).not.toBeNull();
  });

  it("rejects a wrong password with a generic 401", async () => {
    await makeUser();
    await expect(authenticate("admin@test.edu", "wrong-password")).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("returns the same generic error for an unknown email (no user enumeration)", async () => {
    const missing = await authenticate("nobody@test.edu", "Password1").catch((error) => error);
    const wrong = await authenticate("nobody@test.edu", "Password1").catch((error) => error);
    expect(missing.message).toBe(wrong.message);
    expect(missing.message).toBe("Invalid email or password");
  });

  it("blocks suspended accounts", async () => {
    await makeUser("SUSPENDED");
    await expect(authenticate("admin@test.edu", "Password1")).rejects.toMatchObject({ status: 403 });
  });

  it("records an audit event on successful login and on failure", async () => {
    await makeUser();
    await authenticate("admin@test.edu", "Password1");
    await authenticate("admin@test.edu", "bad").catch(() => undefined);

    expect(await prisma.auditLog.count({ where: { action: "auth.login" } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "auth.login_failed" } })).toBe(1);
  });
});

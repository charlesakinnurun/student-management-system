import { describe, expect, it } from "vitest";
import { hashPassword, isStrongPassword, verifyPassword } from "@/lib/auth/password";
import { can, hasRole, isRole, ROLE_HOME } from "@/lib/auth/rbac";

describe("password hashing", () => {
  it("never stores the plaintext password", async () => {
    const hash = await hashPassword("Password1");
    expect(hash).not.toBe("Password1");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("verifies the correct password and rejects the wrong one", async () => {
    const hash = await hashPassword("Password1");
    expect(await verifyPassword("Password1", hash)).toBe(true);
    expect(await verifyPassword("Password2", hash)).toBe(false);
  });

  it("generates a different hash (salt) for the same password", async () => {
    const [a, b] = await Promise.all([hashPassword("Password1"), hashPassword("Password1")]);
    expect(a).not.toBe(b);
  });
});

describe("password policy", () => {
  it("requires length, a letter and a number", () => {
    expect(isStrongPassword("Password1")).toBe(true);
    expect(isStrongPassword("short1")).toBe(false);
    expect(isStrongPassword("12345678")).toBe(false);
    expect(isStrongPassword("abcdefgh")).toBe(false);
  });
});

describe("rbac", () => {
  it("recognises valid roles only", () => {
    expect(isRole("ADMIN")).toBe(true);
    expect(isRole("SUPERUSER")).toBe(false);
    expect(isRole(null)).toBe(false);
  });

  it("checks role membership", () => {
    expect(hasRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("STUDENT", "ADMIN", "LECTURER")).toBe(false);
  });

  it("grants capabilities per role (server-side authority matrix)", () => {
    expect(can("ADMIN", "students:manage")).toBe(true);
    expect(can("LECTURER", "attendance:manage")).toBe(true);
    expect(can("LECTURER", "students:manage")).toBe(false);
    expect(can("STUDENT", "self:view")).toBe(true);
    expect(can("STUDENT", "grades:manage")).toBe(false);
    expect(can(null, "self:view")).toBe(false);
  });

  it("maps each role to a landing route", () => {
    expect(ROLE_HOME).toEqual({ ADMIN: "/admin", LECTURER: "/lecturer", STUDENT: "/student" });
  });
});

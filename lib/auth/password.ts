import bcrypt from "bcryptjs";

/**
 * Password hashing is centralised so the work factor can be tuned in one place
 * and never accidentally downgraded. Cost 12 is a sensible 2020s default.
 */
const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  // bcrypt.compare is constant-time with respect to the stored hash.
  return bcrypt.compare(plain, hash);
}

/**
 * Password policy, enforced server-side. Intentionally simple and explicit:
 * 8+ chars with at least one letter and one number. Strength meters are UX,
 * not security — length and entropy matter more than character classes.
 */
export function isStrongPassword(plain: string): boolean {
  return plain.length >= 8 && /[A-Za-z]/.test(plain) && /\d/.test(plain);
}

export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include a letter and a number";

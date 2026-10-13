import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/lib/domain/enums";
import { env } from "@/lib/env";

const secretKey = new TextEncoder().encode(env.JWT_SECRET);

export interface TokenClaims {
  sub: string;
  role: UserRole;
}

/**
 * Stateless JWT helpers (HS256). Rotation/expiry are handled by issuing two
 * cookies: a short-lived access token and a longer-lived refresh token.
 */
export async function signAccessToken(claims: TokenClaims): Promise<string> {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secretKey);
}

export async function signRefreshToken(claims: TokenClaims): Promise<string> {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(env.REFRESH_TOKEN_EXPIRES_IN)
    .sign(secretKey);
}

/** Verify a token, returning its claims or null when invalid/expired. */
export async function verifyToken(token: string | undefined): Promise<TokenClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return { sub: payload.sub, role: payload.role as UserRole };
  } catch {
    return null;
  }
}

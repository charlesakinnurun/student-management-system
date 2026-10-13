import type { UserRole } from "@/lib/domain/enums";

export const ROLES = ["ADMIN", "LECTURER", "STUDENT"] as const satisfies readonly UserRole[];

/** Landing route for each role after authentication. */
export const ROLE_HOME: Record<UserRole, string> = {
  ADMIN: "/admin",
  LECTURER: "/lecturer",
  STUDENT: "/student",
};

export function isRole(value: unknown): value is UserRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function hasRole(role: UserRole | undefined | null, ...allowed: UserRole[]): boolean {
  return !!role && allowed.includes(role);
}

/**
 * Role → capability matrix used by the UI to hide affordances it cannot use.
 * This is *presentation only*; the API re-checks every request server-side.
 */
export const CAPABILITIES = {  ADMIN: [
    "students:manage",
    "staff:manage",
    "academics:manage",
    "enrollments:manage",
    "assessments:manage",
    "attendance:manage",
    "fees:manage",
    "announcements:manage",
    "analytics:view",
    "audit:view",
    "users:manage",
  ],
  LECTURER: [
    "courses:view-assigned",
    "assessments:manage",
    "attendance:manage",
    "announcements:manage",
    "analytics:view-course",
  ],
  STUDENT: [
    "self:view",
    "results:view-own",
    "announcements:view",
  ],
} as const satisfies Record<UserRole, readonly string[]>;

export type Capability = (typeof CAPABILITIES)[UserRole][number];

export function can(role: UserRole | undefined | null, capability: string): boolean {
  if (!role) return false;
  return (CAPABILITIES[role] as readonly string[]).includes(capability);
}

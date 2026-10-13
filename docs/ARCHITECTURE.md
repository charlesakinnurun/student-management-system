# Student Management System — Architecture & Implementation Plan

> Status: living document. Decisions marked **[D-n]** are logged with rationale.

## 1. Context

The repository was scaffolded (Next.js + Prisma + Tailwind + Zod) but contained **no application
code**. The only substantive asset is `prisma/schema.prisma`, a normalised 20-model schema that we
adopt as the source of truth for the data layer.

## 2. Technology decisions

| Concern | Choice | Rationale |
| --- | --- | --- |
| Framework | Next.js 14 App Router | Already pinned; gives SSR, route handlers, code splitting, middleware. |
| Language | TypeScript `strict` | Already configured. |
| Data | Prisma 5 + SQLite (dev) / PostgreSQL (prod) | Already configured. Provider swap is a one-line change + regenerated migration. |
| API | REST via Route Handlers (`app/api/**/route.ts`) | Explicit, cacheable, testable without a running server when services are pure. |
| Validation | Zod 4 | Already a dependency; schemas shared between client and server. |
| Auth | Signed JWT session cookies (`jose`, HS256) + `bcryptjs` | Edge-compatible verification in middleware; httpOnly cookies avoid XSS token theft. |
| Styling | Tailwind CSS w/ CSS-variable design tokens | Zero runtime, small bundle. |
| Tests | Vitest | Already configured. |

### Decision log

- **[D-1] Access + refresh cookies.** `sms_at` (15m, `JWT_EXPIRES_IN`) and `sms_rt` (7d,
  `REFRESH_TOKEN_EXPIRES_IN`), both `httpOnly`, `SameSite=Lax`, `Secure` in production.
  `getSession()` verifies the access token and falls back to the refresh token so server-rendered
  pages stay coherent without cookie mutation. `POST /api/auth/refresh` rotates the access token.
  The client API wrapper transparently refreshes on a single 401 and retries once.
- **[D-2] SameSite=Lax + origin check** for CSRF. Modern browsers do not attach `Lax` cookies to
  cross-site mutating requests; we additionally verify the `Origin` header on mutating methods.
- **[D-3] Layered architecture.** `route handler → service (domain) → Prisma`. Route handlers own
  HTTP only (parse, authorise, status codes). Services own business rules and are unit-testable.
- **[D-4] "Class" is represented, not duplicated.** A class/teaching group is `Course` +
  `AcademicSession` + `Semester` + `level`, joined to students through `Enrollment`. Adding a
  separate `Class` table would duplicate this without new capability. Deviation logged rather than
  silently ignored.
- **[D-5] Grades are data, not code.** `GradingRule` rows (ordered score bands → grade + points)
  drive letter grades and GPA. A `default` set is seeded; institutions can add their own `setName`.
- **[D-6] Rate limiting is in-memory** (fixed-window) for auth endpoints. Documented limitation:
  single-instance only; swap the store for Redis in multi-instance deployments (`lib/security/rate-limit.ts`).
- **[D-7] No ORM-level soft delete.** The schema uses explicit `status` fields (`UserStatus`,
  `EnrollmentStatus`) where soft state matters; hard deletes use `Restrict` FKs so referenced rows
  cannot be silently orphaned.
- **[D-8] ESLint.** `npm run lint` referenced `next lint` but ESLint was never installed. We add
  `eslint` + `eslint-config-next` (dev-only) so the documented lint command actually runs, and keep
  `tsc --noEmit` as the authoritative type gate.

## 3. Folder structure

```
app/
  (auth)/login/                 # public auth UI
  (dashboard)/                  # authenticated shell (sidebar + topbar)
    admin/ lecturer/ student/   # role-scoped areas
  api/                          # REST route handlers
  layout.tsx globals.css
components/
  ui/                           # primitives: Button, Input, Card, Modal, Toast, ...
  data-table/                   # generic DataTable + ResourceTable
  forms/                        # declarative ResourceForm + field renderer
  layout/                       # AppShell, Sidebar, Topbar
  features/                     # feature components (ScoreEntryGrid, AttendanceRecorder, ...)
lib/
  auth/                         # password, tokens, session, rbac
  http/                         # errors, response, handler wrapper, pagination
  validation/                   # zod schemas (shared client/server)
  services/                     # domain/business logic
  security/                     # rate limiting, origin checks
  audit.ts db.ts env.ts api-client.ts utils.ts
prisma/ schema.prisma migrations/ seed.ts
tests/                          # vitest (unit + service integration)
docs/                           # ARCHITECTURE.md, API.md
```

## 4. Database

Adopted from `prisma/schema.prisma` unchanged. Highlights:

- Every mutable entity carries `createdAt`/`updatedAt`; administrative entities carry
  `createdBy`/`updatedBy`.
- `Enrollment` has `@@unique([studentId, courseId, sessionId, semesterId])` → duplicate enrolment is
  rejected at the database, not just the API.
- `Score` has `@@unique([assessmentId, enrollmentId])`; edits append to `GradeHistory` (audit of
  grade changes).
- `Attendance` has `@@unique([enrollmentId, date])` → idempotent daily marking.
- Composite indexes target the real access paths (e.g. `[departmentId, level, status]`,
  `[courseId, sessionId]`, `[audience, publishedAt]`).

## 5. API

Uniform envelope:

```jsonc
// success
{ "data": <T>, "meta": { "page": 1, "pageSize": 20, "total": 137, "totalPages": 7 } }
// error
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [...] } }
```

- **Auth:** `POST /api/auth/login|logout|refresh`, `GET /api/auth/me`.
- **Resources:** `GET/POST /api/<resource>`, `GET/PATCH/DELETE /api/<resource>/[id]`.
  List endpoints support `page, pageSize, q, sort, order` + resource filters.
- **Domain actions:** `POST /api/scores`, `PATCH /api/scores/[id]`,
  `PUT /api/attendance` (bulk upsert), `POST /api/payments`, `GET /api/dashboard/{admin,lecturer,student}`,
  `GET /api/audit-logs`, `GET /api/health`.

Status codes: 200/201/204 success, 400 validation, 401 unauthenticated, 403 forbidden,
404 not found, 409 conflict, 422 business rule, 429 rate limited, 500 unexpected.

## 6. AuthN / AuthZ

- Passwords: bcrypt, cost 12. Never returned by any API (services project safe fields).
- `requireSession()` (any role) and `requireRole(...roles)` guards used inside route handlers —
  **authorisation is enforced server-side on every request**; the UI merely reflects it.
- Ownership guards for IDOR: student endpoints resolve the caller's `StudentProfile` from the
  session and scope queries by it; lecturers may only touch their assigned courses.
- Middleware: verifies token presence/validity for `/admin|/lecturer|/student`, sets security
  headers (CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS in prod).

## 7. Frontend

- Server components for shells/layout & initial data where cheap; client components for
  interactive tables/forms.
- Reusable `DataTable` (search, sort, pagination, row actions, bulk actions, loading/empty/error
  states) + declarative `ResourceForm` (client validation via shared Zod schema, server error
  mapping, disabled-while-submitting).
- `ToastProvider` for success/error feedback; `ConfirmDialog` for destructive actions.
- Accessibility: labelled inputs, `aria-invalid`/`aria-describedby`, keyboard-operable dialogs,
  focus management, semantic landmarks, visible focus rings.

## 8. Testing strategy

| Layer | Tests |
| --- | --- |
| Unit | grade calculation, GPA, attendance %, pagination parsing, password hashing, RBAC matrix |
| Service integration | student CRUD + uniqueness, enrolment duplicate prevention, score validation + history, attendance idempotency |
| API/auth | unauthenticated 401, wrong-role 403, invalid input 400, IDOR, duplicate 409 |

Integration tests run against the Prisma datasource using a disposable SQLite file so they exercise
real constraints.

## 9. Security strategy

bcrypt password hashing; httpOnly/SameSite cookies; server-side RBAC; Zod validation on every
mutation; Prisma parameterised queries (no raw SQL → no injection); React escaping → XSS;
origin check + SameSite → CSRF; auth rate limiting; central error handler that never leaks
stack traces or internal messages; append-only `AuditLog` for administrative actions and auth
events; generic login errors to prevent user enumeration.

**Content-Security-Policy trade-off.** `script-src` includes `'unsafe-inline'` because the
Next.js App Router emits inline bootstrap/hydration scripts. Remote script origins remain
blocked (the primary XSS exfiltration vector) and `frame-ancestors 'none'`, `object-src 'none'`
and `base-uri 'self'` are enforced. The recommended next step is a per-request nonce issued from
middleware (`script-src 'self' 'nonce-…' 'strict-dynamic'`), which requires reading the nonce in
the root layout. This is logged as deliberate, not overlooked.

## 10. Deployment

1. `npm ci`
2. `prisma migrate deploy` (Postgres: set provider + `DATABASE_URL`)
3. `npm run build`
4. `npm start` behind TLS.
Env validated at boot by `lib/env.ts`. Docker/CI notes in README.

## 11. Increment plan (commit-sized)

1. chore: foundation (gitignore, env, config, prisma client, tooling)
2. feat: database migration + seed
3. feat: auth (password, tokens, session, RBAC, cookies, rate limit) + middleware
4. feat: HTTP framework + audit + validation schemas
5. feat: students module (service → API → UI)
6. feat: academic structure (faculties, departments, programs, courses, sessions, semesters)
7. feat: enrolment
8. feat: assessments, scores, grade calculation
9. feat: attendance
10. feat: fees & payments
11. feat: announcements
12. feat: dashboards (admin/lecturer/student) + analytics
13. feat: student portal
14. feat: audit log UI + users/roles admin
15. test: unit + integration suites
16. docs: README, API, deployment
17. chore: production-readiness pass

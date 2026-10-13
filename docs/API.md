# API Reference

All endpoints are under `/api`. Responses use a consistent envelope:

```jsonc
// success (list)
{ "data": [ /* … */ ], "meta": { "page": 1, "pageSize": 20, "total": 137, "totalPages": 7 } }
// success (single)
{ "data": { /* … */ } }
// error
{ "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": [{ "path": "email", "message": "…" }] } }
```

**List query parameters** (where applicable): `page`, `pageSize` (1–100), `q`, `sort`
(whitelisted per resource), `order` (`asc` | `desc`), plus resource-specific filters.

**Status codes:** `200` OK · `201` Created · `204` No Content · `400` validation · `401`
unauthenticated · `403` forbidden · `404` not found · `409` conflict · `422` business rule
violation · `429` rate limited · `500` unexpected.

**Roles:** `A` = Admin, `L` = Lecturer, `S` = Student.

---

## Authentication

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| POST | `/auth/login` | public | Authenticate; sets `sms_at` / `sms_rt` cookies. Rate limited (10/min/IP). |
| POST | `/auth/logout` | any | Clears session cookies and records the event. |
| POST | `/auth/refresh` | refresh cookie | Rotates the access token. |
| GET | `/auth/me` | any | Current user (no sensitive fields). |

## Health

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/health` | public | Liveness + database check. |

## Students & staff

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/students` | A, L | List (filters: `departmentId`, `facultyId`, `level`, `status`) |
| POST | `/students` | A | Create student + user account |
| GET | `/students/:id` | A, L | Detail incl. enrolments and fees |
| PATCH | `/students/:id` | A | Update |
| DELETE | `/students/:id` | A | Delete (cascades) |
| GET/POST | `/staff` | A, L / A | List / create staff |
| GET/PATCH/DELETE | `/staff/:id` | A, L / A / A | Detail / update / delete |

## Academic structure

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET/POST | `/faculties` | A, L / A | List / create |
| GET/PATCH/DELETE | `/faculties/:id` | A, L / A / A | Detail / update / delete |
| GET/POST | `/departments` | A, L / A | List (`facultyId`) / create |
| GET/PATCH/DELETE | `/departments/:id` | A, L / A / A | Detail / update / delete |
| GET/POST | `/programs` | A, L / A | List (`departmentId`) / create |
| GET/PATCH/DELETE | `/programs/:id` | A, L / A / A | Detail / update / delete |

## Courses & assignments

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/courses` | A, L | List (lecturers are scoped to their own courses) |
| POST | `/courses` | A | Create (optionally assign a lecturer) |
| GET | `/courses/:id` | A, L | Detail (lecturers restricted to owned courses) |
| PATCH/DELETE | `/courses/:id` | A | Update / delete |
| GET | `/courses/:id/gradebook` | A, L | Computed gradebook |
| GET | `/courses/:id/attendance` | A, L | Attendance matrix + tallies |
| POST | `/course-assignments` | A | Assign lecturer to a course for a session |
| DELETE | `/course-assignments/:id` | A | Remove assignment |

## Sessions & semesters

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET/POST | `/sessions` | A, L / A | List / create (single current enforced) |
| GET/PATCH/DELETE | `/sessions/:id` | A, L / A / A | Detail / update / delete |
| GET/POST | `/semesters` | A, L / A | List (`sessionId`) / create |
| GET/PATCH/DELETE | `/semesters/:id` | A, L / A / A | Detail / update / delete |

## Enrolments

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/enrollments` | A, L | List (lecturers scoped to own courses) |
| POST | `/enrollments` | A | Enrol one student (duplicate → `409`) |
| POST | `/enrollments/bulk` | A | Enrol one student into many courses |
| GET | `/enrollments/:id` | A, L | Detail |
| PATCH | `/enrollments/:id` | A | Change status |
| DELETE | `/enrollments/:id` | A | Remove enrolment |

## Assessments, scores & grading

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/assessments` | A, L | List (lecturers scoped to owned courses) |
| POST | `/assessments` | A, L | Create (course weight capped at 100%) |
| GET/PATCH/DELETE | `/assessments/:id` | A, L | Detail / update / delete |
| GET | `/assessments/:id/scores` | A, L | Roster + entered scores |
| PATCH | `/assessments/:id/publish` | A, L | Publish / unpublish results |
| POST | `/scores` | A, L | Upsert one score (records grade history) |
| POST | `/scores/bulk` | A, L | Save a whole score grid |
| DELETE | `/scores/:id` | A, L | Delete a score |
| GET/PUT | `/grading-rules` | A, L / A | List sets / replace a set's bands |
| DELETE | `/grading-rules/:setName` | A | Delete a non-default set |

## Attendance

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/attendance` | A, L | List (`courseId`, `date`) |
| PUT | `/attendance` | A, L | Bulk, idempotent marking for a course + date |

## Fees & payments

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET/POST | `/fees` | A | List / create (unique per student + session) |
| GET/PATCH/DELETE | `/fees/:id` | A | Detail (with payments) / update / delete |
| POST | `/payments` | A | Record a payment (no overpayment, unique reference) |
| DELETE | `/payments/:id` | A | Reverse a payment |

## Announcements

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/announcements` | A, L, S | List, filtered by the caller's audience scope |
| POST | `/announcements` | A, L | Create |
| GET | `/announcements/:id` | A, L, S | Detail |
| PATCH/DELETE | `/announcements/:id` | A, L | Update / delete (authors own posts; admins any) |

## Users, audit & dashboards

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET/POST | `/users` | A | List / create account |
| GET/PATCH/DELETE | `/users/:id` | A | Detail / update role & status / delete |
| GET | `/audit-logs` | A | Paginated audit trail |
| GET | `/dashboard/admin` | A | Admin metrics |
| GET | `/dashboard/lecturer` | L | Lecturer metrics |
| GET | `/dashboard/student` | S | Student metrics |

## Student self-service (session-scoped, IDOR-safe)

| Method | Path | Roles | Description |
| --- | --- | --- | --- |
| GET | `/me/profile` | S | Own profile with enrolments and fees |
| GET | `/me/courses` | S | Registered courses (`sessionId`) |
| GET | `/me/results` | S | Computed results and GPA per term |
| GET | `/me/attendance` | S | Attendance tallies |
| GET | `/me/fees` | S | Fee statements and payments |
| GET | `/me/timetable` | S | Weekly timetable |

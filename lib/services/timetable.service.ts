import { prisma } from "@/lib/db";

const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export interface TimetableEntry {
  enrollmentId: string;
  course: { id: string; code: string; title: string; creditUnits: number };
  lecturer: string | null;
  venue: string | null;
  days: string[];
  startTime: string | null;
  endTime: string | null;
  term: { session: string; semester: string } | null;
}

/**
 * Build a student's weekly timetable from enrolled courses' schedule fields.
 *
 * Note: the institution defines schedule metadata on the course (days, time,
 * venue). Courses without schedule metadata still appear, grouped under
 * "Unscheduled", rather than being silently dropped.
 */
export async function getStudentTimetable(studentId: string): Promise<TimetableEntry[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, status: "ACTIVE" },
    select: {
      id: true,
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          creditUnits: true,
          venue: true,
          scheduleDays: true,
          startTime: true,
          endTime: true,
          assignments: {
            select: { staff: { select: { firstName: true, lastName: true } } },
          },
        },
      },
      session: { select: { name: true } },
      semester: { select: { name: true } },
    },
  });

  const entries: TimetableEntry[] = enrollments.map((enrollment) => {
    const course = enrollment.course;
    const lecturer = course.assignments[0]?.staff
      ? `${course.assignments[0].staff.firstName} ${course.assignments[0].staff.lastName}`
      : null;
    const days = (course.scheduleDays ?? "")
      .split(",")
      .map((d) => d.trim().toUpperCase())
      .filter((d) => (DAY_ORDER as readonly string[]).includes(d));

    return {
      enrollmentId: enrollment.id,
      course: {
        id: course.id,
        code: course.code,
        title: course.title,
        creditUnits: course.creditUnits,
      },
      lecturer,
      venue: course.venue,
      days: days.length > 0 ? days : [],
      startTime: course.startTime,
      endTime: course.endTime,
      term: { session: enrollment.session.name, semester: enrollment.semester.name },
    };
  });

  // Deterministic ordering: scheduled entries by day, then time, then code.
  return entries.sort((a, b) => {
    const dayA = a.days[0] ? DAY_ORDER.indexOf(a.days[0] as (typeof DAY_ORDER)[number]) : 99;
    const dayB = b.days[0] ? DAY_ORDER.indexOf(b.days[0] as (typeof DAY_ORDER)[number]) : 99;
    if (dayA !== dayB) return dayA - dayB;
    return (a.startTime ?? "zz").localeCompare(b.startTime ?? "zz") || a.course.code.localeCompare(b.course.code);
  });
}

export { DAY_ORDER };

import type { UserRole } from "@/lib/domain/enums";

export interface NavItem {
  href: string;
  label: string;
  /** Icon name resolved by components/ui/icon.tsx. */
  icon: string;
}

export const NAV: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/students", label: "Students", icon: "students" },
    { href: "/admin/staff", label: "Staff", icon: "staff" },
    { href: "/admin/faculties", label: "Faculties", icon: "building" },
    { href: "/admin/departments", label: "Departments", icon: "building" },
    { href: "/admin/programs", label: "Programmes", icon: "book" },
    { href: "/admin/courses", label: "Courses", icon: "book" },
    { href: "/admin/sessions", label: "Sessions", icon: "calendar" },
    { href: "/admin/semesters", label: "Semesters", icon: "calendar" },
    { href: "/admin/enrollments", label: "Enrolments", icon: "clipboard" },
    { href: "/admin/assessments", label: "Assessments", icon: "clipboard" },
    { href: "/admin/attendance", label: "Attendance", icon: "check" },
    { href: "/admin/fees", label: "Fees", icon: "money" },
    { href: "/admin/announcements", label: "Announcements", icon: "megaphone" },
    { href: "/admin/grading-rules", label: "Grading rules", icon: "settings" },
    { href: "/admin/users", label: "Users & roles", icon: "shield" },
    { href: "/admin/audit-logs", label: "Audit log", icon: "history" },
  ],
  LECTURER: [
    { href: "/lecturer", label: "Dashboard", icon: "dashboard" },
    { href: "/lecturer/courses", label: "My courses", icon: "book" },
    { href: "/lecturer/assessments", label: "Assessments", icon: "clipboard" },
    { href: "/lecturer/attendance", label: "Attendance", icon: "check" },
    { href: "/lecturer/announcements", label: "Announcements", icon: "megaphone" },
  ],
  STUDENT: [
    { href: "/student", label: "Dashboard", icon: "dashboard" },
    { href: "/student/courses", label: "My courses", icon: "book" },
    { href: "/student/timetable", label: "Timetable", icon: "calendar" },
    { href: "/student/grades", label: "Results", icon: "clipboard" },
    { href: "/student/attendance", label: "Attendance", icon: "check" },
    { href: "/student/fees", label: "Fees", icon: "money" },
    { href: "/student/announcements", label: "Announcements", icon: "megaphone" },
    { href: "/student/profile", label: "My profile", icon: "staff" },
  ],
};

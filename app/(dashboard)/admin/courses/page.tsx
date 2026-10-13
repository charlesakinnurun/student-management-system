"use client";

import Link from "next/link";
import { CrudPage } from "@/components/crud/crud-page";
import type { Column } from "@/components/data-table/data-table";
import { useOptions } from "@/lib/hooks/use-options";
import { createCourseSchema, updateCourseSchema } from "@/lib/validation/course";

interface CourseRow {
  id: string;
  code: string;
  title: string;
  level: string | null;
  creditUnits: number;
  department: { id: string; name: string };
  semester: { id: string; name: string } | null;
  assignments: Array<{ id: string; staff: { firstName: string; lastName: string } }>;
  _count: { enrollments: number; assessments: number };
}

const columns: Column<CourseRow>[] = [
  {
    key: "code",
    header: "Code",
    sortable: true,
    render: (row) => (
      <Link href={`/admin/courses/${row.id}`} className="font-medium text-primary hover:underline">
        {row.code}
      </Link>
    ),
  },
  { key: "title", header: "Title", sortable: true, render: (row) => row.title },
  { key: "department", header: "Department", render: (row) => row.department.name },
  { key: "level", header: "Level", render: (row) => row.level ?? "—" },
  { key: "creditUnits", header: "Credits", render: (row) => row.creditUnits },
  {
    key: "lecturer",
    header: "Lecturer",
    render: (row) =>
      row.assignments.length > 0
        ? row.assignments.map((a) => `${a.staff.firstName} ${a.staff.lastName}`).join(", ")
        : "—",
  },
  { key: "enrollments", header: "Students", render: (row) => row._count.enrollments },
];

export default function CoursesPage() {
  const departments = useOptions<{ id: string; name: string }>("/api/departments", (d) => ({
    label: d.name,
    value: d.id,
  }));
  const semesters = useOptions<{ id: string; name: string; session?: { name: string } }>(
    "/api/semesters",
    (s) => ({ label: `${s.name}${s.session ? ` · ${s.session.name}` : ""}`, value: s.id }),
  );

  return (
    <CrudPage<CourseRow>
      title="Courses"
      description="Courses offered by departments, with credit units and scheduling."
      entityName="course"
      endpoint="/api/courses"
      rowKey={(row) => row.id}
      columns={columns}
      schema={createCourseSchema}
      editSchema={updateCourseSchema}
      options={{ defaultSort: "code", defaultOrder: "asc" }}
      searchPlaceholder="Search by code or title…"
      fields={[
        { name: "code", label: "Course code", type: "text", required: true, placeholder: "CSC101" },
        { name: "title", label: "Title", type: "text", required: true },
        { name: "departmentId", label: "Department", type: "select", required: true, options: departments.options },
        { name: "creditUnits", label: "Credit units", type: "number", required: true },
        { name: "level", label: "Level", type: "text", placeholder: "e.g. 100" },
        { name: "semesterId", label: "Semester", type: "select", options: semesters.options },
        { name: "venue", label: "Venue", type: "text", placeholder: "e.g. LT-1" },
        { name: "scheduleDays", label: "Days", type: "text", placeholder: "MON,WED" },
        { name: "startTime", label: "Start time", type: "text", placeholder: "09:00" },
        { name: "endTime", label: "End time", type: "text", placeholder: "11:00" },
        { name: "description", label: "Description", type: "textarea", fullWidth: true },
      ]}
      toFormValues={(row) => ({
        code: row.code,
        title: row.title,
        departmentId: row.department.id,
        creditUnits: String(row.creditUnits),
        level: row.level ?? "",
        semesterId: row.semester?.id ?? "",
      })}
    />
  );
}

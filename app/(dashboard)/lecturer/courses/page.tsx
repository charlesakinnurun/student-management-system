"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";

interface CourseRow {
  id: string;
  code: string;
  title: string;
  level: string | null;
  creditUnits: number;
  department: { name: string };
  _count: { enrollments: number; assessments: number };
}

const columns: Column<CourseRow>[] = [
  {
    key: "code",
    header: "Code",
    sortable: true,
    render: (row) => (
      <Link href={`/lecturer/courses/${row.id}`} className="font-medium text-primary hover:underline">
        {row.code}
      </Link>
    ),
  },
  { key: "title", header: "Title", sortable: true, render: (row) => row.title },
  { key: "level", header: "Level", render: (row) => row.level ?? "—" },
  { key: "creditUnits", header: "Credits", render: (row) => row.creditUnits },
  { key: "department", header: "Department", render: (row) => row.department.name },
  { key: "students", header: "Students", render: (row) => row._count.enrollments },
  { key: "assessments", header: "Assessments", render: (row) => row._count.assessments },
];

export default function LecturerCoursesPage() {
  return (
    <>
      <PageHeader title="My courses" description="Courses you are assigned to teach." />
      <DataTable<CourseRow>
        endpoint="/api/courses"
        rowKey={(row) => row.id}
        columns={columns}
        options={{ defaultSort: "code", defaultOrder: "asc" }}
        searchPlaceholder="Search my courses…"
        emptyTitle="No assigned courses"
        emptyDescription="Ask an administrator to assign you to a course."
      />
    </>
  );
}

"use client";

import { CrudPage } from "@/components/crud/crud-page";
import type { Column } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { useOptions } from "@/lib/hooks/use-options";
import { createSemesterSchema, updateSemesterSchema } from "@/lib/validation/session";
import { formatDate } from "@/lib/utils";

interface SemesterRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  session: { id: string; name: string };
  _count: { courses: number; enrollments: number };
}

const columns: Column<SemesterRow>[] = [
  { key: "name", header: "Semester", sortable: true, render: (row) => (
      <span className="flex items-center gap-2 font-medium">
        {row.name}
        {row.isCurrent ? <Badge tone="success">Current</Badge> : null}
      </span>
    ) },
  { key: "session", header: "Session", render: (row) => row.session.name },
  { key: "startDate", header: "Start", render: (row) => formatDate(row.startDate) },
  { key: "endDate", header: "End", render: (row) => formatDate(row.endDate) },
  { key: "courses", header: "Courses", render: (row) => row._count.courses },
  { key: "enrollments", header: "Enrolments", render: (row) => row._count.enrollments },
];

export default function SemestersPage() {
  const sessions = useOptions<{ id: string; name: string }>("/api/sessions", (s) => ({
    label: s.name,
    value: s.id,
  }));

  return (
    <CrudPage<SemesterRow>
      title="Semesters"
      description="Terms within an academic session."
      entityName="semester"
      endpoint="/api/semesters"
      rowKey={(row) => row.id}
      columns={columns}
      schema={createSemesterSchema}
      editSchema={updateSemesterSchema}
      options={{ defaultSort: "startDate", defaultOrder: "asc" }}
      searchPlaceholder="Search semesters…"
      fields={[
        { name: "name", label: "Name", type: "text", required: true, placeholder: "First Semester" },
        { name: "sessionId", label: "Session", type: "select", required: true, options: sessions.options },
        { name: "startDate", label: "Start date", type: "date", required: true },
        { name: "endDate", label: "End date", type: "date", required: true },
        { name: "isCurrent", label: "Current semester", type: "checkbox", placeholder: "Mark as the current semester" },
      ]}
      toFormValues={(row) => ({
        name: row.name,
        sessionId: row.session.id,
        startDate: String(row.startDate).slice(0, 10),
        endDate: String(row.endDate).slice(0, 10),
        isCurrent: row.isCurrent,
      })}
    />
  );
}

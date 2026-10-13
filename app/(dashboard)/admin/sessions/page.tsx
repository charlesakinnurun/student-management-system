"use client";

import { CrudPage } from "@/components/crud/crud-page";
import type { Column } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { createSessionSchema, updateSessionSchema } from "@/lib/validation/session";
import { formatDate } from "@/lib/utils";

interface SessionRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  _count: { semesters: number; enrollments: number };
}

const columns: Column<SessionRow>[] = [
  {
    key: "name",
    header: "Session",
    sortable: true,
    render: (row) => (
      <span className="flex items-center gap-2 font-medium">
        {row.name}
        {row.isCurrent ? <Badge tone="success">Current</Badge> : null}
      </span>
    ),
  },
  { key: "startDate", header: "Start", render: (row) => formatDate(row.startDate) },
  { key: "endDate", header: "End", render: (row) => formatDate(row.endDate) },
  { key: "semesters", header: "Semesters", render: (row) => row._count.semesters },
  { key: "enrollments", header: "Enrolments", render: (row) => row._count.enrollments },
];

export default function SessionsPage() {
  return (
    <CrudPage<SessionRow>
      title="Academic sessions"
      description="Sessions define the academic year (e.g. 2025/2026)."
      entityName="session"
      endpoint="/api/sessions"
      rowKey={(row) => row.id}
      columns={columns}
      schema={createSessionSchema}
      editSchema={updateSessionSchema}
      options={{ defaultSort: "name", defaultOrder: "desc" }}
      searchPlaceholder="Search sessions…"
      fields={[
        { name: "name", label: "Session name", type: "text", required: true, placeholder: "2025/2026" },
        { name: "startDate", label: "Start date", type: "date", required: true },
        { name: "endDate", label: "End date", type: "date", required: true },
        { name: "isCurrent", label: "Current session", type: "checkbox", placeholder: "Mark as the current session" },
      ]}
      toFormValues={(row) => ({
        name: row.name,
        startDate: String(row.startDate).slice(0, 10),
        endDate: String(row.endDate).slice(0, 10),
        isCurrent: row.isCurrent,
      })}
    />
  );
}

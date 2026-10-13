"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface AssessmentRow {
  id: string;
  type: string;
  title: string;
  maxScore: number;
  weight: number;
  dueDate: string | null;
  isPublished: boolean;
  course: { id: string; code: string; title: string };
  _count: { scores: number };
}

const columns: Column<AssessmentRow>[] = [
  {
    key: "title",
    header: "Title",
    sortable: true,
    render: (row) => (
      <Link href={`/lecturer/assessments/${row.id}`} className="font-medium text-primary hover:underline">
        {row.title}
      </Link>
    ),
  },
  { key: "course", header: "Course", render: (row) => `${row.course.code} — ${row.course.title}` },
  { key: "type", header: "Type", render: (row) => <Badge>{row.type}</Badge> },
  { key: "maxScore", header: "Max", render: (row) => row.maxScore },
  { key: "weight", header: "Weight", render: (row) => `${row.weight}%` },
  { key: "dueDate", header: "Due", render: (row) => formatDate(row.dueDate) },
  { key: "scores", header: "Scores", render: (row) => row._count.scores },
  {
    key: "isPublished",
    header: "Published",
    render: (row) => (
      <Badge tone={statusTone(row.isPublished ? "PUBLISHED" : "PENDING")}>
        {row.isPublished ? "Published" : "Draft"}
      </Badge>
    ),
  },
];

export default function LecturerAssessmentsPage() {
  return (
    <>
      <PageHeader
        title="Assessments"
        description="Assessments across the courses you teach. Open one to enter scores."
      />
      <DataTable<AssessmentRow>
        endpoint="/api/assessments"
        rowKey={(row) => row.id}
        columns={columns}
        options={{ defaultSort: "createdAt", defaultOrder: "asc" }}
        searchPlaceholder="Search assessments…"
        emptyTitle="No assessments"
        emptyDescription="Assessments are created by administrators for your courses."
      />
    </>
  );
}

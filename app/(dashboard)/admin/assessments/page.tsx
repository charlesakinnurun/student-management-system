"use client";

import Link from "next/link";
import { CrudPage } from "@/components/crud/crud-page";
import type { Column } from "@/components/data-table/data-table";
import { Badge, statusTone } from "@/components/ui/badge";
import { useOptions } from "@/lib/hooks/use-options";
import { createAssessmentSchema, updateAssessmentSchema } from "@/lib/validation/assessment";
import { ASSESSMENT_TYPES } from "@/lib/domain/enums";
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
      <Link href={`/admin/assessments/${row.id}`} className="font-medium text-primary hover:underline">
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
    render: (row) => <Badge tone={statusTone(row.isPublished ? "PUBLISHED" : "PENDING")}>{row.isPublished ? "Published" : "Draft"}</Badge>,
  },
];

export default function AssessmentsPage() {
  const courses = useOptions<{ id: string; code: string; title: string }>("/api/courses", (c) => ({
    label: `${c.code} — ${c.title}`,
    value: c.id,
  }));

  return (
    <CrudPage<AssessmentRow>
      title="Assessments"
      description="Assignments, tests, quizzes, midterms, exams and projects. Weights per course must total 100%."
      entityName="assessment"
      endpoint="/api/assessments"
      rowKey={(row) => row.id}
      columns={columns}
      schema={createAssessmentSchema}
      editSchema={updateAssessmentSchema}
      options={{ defaultSort: "createdAt", defaultOrder: "asc" }}
      searchPlaceholder="Search assessments…"
      extraActions={(row) => (
        <Link
          href={`/admin/assessments/${row.id}`}
          className="inline-flex h-8 items-center rounded-md border border-input px-3 text-xs font-medium hover:bg-muted"
        >
          Scores
        </Link>
      )}
      fields={(editing) => [
        ...(editing
          ? []
          : ([
              { name: "courseId", label: "Course", type: "select", required: true, options: courses.options },
            ] as const)),
        {
          name: "type",
          label: "Type",
          type: "select",
          required: true,
          options: ASSESSMENT_TYPES.map((t) => ({ label: t, value: t })),
        },
        { name: "title", label: "Title", type: "text", required: true },
        { name: "maxScore", label: "Maximum score", type: "number", required: true },
        { name: "weight", label: "Weight (%)", type: "number", required: true },
        { name: "dueDate", label: "Due date", type: "date" },
        { name: "isPublished", label: "Published", type: "checkbox", placeholder: "Visible to students" },
      ]}
      toFormValues={(row) => ({
        type: row.type,
        title: row.title,
        maxScore: String(row.maxScore),
        weight: String(row.weight),
        dueDate: row.dueDate ? String(row.dueDate).slice(0, 10) : "",
        isPublished: row.isPublished,
      })}
    />
  );
}

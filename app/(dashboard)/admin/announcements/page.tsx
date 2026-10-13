"use client";

import { CrudPage } from "@/components/crud/crud-page";
import type { Column } from "@/components/data-table/data-table";
import { Badge, statusTone } from "@/components/ui/badge";
import { useOptions } from "@/lib/hooks/use-options";
import { createAnnouncementSchema, updateAnnouncementSchema } from "@/lib/validation/announcement";
import { ANNOUNCEMENT_AUDIENCES } from "@/lib/domain/enums";
import { formatDate } from "@/lib/utils";

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  audience: string;
  courseId: string | null;
  departmentId: string | null;
  publishedAt: string;
  author: { email: string; role: string };
}

const columns: Column<AnnouncementRow>[] = [
  { key: "title", header: "Title", sortable: true, render: (row) => <span className="font-medium">{row.title}</span> },
  {
    key: "audience",
    header: "Audience",
    render: (row) => <Badge tone={statusTone(row.audience)}>{row.audience}</Badge>,
  },
  { key: "body", header: "Body", render: (row) => <span className="line-clamp-1 text-muted-foreground">{row.body}</span> },
  { key: "author", header: "Author", render: (row) => row.author.email },
  { key: "publishedAt", header: "Published", render: (row) => formatDate(row.publishedAt) },
];

export default function AnnouncementsPage() {
  const courses = useOptions<{ id: string; code: string; title: string }>("/api/courses", (c) => ({
    label: `${c.code} — ${c.title}`,
    value: c.id,
  }));
  const departments = useOptions<{ id: string; name: string }>("/api/departments", (d) => ({
    label: d.name,
    value: d.id,
  }));

  return (
    <CrudPage<AnnouncementRow>
      title="Announcements"
      description="Publish notices to the whole institution or a specific audience."
      entityName="announcement"
      endpoint="/api/announcements"
      rowKey={(row) => row.id}
      columns={columns}
      schema={createAnnouncementSchema}
      editSchema={updateAnnouncementSchema}
      options={{ defaultSort: "publishedAt" }}
      searchPlaceholder="Search announcements…"
      fields={[
        { name: "title", label: "Title", type: "text", required: true, fullWidth: true },
        {
          name: "audience",
          label: "Audience",
          type: "select",
          required: true,
          options: ANNOUNCEMENT_AUDIENCES.map((a) => ({ label: a, value: a })),
        },
        { name: "courseId", label: "Limit to course (optional)", type: "select", options: courses.options },
        { name: "departmentId", label: "Limit to department (optional)", type: "select", options: departments.options },
        { name: "body", label: "Body", type: "textarea", required: true, fullWidth: true },
      ]}
      toFormValues={(row) => ({
        title: row.title,
        body: row.body,
        audience: row.audience,
        courseId: row.courseId ?? "",
        departmentId: row.departmentId ?? "",
      })}
    />
  );
}

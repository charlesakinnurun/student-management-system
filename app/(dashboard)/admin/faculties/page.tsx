"use client";

import { CrudPage } from "@/components/crud/crud-page";
import type { Column } from "@/components/data-table/data-table";
import { createFacultySchema, updateFacultySchema } from "@/lib/validation/academic";

interface FacultyRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  _count: { departments: number; students: number };
}

const columns: Column<FacultyRow>[] = [
  { key: "code", header: "Code", sortable: true, render: (row) => <span className="font-mono text-xs">{row.code}</span> },
  { key: "name", header: "Name", sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
  { key: "description", header: "Description", render: (row) => row.description ?? "—" },
  { key: "departments", header: "Departments", render: (row) => row._count.departments },
  { key: "students", header: "Students", render: (row) => row._count.students },
];

export default function FacultiesPage() {
  return (
    <CrudPage<FacultyRow>
      title="Faculties"
      description="Faculties (or schools) group departments and programmes."
      entityName="faculty"
      endpoint="/api/faculties"
      rowKey={(row) => row.id}
      columns={columns}
      schema={createFacultySchema}
      editSchema={updateFacultySchema}
      options={{ defaultSort: "name", defaultOrder: "asc" }}
      searchPlaceholder="Search faculties…"
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "code", label: "Code", type: "text", required: true, placeholder: "e.g. SCI" },
        { name: "description", label: "Description", type: "textarea", fullWidth: true },
      ]}
      toFormValues={(row) => ({ name: row.name, code: row.code, description: row.description ?? "" })}
    />
  );
}

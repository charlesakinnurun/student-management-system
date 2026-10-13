"use client";

import { CrudPage } from "@/components/crud/crud-page";
import type { Column } from "@/components/data-table/data-table";
import { useOptions } from "@/lib/hooks/use-options";
import { createDepartmentSchema, updateDepartmentSchema } from "@/lib/validation/academic";

interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  faculty: { id: string; name: string; code: string };
  _count: { programs: number; courses: number; students: number };
}

const columns: Column<DepartmentRow>[] = [
  { key: "code", header: "Code", sortable: true, render: (row) => <span className="font-mono text-xs">{row.code}</span> },
  { key: "name", header: "Name", sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
  { key: "faculty", header: "Faculty", render: (row) => row.faculty.name },
  { key: "programs", header: "Programmes", render: (row) => row._count.programs },
  { key: "courses", header: "Courses", render: (row) => row._count.courses },
  { key: "students", header: "Students", render: (row) => row._count.students },
];

export default function DepartmentsPage() {
  const faculties = useOptions<{ id: string; name: string }>("/api/faculties", (f) => ({
    label: f.name,
    value: f.id,
  }));

  return (
    <CrudPage<DepartmentRow>
      title="Departments"
      description="Departments belong to a faculty and own programmes and courses."
      entityName="department"
      endpoint="/api/departments"
      rowKey={(row) => row.id}
      columns={columns}
      schema={createDepartmentSchema}
      editSchema={updateDepartmentSchema}
      options={{ defaultSort: "name", defaultOrder: "asc" }}
      searchPlaceholder="Search departments…"
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "code", label: "Code", type: "text", required: true, placeholder: "e.g. CSC" },
        {
          name: "facultyId",
          label: "Faculty",
          type: "select",
          required: true,
          options: faculties.options,
        },
      ]}
      toFormValues={(row) => ({ name: row.name, code: row.code, facultyId: row.faculty.id })}
    />
  );
}

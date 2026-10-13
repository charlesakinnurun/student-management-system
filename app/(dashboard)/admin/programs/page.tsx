"use client";

import { CrudPage } from "@/components/crud/crud-page";
import type { Column } from "@/components/data-table/data-table";
import { useOptions } from "@/lib/hooks/use-options";
import { createProgramSchema, updateProgramSchema } from "@/lib/validation/academic";

interface ProgramRow {
  id: string;
  name: string;
  code: string;
  level: string | null;
  department: { id: string; name: string };
  _count: { students: number };
}

const columns: Column<ProgramRow>[] = [
  { key: "code", header: "Code", sortable: true, render: (row) => <span className="font-mono text-xs">{row.code}</span> },
  { key: "name", header: "Name", sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
  { key: "department", header: "Department", render: (row) => row.department.name },
  { key: "level", header: "Levels", render: (row) => row.level ?? "—" },
  { key: "students", header: "Students", render: (row) => row._count.students },
];

export default function ProgramsPage() {
  const departments = useOptions<{ id: string; name: string }>("/api/departments", (d) => ({
    label: d.name,
    value: d.id,
  }));

  return (
    <CrudPage<ProgramRow>
      title="Programmes"
      description="Degree programmes offered by a department."
      entityName="programme"
      endpoint="/api/programs"
      rowKey={(row) => row.id}
      columns={columns}
      schema={createProgramSchema}
      editSchema={updateProgramSchema}
      options={{ defaultSort: "name", defaultOrder: "asc" }}
      searchPlaceholder="Search programmes…"
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "code", label: "Code", type: "text", required: true, placeholder: "e.g. BSC-CS" },
        { name: "departmentId", label: "Department", type: "select", required: true, options: departments.options },
        { name: "level", label: "Levels offered", type: "text", placeholder: "e.g. 100-400" },
      ]}
      toFormValues={(row) => ({
        name: row.name,
        code: row.code,
        departmentId: row.department.id,
        level: row.level ?? "",
      })}
    />
  );
}

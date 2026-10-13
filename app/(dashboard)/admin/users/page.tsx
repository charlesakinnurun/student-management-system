"use client";

import { CrudPage } from "@/components/crud/crud-page";
import type { Column } from "@/components/data-table/data-table";
import { Badge, statusTone } from "@/components/ui/badge";
import { createUserSchema, updateUserSchema } from "@/lib/validation/user";
import { USER_ROLES, USER_STATUSES } from "@/lib/domain/enums";
import { formatDate } from "@/lib/utils";

interface UserRow {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  studentProfile: { studentId: string } | null;
  staffProfile: { staffId: string } | null;
}

const columns: Column<UserRow>[] = [
  { key: "email", header: "Email", sortable: true, render: (row) => <span className="font-medium">{row.email}</span> },
  {
    key: "role",
    header: "Role",
    render: (row) => <Badge tone="primary">{row.role}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
  },
  {
    key: "linked",
    header: "Linked profile",
    render: (row) => row.studentProfile?.studentId ?? row.staffProfile?.staffId ?? "—",
  },
  { key: "createdAt", header: "Created", sortable: true, render: (row) => formatDate(row.createdAt) },
];

export default function UsersPage() {
  return (
    <CrudPage<UserRow>
      title="Users & roles"
      description="Manage login accounts, roles and account status. Changes take effect immediately."
      entityName="user"
      endpoint="/api/users"
      rowKey={(row) => row.id}
      columns={columns}
      schema={createUserSchema}
      editSchema={updateUserSchema}
      options={{ defaultSort: "createdAt" }}
      searchPlaceholder="Search by email…"
      // Create exposes a password; edit only exposes role/status.
      fields={(editing) =>
        editing
          ? [
              {
                name: "role",
                label: "Role",
                type: "select",
                required: true,
                options: USER_ROLES.map((r) => ({ label: r, value: r })),
              },
              {
                name: "status",
                label: "Status",
                type: "select",
                required: true,
                options: USER_STATUSES.map((s) => ({ label: s, value: s })),
              },
            ]
          : [
              { name: "email", label: "Email", type: "email", required: true },
              {
                name: "role",
                label: "Role",
                type: "select",
                required: true,
                options: USER_ROLES.map((r) => ({ label: r, value: r })),
              },
              { name: "password", label: "Password", type: "password", required: true },
            ]
      }
      toFormValues={(row) => ({ role: row.role, status: row.status })}
    />
  );
}

"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, statusTone } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResourceForm, type FieldConfig, type FormValues } from "@/components/forms/resource-form";
import { useToast } from "@/components/ui/toast";
import { useOptions } from "@/lib/hooks/use-options";
import { api } from "@/lib/api-client";
import { createStaffSchema, updateStaffSchema } from "@/lib/validation/staff";

interface StaffRow {
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  user: { email: string; role: string; status: string };
  department: { name: string } | null;
  _count: { assignments: number };
}

const ROLE_OPTIONS = [
  { label: "Lecturer", value: "LECTURER" },
  { label: "Admin", value: "ADMIN" },
];

export default function StaffPage() {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const departments = useOptions<{ id: string; name: string }>("/api/departments", (d) => ({
    label: d.name,
    value: d.id,
  }));

  const isEdit = Boolean(editing);

  const fields = useMemo<FieldConfig[]>(() => {
    const base: FieldConfig[] = [
      { name: "firstName", label: "First name", type: "text", required: true },
      { name: "lastName", label: "Last name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
    ];
    if (!isEdit) {
      base.push(
        { name: "staffId", label: "Staff ID", type: "text", hint: "Leave blank to auto-generate" },
        { name: "password", label: "Password", type: "password", hint: "Leave blank to auto-generate" },
      );
    }
    base.push(
      { name: "phone", label: "Phone", type: "tel" },
      { name: "departmentId", label: "Department", type: "select", options: departments.options },
      { name: "role", label: "Role", type: "select", options: ROLE_OPTIONS },
    );
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, departments.options]);

  async function handleSubmit(values: FormValues) {
    if (editing) {
      const { staffId, password, ...rest } = values as Record<string, string | boolean>;
      void staffId;
      void password;
      await api.patch(`/api/staff/${editing.id}`, rest);
      toast.success("Staff member updated");
    } else {
      await api.post("/api/staff", values);
      toast.success("Staff member created");
    }
    setModalOpen(false);
    setEditing(null);
    setRefreshKey((key) => key + 1);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/staff/${deleteTarget.id}`);
      toast.success("Staff member deleted");
      setDeleteTarget(null);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete staff member");
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<StaffRow>[] = [
    { key: "staffId", header: "Staff ID", sortable: true, render: (row) => <span className="font-mono text-xs">{row.staffId}</span> },
    { key: "lastName", header: "Name", sortable: true, render: (row) => `${row.firstName} ${row.lastName}` },
    { key: "email", header: "Email", render: (row) => <span className="text-muted-foreground">{row.user.email}</span> },
    { key: "department", header: "Department", render: (row) => row.department?.name ?? "—" },
    { key: "role", header: "Role", render: (row) => <Badge tone="primary">{row.user.role}</Badge> },
    { key: "assignments", header: "Courses", render: (row) => row._count.assignments },
    { key: "status", header: "Status", render: (row) => <Badge tone={statusTone(row.user.status)}>{row.user.status}</Badge> },
  ];

  return (
    <>
      <PageHeader
        title="Staff"
        description="Manage lecturers and administrators."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Add staff
          </Button>
        }
      />

      <DataTable<StaffRow>
        endpoint="/api/staff"
        rowKey={(row) => row.id}
        columns={columns}
        searchPlaceholder="Search by name, ID or email…"
        refreshKey={refreshKey}
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(row);
                setModalOpen(true);
              }}
            >
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)}>
              Delete
            </Button>
          </div>
        )}
        emptyTitle="No staff yet"
      />

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit staff member" : "Add staff member"}
        size="lg"
      >
        <ResourceForm
          fields={fields}
          schema={editing ? updateStaffSchema : createStaffSchema}
          initialValues={
            editing
              ? {
                  firstName: editing.firstName,
                  lastName: editing.lastName,
                  email: editing.user.email,
                  role: editing.user.role,
                }
              : undefined
          }
          submitLabel={editing ? "Save changes" : "Create staff"}
          onSubmit={handleSubmit}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete staff member"
        message={
          deleteTarget
            ? `This permanently deletes ${deleteTarget.firstName} ${deleteTarget.lastName}, their login, and their course assignments. This cannot be undone.`
            : ""
        }
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

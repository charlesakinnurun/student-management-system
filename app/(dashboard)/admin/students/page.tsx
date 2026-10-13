"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, statusTone } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResourceForm, type FieldConfig, type FormValues } from "@/components/forms/resource-form";
import { useToast } from "@/components/ui/toast";
import { useOptions } from "@/lib/hooks/use-options";
import { api, buildQuery } from "@/lib/api-client";
import { createStudentSchema, updateStudentSchema } from "@/lib/validation/student";
import { formatDate } from "@/lib/utils";
import { ENROLLMENT_STATUSES, GENDERS } from "@/lib/domain/enums";

interface StudentRow {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  level: string | null;
  status: string;
  user: { email: string };
  department: { name: string } | null;
}

interface RefRow {
  id: string;
  name: string;
  code: string;
}

const GENDER_OPTIONS = GENDERS.map((g) => ({ label: g.charAt(0) + g.slice(1).toLowerCase(), value: g }));
const STATUS_OPTIONS = ENROLLMENT_STATUSES.map((s) => ({
  label: s.charAt(0) + s.slice(1).toLowerCase(),
  value: s,
}));

export default function StudentsPage() {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const faculties = useOptions<RefRow>("/api/faculties", (f) => ({ label: f.name, value: f.id }));
  const departments = useOptions<RefRow>("/api/departments", (d) => ({ label: d.name, value: d.id }));
  const programs = useOptions<RefRow>("/api/programs", (p) => ({ label: p.name, value: p.id }));
  const sessions = useOptions<RefRow>("/api/sessions", (s) => ({ label: s.name, value: s.id }));

  const isEdit = Boolean(editing);

  const fields = useMemo<FieldConfig[]>(() => {
    const base: FieldConfig[] = [
      { name: "firstName", label: "First name", type: "text", required: true },
      { name: "lastName", label: "Last name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
    ];
    if (!isEdit) {
      base.push(
        { name: "studentId", label: "Student ID", type: "text", hint: "Leave blank to auto-generate" },
        { name: "password", label: "Password", type: "password", hint: "Leave blank to auto-generate a temporary password" },
      );
    }
    base.push(
      { name: "phone", label: "Phone", type: "tel" },
      { name: "dateOfBirth", label: "Date of birth", type: "date" },
      { name: "gender", label: "Gender", type: "select", options: GENDER_OPTIONS },
      { name: "level", label: "Level", type: "text", placeholder: "e.g. 100" },
      { name: "facultyId", label: "Faculty", type: "select", options: faculties.options },
      { name: "departmentId", label: "Department", type: "select", options: departments.options },
      { name: "programId", label: "Programme", type: "select", options: programs.options },
      { name: "sessionId", label: "Session", type: "select", options: sessions.options },
      { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { name: "admissionDate", label: "Admission date", type: "date" },
      { name: "emergencyContact", label: "Emergency contact", type: "tel" },
      { name: "address", label: "Address", type: "textarea", fullWidth: true },
    );
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, faculties.options, departments.options, programs.options, sessions.options]);

  const initialValues = useMemo<FormValues | undefined>(() => {
    if (!editing) return undefined;
    return {
      firstName: editing.firstName,
      lastName: editing.lastName,
      email: editing.user.email,
      level: editing.level ?? "",
      status: editing.status,
    };
  }, [editing]);

  async function handleSubmit(values: FormValues) {
    if (editing) {
      // Student ID is immutable; strip it before sending.
      const { studentId, password, ...rest } = values as Record<string, string | boolean>;
      void studentId;
      void password;
      await api.patch(`/api/students/${editing.id}`, rest);
      toast.success("Student updated");
    } else {
      await api.post("/api/students", values);
      toast.success("Student created");
    }
    setModalOpen(false);
    setEditing(null);
    setRefreshKey((key) => key + 1);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/students/${deleteTarget.id}`);
      toast.success("Student deleted");
      setDeleteTarget(null);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete student");
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<StudentRow>[] = [
    {
      key: "studentId",
      header: "Student ID",
      sortable: true,
      render: (row) => <span className="font-mono text-xs">{row.studentId}</span>,
    },
    {
      key: "lastName",
      header: "Name",
      sortable: true,
      render: (row) => (
        <Link href={`/admin/students/${row.id}`} className="font-medium hover:underline">
          {row.firstName} {row.lastName}
        </Link>
      ),
    },
    { key: "email", header: "Email", render: (row) => <span className="text-muted-foreground">{row.user.email}</span> },
    { key: "department", header: "Department", render: (row) => row.department?.name ?? "—" },
    { key: "level", header: "Level", render: (row) => row.level ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Students"
        description="Create, search, filter and manage student records."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Add student
          </Button>
        }
      />

      <DataTable<StudentRow>
        endpoint="/api/students"
        rowKey={(row) => row.id}
        columns={columns}
        searchPlaceholder="Search by name, ID or email…"
        options={{ defaultSort: "createdAt" }}
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
        emptyTitle="No students yet"
        emptyDescription="Add your first student to get started."
      />

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit student" : "Add student"}
        description={editing ? editing.studentId : "A user account and student profile will be created."}
        size="lg"
      >
        <ResourceForm
          fields={fields}
          schema={editing ? updateStudentSchema : createStudentSchema}
          initialValues={initialValues}
          submitLabel={editing ? "Save changes" : "Create student"}
          onSubmit={handleSubmit}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete student"
        message={
          deleteTarget
            ? `This permanently deletes ${deleteTarget.firstName} ${deleteTarget.lastName} and all their enrolments, scores, attendance and fee records. This cannot be undone.`
            : ""
        }
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

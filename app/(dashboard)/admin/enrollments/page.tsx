"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, statusTone } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { ResourceForm, type FormValues } from "@/components/forms/resource-form";
import { useToast } from "@/components/ui/toast";
import { useOptions } from "@/lib/hooks/use-options";
import { api } from "@/lib/api-client";
import { createEnrollmentSchema } from "@/lib/validation/enrollment";
import { ENROLLMENT_STATUSES } from "@/lib/domain/enums";
import { formatDate } from "@/lib/utils";

interface EnrollmentRow {
  id: string;
  status: string;
  enrolledAt: string;
  student: { id: string; studentId: string; firstName: string; lastName: string };
  course: { id: string; code: string; title: string };
  session: { name: string };
  semester: { name: string };
}

export default function EnrollmentsPage() {
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EnrollmentRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Bulk form state.
  const [bulkStudent, setBulkStudent] = useState("");
  const [bulkSession, setBulkSession] = useState("");
  const [bulkSemester, setBulkSemester] = useState("");
  const [bulkCourseIds, setBulkCourseIds] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const students = useOptions<{ id: string; studentId: string; firstName: string; lastName: string }>(
    "/api/students",
    (s) => ({ label: `${s.studentId} — ${s.firstName} ${s.lastName}`, value: s.id }),
  );
  const courses = useOptions<{ id: string; code: string; title: string }>("/api/courses", (c) => ({
    label: `${c.code} — ${c.title}`,
    value: c.id,
  }));
  const sessions = useOptions<{ id: string; name: string }>("/api/sessions", (s) => ({
    label: s.name,
    value: s.id,
  }));
  const semesters = useOptions<{ id: string; name: string }>("/api/semesters", (s) => ({
    label: s.name,
    value: s.id,
  }));

  async function handleCreate(values: FormValues) {
    await api.post("/api/enrollments", values);
    toast.success("Student enrolled");
    setCreateOpen(false);
    setRefreshKey((key) => key + 1);
  }

  async function handleBulk() {
    if (!bulkStudent || !bulkSession || !bulkSemester || bulkCourseIds.length === 0) {
      toast.error("Select a student, session, semester and at least one course.");
      return;
    }
    setBulkSaving(true);
    try {
      const result = await api.post<{ created: number; skipped: Array<{ reason: string }> }>(
        "/api/enrollments/bulk",
        {
          studentId: bulkStudent,
          sessionId: bulkSession,
          semesterId: bulkSemester,
          courseIds: bulkCourseIds,
        },
      );
      toast.success(`${result.created} enrolment(s) created${result.skipped.length ? `, ${result.skipped.length} skipped` : ""}`);
      setBulkOpen(false);
      setBulkCourseIds([]);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk enrolment failed");
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/enrollments/${deleteTarget.id}`);
      toast.success("Enrolment removed");
      setDeleteTarget(null);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove enrolment");
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<EnrollmentRow>[] = [
    {
      key: "student",
      header: "Student",
      render: (row) => (
        <>
          <span className="font-medium">
            {row.student.firstName} {row.student.lastName}
          </span>
          <p className="font-mono text-[11px] text-muted-foreground">{row.student.studentId}</p>
        </>
      ),
    },
    { key: "course", header: "Course", render: (row) => `${row.course.code} — ${row.course.title}` },
    { key: "session", header: "Session", render: (row) => row.session.name },
    { key: "semester", header: "Semester", render: (row) => row.semester.name },
    { key: "status", header: "Status", render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "enrolledAt", header: "Enrolled", sortable: true, render: (row) => formatDate(row.enrolledAt) },
  ];

  return (
    <>
      <PageHeader
        title="Enrolments"
        description="Enrol students into courses. Duplicate enrolments are prevented."
        actions={
          <>
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              Bulk enrol
            </Button>
            <Button onClick={() => setCreateOpen(true)}>Enrol student</Button>
          </>
        }
      />

      <DataTable<EnrollmentRow>
        endpoint="/api/enrollments"
        rowKey={(row) => row.id}
        columns={columns}
        options={{ defaultSort: "enrolledAt" }}
        refreshKey={refreshKey}
        searchPlaceholder="Search by student or course…"
        rowActions={(row) => (
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)}>
            Remove
          </Button>
        )}
        emptyTitle="No enrolments yet"
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Enrol student" size="lg">
        <ResourceForm
          fields={[
            { name: "studentId", label: "Student", type: "select", required: true, options: students.options },
            { name: "courseId", label: "Course", type: "select", required: true, options: courses.options },
            { name: "sessionId", label: "Session", type: "select", required: true, options: sessions.options },
            { name: "semesterId", label: "Semester", type: "select", required: true, options: semesters.options },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: ENROLLMENT_STATUSES.map((s) => ({ label: s, value: s })),
            },
          ]}
          schema={createEnrollmentSchema}
          submitLabel="Enrol student"
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk enrolment"
        description="Enrol one student into multiple courses for a session and semester."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkSaving}>
              Cancel
            </Button>
            <Button onClick={handleBulk} loading={bulkSaving}>
              Enrol selected courses
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label="Student" htmlFor="bulk-student" required>
            <Select id="bulk-student" value={bulkStudent} onChange={(e) => setBulkStudent(e.target.value)}>
              <option value="">Select…</option>
              {students.options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Session" htmlFor="bulk-session" required>
              <Select id="bulk-session" value={bulkSession} onChange={(e) => setBulkSession(e.target.value)}>
                <option value="">Select…</option>
                {sessions.options.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Semester" htmlFor="bulk-semester" required>
              <Select id="bulk-semester" value={bulkSemester} onChange={(e) => setBulkSemester(e.target.value)}>
                <option value="">Select…</option>
                {semesters.options.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <fieldset>
            <legend className="mb-2 text-xs font-medium">Courses</legend>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
              {courses.options.map((option) => (
                <label key={option.value} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={bulkCourseIds.includes(option.value)}
                    onChange={(event) =>
                      setBulkCourseIds((current) =>
                        event.target.checked
                          ? [...current, option.value]
                          : current.filter((id) => id !== option.value),
                      )
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove enrolment"
        message={
          deleteTarget
            ? `This removes ${deleteTarget.student.firstName} ${deleteTarget.student.lastName} from ${deleteTarget.course.code}, including their scores and attendance for that course.`
            : ""
        }
        confirmLabel="Remove"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

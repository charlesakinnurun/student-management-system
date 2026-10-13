"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, statusTone } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResourceForm, type FormValues } from "@/components/forms/resource-form";
import { useToast } from "@/components/ui/toast";
import { useOptions } from "@/lib/hooks/use-options";
import { api } from "@/lib/api-client";
import { createFeeSchema, createPaymentSchema } from "@/lib/validation/fee";
import { formatCurrency, formatDate } from "@/lib/utils";

interface FeeRow {
  id: string;
  amountDue: number;
  amountPaid: number;
  status: string;
  dueDate: string | null;
  student: { id: string; studentId: string; firstName: string; lastName: string };
  session: { name: string };
  _count: { payments: number };
}

export default function FeesPage() {
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<FeeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const students = useOptions<{ id: string; studentId: string; firstName: string; lastName: string }>(
    "/api/students",
    (s) => ({ label: `${s.studentId} — ${s.firstName} ${s.lastName}`, value: s.id }),
  );
  const sessions = useOptions<{ id: string; name: string }>("/api/sessions", (s) => ({
    label: s.name,
    value: s.id,
  }));

  async function handleCreate(values: FormValues) {
    await api.post("/api/fees", values);
    toast.success("Fee record created");
    setCreateOpen(false);
    setRefreshKey((key) => key + 1);
  }

  async function handlePayment(values: FormValues) {
    if (!payTarget) return;
    await api.post("/api/payments", { ...values, feeId: payTarget.id });
    toast.success("Payment recorded");
    setPayTarget(null);
    setRefreshKey((key) => key + 1);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/fees/${deleteTarget.id}`);
      toast.success("Fee record deleted");
      setDeleteTarget(null);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete fee record");
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<FeeRow>[] = [
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
    { key: "session", header: "Session", render: (row) => row.session.name },
    { key: "amountDue", header: "Due", sortable: true, render: (row) => formatCurrency(row.amountDue) },
    { key: "amountPaid", header: "Paid", render: (row) => formatCurrency(row.amountPaid) },
    {
      key: "outstanding",
      header: "Outstanding",
      render: (row) => formatCurrency(row.amountDue - row.amountPaid),
    },
    { key: "status", header: "Status", sortable: true, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "dueDate", header: "Due date", render: (row) => formatDate(row.dueDate) },
  ];

  return (
    <>
      <PageHeader
        title="Fees"
        description="Manage tuition and other charges, and record payments."
        actions={<Button onClick={() => setCreateOpen(true)}>Add fee record</Button>}
      />

      <DataTable<FeeRow>
        endpoint="/api/fees"
        rowKey={(row) => row.id}
        columns={columns}
        options={{ defaultSort: "createdAt" }}
        refreshKey={refreshKey}
        searchPlaceholder="Search by student…"
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setPayTarget(row)}>
              Record payment
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)}>
              Delete
            </Button>
          </div>
        )}
        emptyTitle="No fee records yet"
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add fee record" size="lg">
        <ResourceForm
          fields={[
            { name: "studentId", label: "Student", type: "select", required: true, options: students.options },
            { name: "sessionId", label: "Session", type: "select", required: true, options: sessions.options },
            { name: "amountDue", label: "Amount due", type: "number", required: true },
            { name: "dueDate", label: "Due date", type: "date" },
          ]}
          schema={createFeeSchema}
          submitLabel="Create fee record"
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title="Record payment"
        description={
          payTarget
            ? `Outstanding balance: ${formatCurrency(payTarget.amountDue - payTarget.amountPaid)}`
            : undefined
        }
      >
        <ResourceForm
          fields={[
            { name: "amount", label: "Amount", type: "number", required: true },
            { name: "method", label: "Method", type: "text", placeholder: "e.g. BANK_TRANSFER" },
            { name: "reference", label: "Reference", type: "text", hint: "Must be unique if provided", fullWidth: true },
          ]}
          schema={createPaymentSchema}
          submitLabel="Record payment"
          onSubmit={handlePayment}
          onCancel={() => setPayTarget(null)}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete fee record"
        message={
          deleteTarget
            ? `This deletes the fee record and its ${deleteTarget._count.payments} recorded payment(s). This cannot be undone.`
            : ""
        }
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

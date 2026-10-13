"use client";

import { CrudPage } from "@/components/crud/crud-page";
import type { Column } from "@/components/data-table/data-table";
import { Badge, statusTone } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

interface AuditRow {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; email: string; role: string } | null;
}

const columns: Column<AuditRow>[] = [
  { key: "createdAt", header: "When", sortable: true, render: (row) => formatDateTime(row.createdAt) },
  {
    key: "action",
    header: "Action",
    sortable: true,
    render: (row) => <Badge tone={row.action.includes("delete") ? "destructive" : "primary"}>{row.action}</Badge>,
  },
  { key: "resource", header: "Resource", sortable: true, render: (row) => row.resource },
  { key: "resourceId", header: "Resource ID", render: (row) => <span className="font-mono text-[11px]">{row.resourceId ?? "—"}</span> },
  {
    key: "actor",
    header: "Actor",
    render: (row) => row.actor?.email ?? <span className="text-muted-foreground">system</span>,
  },
  {
    key: "metadata",
    header: "Details",
    render: (row) =>
      row.metadata ? (
        <code className="line-clamp-1 text-[11px] text-muted-foreground">{JSON.stringify(row.metadata)}</code>
      ) : (
        "—"
      ),
  },
];

export default function AuditLogsPage() {
  return (
    <CrudPage<AuditRow>
      title="Audit log"
      description="Append-only record of administrative actions and authentication events."
      entityName="audit entry"
      endpoint="/api/audit-logs"
      rowKey={(row) => row.id}
      columns={columns}
      readOnly
      fields={[]}
      options={{ defaultSort: "createdAt" }}
      searchPlaceholder="Search by action, resource or ID…"
    />
  );
}

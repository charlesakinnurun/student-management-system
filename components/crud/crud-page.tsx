"use client";

import { useMemo, useState } from "react";
import type { ZodType } from "zod";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResourceForm, type FieldConfig, type FormValues } from "@/components/forms/resource-form";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import type { UseResourceListOptions } from "@/lib/hooks/use-resource-list";

export interface CrudPageProps<T> {
  title: string;
  description?: string;
  /** Singular noun used in messages, e.g. "faculty". */
  entityName: string;
  endpoint: string;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Fields may depend on create/edit mode. */
  fields: FieldConfig[] | ((editing: T | null) => FieldConfig[]);
  schema?: ZodType;
  editSchema?: ZodType;
  toFormValues?: (row: T) => FormValues;
  /** Map form values to the request payload (defaults to the values as-is). */
  toPayload?: (values: FormValues, editing: T | null) => Record<string, unknown>;
  /** Additional per-row actions rendered before Edit/Delete. */
  extraActions?: (row: T) => React.ReactNode;
  deletePath?: (row: T) => string;
  deleteMessage?: (row: T) => string;
  options?: UseResourceListOptions;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Hide the create button for read-only modules. */
  readOnly?: boolean;
  headerActions?: React.ReactNode;
}

/**
 * Generic create/read/update/delete page: reusable data table plus a modal
 * form and a destructive-action confirmation. Every simple CRUD module is built
 * from this component so behaviour (validation, errors, refresh) stays uniform.
 */
export function CrudPage<T>({
  title,
  description,
  entityName,
  endpoint,
  columns,
  rowKey,
  fields,
  schema,
  editSchema,
  toFormValues,
  toPayload,
  extraActions,
  deletePath,
  deleteMessage,
  options,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  readOnly = false,
  headerActions,
}: CrudPageProps<T>) {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const resolvedFields = useMemo(
    () => (typeof fields === "function" ? fields(editing) : fields),
    [fields, editing],
  );

  async function handleSubmit(values: FormValues) {
    const payload = toPayload ? toPayload(values, editing) : (values as Record<string, unknown>);
    if (editing) {
      await api.patch(`${endpoint}/${rowKey(editing)}`, payload);
      toast.success(`${capitalize(entityName)} updated`);
    } else {
      await api.post(endpoint, payload);
      toast.success(`${capitalize(entityName)} created`);
    }
    closeModal();
    setRefreshKey((key) => key + 1);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(deletePath ? deletePath(deleteTarget) : `${endpoint}/${rowKey(deleteTarget)}`);
      toast.success(`${capitalize(entityName)} deleted`);
      setDeleteTarget(null);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to delete ${entityName}`);
    } finally {
      setDeleting(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {headerActions}
            {!readOnly ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
              >
                Add {entityName}
              </Button>
            ) : null}
          </>
        }
      />

      <DataTable<T>
        endpoint={endpoint}
        rowKey={rowKey}
        columns={columns}
        options={options}
        searchPlaceholder={searchPlaceholder}
        refreshKey={refreshKey}
        emptyTitle={emptyTitle ?? `No ${entityName}s yet`}
        emptyDescription={emptyDescription}
        rowActions={
          readOnly
            ? undefined
            : (row) => (
                <div className="flex justify-end gap-1">
                  {extraActions?.(row)}
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
              )
        }
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? `Edit ${entityName}` : `Add ${entityName}`}
        size="lg"
      >
        <ResourceForm
          fields={resolvedFields}
          schema={editing && editSchema ? editSchema : schema}
          initialValues={editing && toFormValues ? toFormValues(editing) : undefined}
          submitLabel={editing ? "Save changes" : `Create ${entityName}`}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${entityName}`}
        message={
          deleteTarget
            ? deleteMessage?.(deleteTarget) ??
              `This permanently deletes this ${entityName}. This cannot be undone.`
            : ""
        }
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

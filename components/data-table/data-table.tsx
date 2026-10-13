"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { useResourceList, type UseResourceListOptions } from "@/lib/hooks/use-resource-list";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  endpoint: string;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  options?: UseResourceListOptions;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  rowActions?: (row: T) => ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /** Bump to force a refetch after a mutation. */
  refreshKey?: number;
}

/**
 * Generic, reusable data table: server-side pagination, sorting and search,
 * plus loading, empty and error states. All list modules use this component.
 */
export function DataTable<T>({
  endpoint,
  columns,
  rowKey,
  options,
  searchPlaceholder = "Search…",
  toolbar,
  rowActions,
  emptyTitle = "Nothing here yet",
  emptyDescription = "There are no records to display.",
  emptyAction,
  refreshKey,
}: DataTableProps<T>) {
  const list = useResourceList<T>(endpoint, { ...options, reloadKey: refreshKey });

  const showEmpty = !list.loading && !list.error && list.data.length === 0;

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="table-search" className="sr-only">
            Search
          </label>
          <Input
            id="table-search"
            type="search"
            value={list.search}
            onChange={(event) => list.setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full sm:w-64"
          />
        </div>
        {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
      </div>

      {list.loading ? (
        <TableSkeleton columns={columns.length + (rowActions ? 1 : 0)} />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.refresh} />
      ) : showEmpty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableHeaderCell key={column.key} className={column.className}>
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => list.toggleSort(column.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      aria-label={`Sort by ${column.header}`}
                    >
                      {column.header}
                      <span aria-hidden="true" className="text-[10px]">
                        {list.sort === column.key ? (list.order === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHeaderCell>
              ))}
              {rowActions ? <TableHeaderCell className="text-right">Actions</TableHeaderCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {list.data.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn(column.className)}>
                    {column.render(row)}
                  </TableCell>
                ))}
                {rowActions ? (
                  <TableCell className="text-right">{rowActions(row)}</TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!list.loading && !list.error && list.data.length > 0 ? (
        <div className="flex flex-col items-center justify-between gap-2 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row">
          <span>
            Showing page {list.meta.page} of {list.meta.totalPages} · {list.meta.total} record
            {list.meta.total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => list.setPage(list.page - 1)}
              disabled={list.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => list.setPage(list.page + 1)}
              disabled={list.page >= list.meta.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

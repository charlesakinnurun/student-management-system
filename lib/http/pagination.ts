import type { PaginationMeta } from "@/lib/http/response";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface ListQuery {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  q: string;
  sort: string;
  order: "asc" | "desc";
}

export interface ListQueryOptions {
  /** Whitelist of sortable columns to prevent arbitrary field injection. */
  sortable?: readonly string[];
  defaultSort?: string;
  defaultOrder?: "asc" | "desc";
}

/**
 * Parse pagination/search/sort query params defensively. `sort` is validated
 * against a whitelist so callers can pass it straight to Prisma's `orderBy`.
 */
export function parseListQuery(
  searchParams: URLSearchParams,
  options: ListQueryOptions = {},
): ListQuery {
  const { sortable = [], defaultSort = "createdAt", defaultOrder = "desc" } = options;

  const rawPage = Number(searchParams.get("page") ?? "1");
  const rawSize = Number(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE));

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const pageSize =
    Number.isFinite(rawSize) && rawSize > 0
      ? Math.min(Math.floor(rawSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const requestedSort = searchParams.get("sort") ?? defaultSort;
  const sort = sortable.length === 0 || sortable.includes(requestedSort) ? requestedSort : defaultSort;
  const order = searchParams.get("order") === "asc" ? "asc" : searchParams.get("order") === "desc" ? "desc" : defaultOrder;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    q: (searchParams.get("q") ?? "").trim(),
    sort,
    order,
  };
}

/** Build Prisma `orderBy` from a parsed query. */
export function toOrderBy(query: ListQuery): Record<string, "asc" | "desc"> {
  return { [query.sort]: query.order };
}

/** Compose pagination metadata from a total count. */
export function buildMeta(total: number, page: number, pageSize: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

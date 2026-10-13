"use client";

import { useCallback, useEffect, useState } from "react";
import { apiList, buildQuery, type PaginationMeta } from "@/lib/api-client";

export interface UseResourceListOptions {
  pageSize?: number;
  defaultSort?: string;
  defaultOrder?: "asc" | "desc";
  /** Extra query string (already built) appended to every request. */
  query?: string;
  /** Change this value to force a refetch (e.g. after a mutation). */
  reloadKey?: string | number;
}

export interface ResourceListState<T> {
  data: T[];
  meta: PaginationMeta;
  loading: boolean;
  error: string | null;
  page: number;
  search: string;
  sort: string;
  order: "asc" | "desc";
  setPage: (page: number) => void;
  setSearch: (value: string) => void;
  toggleSort: (key: string) => void;
  refresh: () => void;
}

/**
 * Data-fetching hook for paginated list endpoints. Search input is debounced
 * (300ms) and always resets to page 1 so results stay consistent.
 */
export function useResourceList<T>(
  endpoint: string,
  options: UseResourceListOptions = {},
): ResourceListState<T> {
  const { pageSize = 20, defaultSort = "createdAt", defaultOrder = "desc", query = "", reloadKey } = options;

  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, pageSize, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPageState] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState(defaultSort);
  const [order, setOrder] = useState<"asc" | "desc">(defaultOrder);
  const [manualToken, setManualToken] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPageState(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const path =
        endpoint +
        buildQuery({ page, pageSize, sort, order, q: debouncedSearch }) +
        // `query` already starts with "?" when non-empty.
        (query ? (query.startsWith("?") ? `&${query.slice(1)}` : `&${query}`) : "");
      const result = await apiList<T>(path);
      setData(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setData([]);
    } finally {
      setLoading(false);
    }
    // `manualToken` and `reloadKey` are intentional invalidation keys: they are
    // not read inside the callback but must trigger a refetch when changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, pageSize, sort, order, debouncedSearch, query, manualToken, reloadKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => setManualToken((token) => token + 1), []);

  const toggleSort = useCallback(
    (key: string) => {
      setPageState(1);
      setSort((currentSort) => {
        if (currentSort === key) {
          setOrder((currentOrder) => (currentOrder === "asc" ? "desc" : "asc"));
          return currentSort;
        }
        setOrder("asc");
        return key;
      });
    },
    [],
  );

  return {
    data,
    meta,
    loading,
    error,
    page,
    search,
    sort,
    order,
    setPage: setPageState,
    setSearch,
    toggleSort,
    refresh,
  };
}

"use client";

import { useEffect, useState } from "react";
import { apiList, buildQuery } from "@/lib/api-client";

export interface Option {
  label: string;
  value: string;
}

/**
 * Fetch reference data for a `<select>`. Returns an array of `{ label, value }`.
 * Used by forms for faculties, departments, sessions, courses, etc.
 */
export function useOptions<T>(
  endpoint: string,
  map: (item: T) => Option,
  deps: unknown[] = [],
): { options: Option[]; loading: boolean } {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiList<T>(`${endpoint}${buildQuery({ pageSize: 100 })}`)
      .then((result) => {
        if (cancelled) return;
        setOptions(result.data.map(map));
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, ...deps]);

  return { options, loading };
}

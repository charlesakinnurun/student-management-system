/**
 * Client-side API wrapper.
 *
 * - attaches JSON headers
 * - unwraps the `{ data, meta }` envelope
 * - on a single 401 it refreshes the access token and replays the request once
 * - surfaces a typed ApiError carrying field-level validation details
 */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ValidationDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Field errors keyed by input name, for form display. */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    const map: Record<string, string> = {};
    for (const detail of this.details as ValidationDetail[]) {
      if (detail?.path) map[detail.path] = detail.message;
    }
    return map;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch("/api/auth/refresh", { method: "POST" })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      // Reset on the next tick so concurrent callers share one refresh.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    });
  return refreshInFlight;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  retry?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, retry = true } = options;

  const response = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && retry && !path.includes("/api/auth/")) {
    if (await refreshSession()) {
      return apiFetch<T>(path, { method, body, retry: false });
    }
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError(401, "UNAUTHENTICATED", "Your session has expired. Please sign in again.");
  }

  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as
    | { data?: T; error?: { code: string; message: string; details?: unknown } }
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "ERROR",
      payload?.error?.message ?? "Something went wrong. Please try again.",
      payload?.error?.details,
    );
  }

  return (payload?.data ?? (payload as unknown)) as T;
}

/** List endpoints return `{ data, meta }`; this keeps the meta around. */
export async function apiList<T>(path: string): Promise<{ data: T[]; meta: PaginationMeta }> {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (response.status === 401) {
    if (await refreshSession()) return apiList<T>(path);
    if (typeof window !== "undefined") window.location.href = "/login";
  }
  const payload = (await response.json().catch(() => null)) as
    | { data: T[]; meta: PaginationMeta; error?: { code: string; message: string; details?: unknown } }
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "ERROR",
      payload?.error?.message ?? "Failed to load data",
      payload?.error?.details,
    );
  }
  return { data: payload?.data ?? [], meta: payload?.meta ?? { page: 1, pageSize: 20, total: 0, totalPages: 1 } };
}

/** Build a query string, dropping empty values. */
export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PUT", body }),
  delete: <T = void>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

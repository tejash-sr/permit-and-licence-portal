// Generic ERPNext/Frappe REST client, server-side only.
// Next.js Route Handler helper module.
import { config } from "./config";

function authHeader() {
  return `token ${config.erpApiKey}:${config.erpApiSecret}`;
}

export class FrappeError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "FrappeError";
  }
}

type ListParams = {
  filters?: unknown[];
  fields?: string[];
  limit?: number;
  order_by?: string;
  limit_start?: number;
};

export async function frappeGet<T = Record<string, unknown>>(doctype: string, params: ListParams = {}): Promise<T[]> {
  const qs = new URLSearchParams();
  if (params.filters) qs.set("filters", JSON.stringify(params.filters));
  if (params.fields) qs.set("fields", JSON.stringify(params.fields));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.limit_start) qs.set("limit_start", String(params.limit_start));
  if (params.order_by) qs.set("order_by", params.order_by);

  const res = await fetch(`${config.erpBaseUrl}/api/resource/${encodeURIComponent(doctype)}?${qs.toString()}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FrappeError(`Frappe GET ${doctype} failed: ${res.status} ${text}`, res.status);
  }
  return (await res.json()).data ?? [];
}

export async function frappeGetDoc<T = Record<string, unknown>>(doctype: string, name: string): Promise<T | null> {
  const res = await fetch(`${config.erpBaseUrl}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FrappeError(`Frappe GET ${doctype}/${name} failed: ${res.status} ${text}`, res.status);
  }
  return (await res.json()).data;
}

export async function frappeCreate<T = Record<string, unknown>>(doctype: string, doc: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${config.erpBaseUrl}/api/resource/${encodeURIComponent(doctype)}`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FrappeError(`Frappe CREATE ${doctype} failed: ${res.status} ${text}`, res.status);
  }
  return (await res.json()).data;
}

export async function frappeUpdate<T = Record<string, unknown>>(doctype: string, name: string, doc: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${config.erpBaseUrl}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FrappeError(`Frappe UPDATE ${doctype}/${name} failed: ${res.status} ${text}`, res.status);
  }
  return (await res.json()).data;
}

export async function frappeDelete(doctype: string, name: string): Promise<boolean> {
  const res = await fetch(`${config.erpBaseUrl}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FrappeError(`Frappe DELETE ${doctype}/${name} failed: ${res.status} ${text}`, res.status);
  }
  return true;
}

/**
 * Calls a whitelisted custom Frappe method, e.g. permit_portal.api.accept_review.
 * Used for anything that needs to be atomic on the ERPNext side (see
 * /frappe_custom_methods/permit_portal/api.py) — race-condition-safe officer
 * accept, decisioning, etc. Returns the raw response so callers can inspect
 * status codes like 409 Conflict.
 */
export async function frappeCallMethod<T = Record<string, unknown>>(
  methodPath: string,
  payload: Record<string, unknown> = {}
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  const res = await fetch(`${config.erpBaseUrl}/api/method/${methodPath}`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, status: res.status, data: null, error: body?.message ?? body?.exc ?? `HTTP ${res.status}` };
  }
  return { ok: true, status: res.status, data: (body?.message ?? body) as T, error: null };
}

import { GoogleAuth } from "google-auth-library";
import { DEFAULT_SCOPES, REQUEST_TIMEOUT_MS } from "./constants.js";

const scopes = process.env.DV360_SCOPES?.split(",").map(s => s.trim()).filter(Boolean) ?? DEFAULT_SCOPES;
// Application Default Credentials: service account key, `gcloud auth application-default login`, or workload identity
const auth = new GoogleAuth({ scopes });

export type Json = Record<string, unknown>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export class ApiError extends Error {
  constructor(readonly status: number, detail: string) {
    super(httpErrorMessage(status, detail));
  }
}

function httpErrorMessage(status: number, detail: string): string {
  const suffix = detail ? ` Google said: ${detail}` : "";
  switch (status) {
    case 400:
      return `Bad request: a parameter is invalid (check filter syntax, IDs and field masks).${suffix}`;
    case 401:
      return `Google rejected the credentials. Re-run 'gcloud auth application-default login' or check GOOGLE_APPLICATION_CREDENTIALS.${suffix}`;
    case 403:
      return `Permission denied: the authenticated identity has no access to this DV360 entity, or the API/scope is not enabled on the Google Cloud project.${suffix}`;
    case 404:
      return `Not found. Check the IDs; use the matching dv360_list_* tool to find valid ones.${suffix}`;
    case 429:
      return `Quota exceeded. Wait a minute before retrying, or lower page_size.${suffix}`;
    default:
      return `Google API returned HTTP ${status}.${suffix}`;
  }
}

export async function apiRequest<T = Json>(
  baseUrl: string,
  path: string,
  signal: AbortSignal,
  { method = "GET", params = {}, body }: RequestOptions = {}
): Promise<T> {
  const url = new URL(`${baseUrl}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  const token = await auth.getAccessToken();
  if (!token) throw new ApiError(401, "no access token could be obtained");

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" })
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("Google did not respond within 30 seconds. Try again, or narrow the query.");
    }
    throw error;
  }
  if (!response.ok) {
    let detail = "";
    try {
      const err = (await response.json()) as { error?: { message?: string } };
      detail = err.error?.message ?? "";
    } catch {
      // Non-JSON error body
    }
    throw new ApiError(response.status, detail);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

// Optional guard for client work: DV360_ALLOWED_ADVERTISER_IDS="111,222" limits every advertiser-scoped tool to those IDs
const allowed = process.env.DV360_ALLOWED_ADVERTISER_IDS?.split(",").map(s => s.trim()).filter(Boolean);

export function assertAdvertiserAllowed(advertiserId: string | undefined): void {
  if (allowed && advertiserId && !allowed.includes(advertiserId)) {
    throw new Error(`Advertiser ${advertiserId} is not in this server's DV360_ALLOWED_ADVERTISER_IDS allowlist. Ask the owner to add it, or use the instance configured for that client.`);
  }
}

import { API_URL } from "#config/env"

export type HttpAuth = {
  headers?: Record<string, string>
  credentials?: RequestCredentials
}

type HttpClientOptions = {
  /** Defaults to VITE_API_URL. */
  baseUrl?: string
  /**
   * Called on every request. Defaults to sending the session cookie. Return
   * extra headers here later if the backend needs one (e.g. a CSRF header).
   */
  getAuth?: () => HttpAuth
}

export type RequestOptions = {
  signal?: AbortSignal
  headers?: Record<string, string>
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

/** One entry of a 400 "Validation failed" response. `field` is a dotted path. */
export type ValidationIssue = { field: string; message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readString(body: unknown, key: string): string | undefined {
  if (!isRecord(body)) return undefined
  const value = body[key]
  return typeof value === "string" && value ? value : undefined
}

function readIssues(body: unknown): ValidationIssue[] {
  if (!isRecord(body) || !Array.isArray(body.details)) return []
  return body.details.flatMap((item: unknown) =>
    isRecord(item) &&
    typeof item.field === "string" &&
    typeof item.message === "string"
      ? [{ field: item.field, message: item.message }]
      : []
  )
}

export class HttpError extends Error {
  readonly status: number
  readonly body: unknown
  /** Machine-readable code from the API, e.g. "pending_approval", "rate_limited", "storage_full". */
  readonly code: string | undefined
  /** Per-field problems from a 400 "Validation failed" response (empty otherwise). */
  readonly details: ValidationIssue[]

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = "HttpError"
    this.status = status
    this.body = body
    this.code = readString(body, "code")
    this.details = readIssues(body)
  }
}

async function toHttpError(res: Response): Promise<HttpError> {
  const text = await res.text().catch(() => "")
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    // Not JSON: keep the raw text.
  }
  // The API reports problems as { error: "..." }.
  const message =
    readString(body, "error") ??
    readString(body, "message") ??
    `Request failed (${res.status})`
  return new HttpError(res.status, message, body)
}

export function createHttpClient(options: HttpClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? API_URL).replace(/\/$/, "");
  const getAuth = options.getAuth ?? (() => ({ credentials: "include" as const }));
  async function request<T>(
    method: Method,
    path: string,
    body: unknown,
    { signal, headers: extraHeaders }: RequestOptions
  ): Promise<T> {
    const auth: HttpAuth = getAuth()
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...auth.headers,
      ...extraHeaders,
    }

    let payload: BodyInit | undefined
    if (body instanceof FormData) {
      payload = body // the browser sets the multipart boundary itself
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json"
      payload = JSON.stringify(body)
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: payload,
      credentials: auth.credentials,
      signal,
    })

    if (!res.ok) throw await toHttpError(res)
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  return {
    get: <T>(path: string, opts: RequestOptions = {}) =>
      request<T>("GET", path, undefined, opts),
    post: <T>(path: string, body?: unknown, opts: RequestOptions = {}) =>
      request<T>("POST", path, body, opts),
    put: <T>(path: string, body?: unknown, opts: RequestOptions = {}) =>
      request<T>("PUT", path, body, opts),
    patch: <T>(path: string, body?: unknown, opts: RequestOptions = {}) =>
      request<T>("PATCH", path, body, opts),
    delete: <T>(path: string, opts: RequestOptions = {}) =>
      request<T>("DELETE", path, undefined, opts),
  }
}

export type HttpClient = ReturnType<typeof createHttpClient>;
export const http = createHttpClient()
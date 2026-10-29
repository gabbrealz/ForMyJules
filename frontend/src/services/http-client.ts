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

type RequestOptions = {
  signal?: AbortSignal
  headers?: Record<string, string>
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export class HttpError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = "HttpError"
    this.status = status
    this.body = body
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
  const message =
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
      ? body.message
      : `Request failed (${res.status})`
  return new HttpError(res.status, message, body)
}

export function createHttpClient(options: HttpClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? API_URL).replace(/\/$/, "");
  const getAuth = options.getAuth ?? (() => ({ credentials: "include" as const }));
``
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

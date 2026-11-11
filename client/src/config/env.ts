export const API_URL = import.meta.env.VITE_API_URL ?? ""

/**
 * Base URL for WebSocket connections. Defaults to the API's host over ws(s);
 * set VITE_WS_URL to override it.
 */
export const WS_URL: string =
  import.meta.env.VITE_WS_URL ??
  (API_URL || window.location.origin).replace(/^http/, "ws")

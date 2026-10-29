import type { Location } from "react-router-dom"

export const DEFAULT_POST_LOGIN_PATH = "/home"

/** What <ProtectedRoute /> puts in location.state when it sends someone to /login. */
export type LoginRedirectState = {
  from: Pick<Location, "pathname" | "search" | "hash">
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : ""
}

// location.state is untyped at runtime (history can hold anything), so it is
// validated instead of cast. Only in-app absolute paths are accepted: "//host"
// would be read as a protocol-relative URL.
export function getPostLoginPath(state: unknown): string {
  if (!isRecord(state)) return DEFAULT_POST_LOGIN_PATH
  const { from } = state
  if (!isRecord(from)) return DEFAULT_POST_LOGIN_PATH

  const { pathname, search, hash } = from
  if (
    typeof pathname !== "string" ||
    !pathname.startsWith("/") ||
    pathname.startsWith("//")
  ) {
    return DEFAULT_POST_LOGIN_PATH
  }

  return pathname + stringOrEmpty(search) + stringOrEmpty(hash)
}

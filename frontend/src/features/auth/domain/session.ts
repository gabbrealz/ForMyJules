import { isAuthUser, type AuthUser } from "./auth-user.ts"

// With a cookie session the client never holds a token: the session is just who we are.
export type Session = {
  user: AuthUser
}

export function isSession(value: unknown): value is Session {
  if (typeof value !== "object" || value === null) return false
  return isAuthUser((value as Record<string, unknown>).user)
}

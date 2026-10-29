export const ROLES = ["admin", "partner", "guest"] as const
export type Role = (typeof ROLES)[number]

export type AuthUser = { username: string; displayName: string; role: Role }

// With a cookie session the client never holds a token: the session is just who we are.
export type Session = { user: AuthUser }

export type LoginCredentials = { username: string; password: string }
export type SignupCredentials = { username: string; nickname: string; password: string }

export const isAdmin = (user: AuthUser) => user.role === "admin"

// Validates data read back from localStorage (it may be stale or an older shape).
export function isSession(value: unknown): value is Session {
  const user = (value as Session | null)?.user
  return (
    typeof user?.username === "string" &&
    typeof user.displayName === "string" &&
    ROLES.some((role) => role === user.role)
  )
}
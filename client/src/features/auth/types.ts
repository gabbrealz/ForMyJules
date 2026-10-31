export const ROLES = ["admin", "partner", "guest"] as const
/** Roles that can log in and use the app. */
export type Role = (typeof ROLES)[number]
/** Every role an account can hold: the approved ones plus a new sign-up's waiting state. */
export type UserRole = Role | "pending_approval"

/** A user as the API returns it (PublicUser in API.md). */
export type User<R extends UserRole = UserRole> = {
  id: string
  username: string
  nickname: string
  role: R
}

/** Anyone who is logged in, so never `pending_approval`. */
export type AuthUser = User<Role>

// With a cookie session the client never holds a token: the session is just who we are.
export type Session = { user: AuthUser }

export type LoginCredentials = { username: string; password: string }
export type SignupCredentials = { username: string; nickname: string; password: string }

export const isAdmin = (user: AuthUser) => user.role === "admin"

// Guests are view-only: partners and admins can upload, edit and delete any photo.
export const canManagePhotos = (user: AuthUser) => user.role !== "guest"

// Validates data read back from localStorage (it may be stale or an older shape).
export function isSession(value: unknown): value is Session {
  const user = (value as Session | null)?.user
  return (
    typeof user?.id === "string" &&
    typeof user.username === "string" &&
    typeof user.nickname === "string" &&
    ROLES.some((role) => role === user.role)
  )
}

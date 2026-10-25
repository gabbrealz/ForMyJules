export const ROLES = ["admin", "partner", "guest"] as const
export type Role = (typeof ROLES)[number]

export type AuthUser = {
  username: string
  displayName: string
  role: Role
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value)
}

export function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.username === "string" &&
    typeof v.displayName === "string" &&
    isRole(v.role)
  )
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === "admin"
}

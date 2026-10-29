export type Role = "Partner" | "Guest"

export type AdminUser = {
  id: string
  username: string
  nickname: string
  role: Role
  avatarUrl?: string
}

import { Badge } from "#components/ui/badge"
import type { Role } from "#lib/admin"

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge variant={role === "Partner" ? "default" : "secondary"}>{role}</Badge>
  )
}

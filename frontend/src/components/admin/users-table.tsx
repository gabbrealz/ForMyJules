import type { ComponentProps } from "react"
import type { LucideIcon } from "lucide-react"

import { RoleBadge } from "#components/admin/role-badge"
import { UserCell } from "#components/admin/user-cell"
import { Button } from "#components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"
import type { AdminUser } from "#lib/admin"

export type UserAction = {
  /** Stable key for React. */
  key: string
  label: string
  icon: LucideIcon
  variant?: ComponentProps<typeof Button>["variant"]
  disabled?: boolean
  onClick: (user: AdminUser) => void
}

type UsersTableProps = {
  users: AdminUser[]
  /**
   * Buttons shown in the last column. Pass an array to use the same buttons on
   * every row, or a function to decide per user (hide, disable or swap actions).
   */
  actions: UserAction[] | ((user: AdminUser) => UserAction[])
  emptyMessage?: string
}

const COLUMN_COUNT = 4

export function UsersTable({
  users,
  actions,
  emptyMessage = "No users to show.",
}: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="h-11 px-4">User</TableHead>
            <TableHead className="h-11 px-4">Nickname</TableHead>
            <TableHead className="h-11 px-4">Role</TableHead>
            <TableHead className="h-11 px-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMN_COUNT}
                className="h-32 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => {
              const rowActions = typeof actions === "function" ? actions(user) : actions

              return (
                <TableRow key={user.id}>
                  <TableCell className="px-4 py-3">
                    <UserCell
                      username={user.username}
                      avatarUrl={user.avatarUrl}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {user.nickname || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {rowActions.map(
                        ({
                          key,
                          label,
                          icon: Icon,
                          variant = "outline",
                          disabled,
                          onClick,
                        }) => (
                          <Button
                            key={key}
                            variant={variant}
                            size="sm"
                            disabled={disabled}
                            aria-label={`${label} ${user.username}`}
                            onClick={() => onClick(user)}
                          >
                            <Icon />
                            <span className="max-sm:sr-only">{label}</span>
                          </Button>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

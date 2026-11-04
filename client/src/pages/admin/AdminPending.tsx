import { UserRoundCheckIcon, XIcon } from "lucide-react"

import { Button } from "#components/ui/button"

import {
  AdminPage,
  UsersTable,
  usePendingUsers,
  type AdminUser,
  type UserAction,
} from "#features/admin"

export default function AdminPending() {
  const { users, loading, error, isBusy, approve, reject, reload } = usePendingUsers()

  // Approving needs a role, so there is one approve button per role the API allows.
  const actionsFor = (user: AdminUser): UserAction[] => {
    const disabled = isBusy(user.id)
    return [
      {
        key: "approve-guest",
        label: "Approve as guest",
        icon: UserRoundCheckIcon,
        disabled,
        onClick: (u) => void approve(u, "guest"),
      },
      {
        key: "reject",
        label: "Reject",
        icon: XIcon,
        variant: "destructive",
        disabled,
        onClick: (u) => void reject(u),
      },
    ]
  }

  return (
    <AdminPage
      title="Pending Registrations"
      description="New sign-ups waiting for your approval."
      count={loading ? undefined : users.length}
    >
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={reload}>
            Retry
          </Button>
        </div>
      )}
      <UsersTable
        users={users}
        actions={actionsFor}
        emptyMessage={loading ? "Loading..." : "No pending registrations."}
      />
    </AdminPage>
  )
}

import { CheckIcon, UserRoundCheckIcon, XIcon } from "lucide-react"

import {
  AdminPage,
  UsersTable,
  usePendingUsers,
  type AdminUser,
  type UserAction,
} from "#features/admin"

export default function AdminPending() {
  const { users, loading, error, isBusy, approve, reject } = usePendingUsers()

  // Approving needs a role, so there is one approve button per role the API allows.
  const actionsFor = (user: AdminUser): UserAction[] => {
    const disabled = isBusy(user.id)
    return [
      {
        key: "approve-partner",
        label: "Approve as partner",
        icon: CheckIcon,
        variant: "default",
        disabled,
        onClick: (u) => void approve(u, "partner"),
      },
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
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <UsersTable
        users={users}
        actions={actionsFor}
        emptyMessage={loading ? "Loading..." : "No pending registrations."}
      />
    </AdminPage>
  )
}

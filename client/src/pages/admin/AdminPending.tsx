import { CheckIcon, XIcon } from "lucide-react"

import { AdminPage } from "#features/admin"
import { UsersTable, type UserAction } from "#features/admin"
import { PENDING_REGISTRATIONS } from "#features/admin"

// TODO: wire these up. Each handler receives the row's user once you add a parameter.
function handleApprove() {
  // Intentionally empty for now.
}

function handleReject() {
  // Intentionally empty for now.
}

const ACTIONS: UserAction[] = [
  {
    key: "approve",
    label: "Approve",
    icon: CheckIcon,
    variant: "default",
    onClick: handleApprove,
  },
  {
    key: "reject",
    label: "Reject",
    icon: XIcon,
    variant: "destructive",
    onClick: handleReject,
  },
]

export default function AdminPending() {
  return (
    <AdminPage
      title="Pending Registrations"
      description="New sign-ups waiting for your approval."
      count={PENDING_REGISTRATIONS.length}
    >
      <UsersTable
        users={PENDING_REGISTRATIONS}
        actions={ACTIONS}
        emptyMessage="No pending registrations."
      />
    </AdminPage>
  )
}

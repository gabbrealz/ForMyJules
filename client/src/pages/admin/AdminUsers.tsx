import { PencilIcon, Trash2Icon } from "lucide-react"

import { AdminPage } from "#features/admin"
import { UsersTable, type UserAction } from "#features/admin"
import { USERS } from "#features/admin"

// TODO: wire these up. Each handler receives the row's user once you add a parameter.
function handleEdit() {
  // Intentionally empty for now.
}

function handleDelete() {
  // Intentionally empty for now.
}

const ACTIONS: UserAction[] = [
  { key: "edit", label: "Edit", icon: PencilIcon, onClick: handleEdit },
  {
    key: "delete",
    label: "Delete",
    icon: Trash2Icon,
    variant: "destructive",
    onClick: handleDelete,
  },
]

export default function AdminUsers() {
  return (
    <AdminPage
      title="Users"
      description="Everyone with access to the app."
      count={USERS.length}
    >
      <UsersTable
        users={USERS}
        actions={ACTIONS}
        emptyMessage="No users yet."
      />
    </AdminPage>
  )
}

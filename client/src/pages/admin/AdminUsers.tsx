import { useState } from "react"
import { PencilIcon, Trash2Icon } from "lucide-react"

import { ConfirmDeleteDialog } from "#components/confirm-delete-dialog"
import { Button } from "#components/ui/button"
import {
  AdminPage,
  EditUserDialog,
  UsersTable,
  useUsers,
  type AdminUser,
  type UserAction,
} from "#features/admin"

export default function AdminUsers() {
  const { users, loading, error, reload, updateUser, deleteUser } = useUsers()

  // The user being edited, or null when the edit dialog is closed.
  const [editing, setEditing] = useState<AdminUser | null>(null)

  // `open` is separate from `target` so the dialog keeps its text while it
  // animates closed.
  const [target, setTarget] = useState<AdminUser | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const actions: UserAction[] = [
    { key: "edit", label: "Edit", icon: PencilIcon, onClick: setEditing },
    {
      key: "delete",
      label: "Delete",
      icon: Trash2Icon,
      variant: "destructive",
      onClick: (user) => {
        setTarget(user)
        setDialogOpen(true)
      },
    },
  ]

  const emptyMessage = loading
    ? "Loading users…"
    : error
      ? "Users couldn't be loaded."
      : "No users yet."

  return (
    <AdminPage
      title="Users"
      description="Everyone with access to the app."
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

      <UsersTable users={users} actions={actions} emptyMessage={emptyMessage} />

      <EditUserDialog
        user={editing}
        onSave={updateUser}
        onClose={() => setEditing(null)}
      />

      <ConfirmDeleteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Delete this user?"
        description={
          <>
            <strong>{target?.username}</strong> will lose access immediately and
            their account will be permanently deleted. This can't be undone.
          </>
        }
        onConfirm={() => (target ? deleteUser(target) : undefined)}
      />
    </AdminPage>
  )
}

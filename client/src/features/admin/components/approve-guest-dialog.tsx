import { useState } from "react"

import { useRetainedValue } from "@features/admin/hooks/use-retained-value"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#components/ui/alert-dialog"
import { Button } from "#components/ui/button"
import { FieldError } from "#components/ui/field"
import { Spinner } from "#components/ui/spinner"
import type { AdminUser } from "#features/admin"
import { errorMessage } from "#features/auth"

type ApproveGuestDialogProps = {
  /** The registration being approved. `null` closes the dialog. */
  user: AdminUser | null
  /** Approves the account as a guest. Reject to keep the dialog open with the error. */
  onConfirm: (user: AdminUser) => Promise<unknown>
  onClose: () => void
}

// Guests are view-only, so approving one is worth a second look before it
// goes through.
export function ApproveGuestDialog({
  user,
  onConfirm,
  onClose,
}: ApproveGuestDialogProps) {
  const { value: shown } = useRetainedValue(user)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    setError(null)
    onClose()
  }

  async function confirm() {
    if (!shown || pending) return
    setError(null)
    setPending(true)
    try {
      await onConfirm(shown)
      close()
    } catch (err) {
      setError(errorMessage(err, `Couldn't approve ${shown.username}.`))
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={user !== null}
      onOpenChange={(open) => {
        // Escape can't dismiss it while the request is in flight.
        if (!open && !pending) close()
      }}
    >
      <AlertDialogContent>
        {shown && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Approve <span className="font-extrabold">{shown.nickname || shown.username}</span> as a guest?
              </AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-black">@{shown.username}</span> will be able to log in right away with
                view-only access. Guests can browse photos but can't upload,
                edit or delete them.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {error && <FieldError>{error}</FieldError>}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              {/* A plain Button, not AlertDialogAction, which would close the
                  dialog before the request finishes. */}
              <Button onClick={confirm} disabled={pending}>
                {pending && <Spinner />}
                Approve as guest
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}

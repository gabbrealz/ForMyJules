import { useState, type ReactNode } from "react"

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
import { Spinner } from "#components/ui/spinner"

type ConfirmDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  /** What is about to be deleted and any consequences. */
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /**
   * Runs when the person confirms. The dialog stays open with a spinner until
   * it settles, closes on success, and shows the error message if it throws.
   */
  onConfirm: () => void | Promise<void>
}

// Generic "are you sure?" modal for destructive actions. It knows nothing about
// what is being deleted: the caller supplies the copy and the delete handler.
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  description = "This action can't be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    // Don't let Escape dismiss the dialog while the request is in flight.
    if (pending) return
    if (!next) setError(null)
    onOpenChange(next)
  }

  async function handleConfirm() {
    setPending(true)
    setError(null)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          {/* A plain Button, not AlertDialogAction: that one closes the dialog
              immediately, but we only want to close once the request succeeds. */}
          <Button
            variant="destructive"
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending && <Spinner />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

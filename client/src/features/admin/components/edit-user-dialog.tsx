import { useState, type SubmitEvent } from "react"

import { RoleBadge } from "@features/admin/components/role-badge"
import { useRetainedValue } from "@features/admin/hooks/use-retained-value"
import { FloatingInput } from "#components/floating-input"
import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "#components/ui/field"
import { Label } from "#components/ui/label"
import { RadioGroup, RadioGroupItem } from "#components/ui/radio-group"
import { Spinner } from "#components/ui/spinner"
import type {
  AdminUser,
  ApprovableRole,
  UpdateUserInput,
} from "#features/admin"
import { errorMessage, MAX_NICKNAME_LENGTH } from "#features/auth"
import { HttpError } from "#services/http-client"

const ROLE_OPTIONS: {
  value: ApprovableRole
  label: string
  description: string
}[] = [
  {
    value: "partner",
    label: "Partner",
    description: "Can view, upload, edit and delete photos.",
  },
  {
    value: "guest",
    label: "Guest",
    description: "View only. Can't upload, edit or delete photos.",
  },
]

const isApprovableRole = (value: unknown): value is ApprovableRole =>
  value === "partner" || value === "guest"

/** The role to preselect, or null for pending accounts (they're approved, not edited). */
const roleOf = (user: AdminUser): ApprovableRole | null => {
  if (user.role === "Partner") return "partner"
  if (user.role === "Guest") return "guest"
  return null
}

type FieldErrors = { nickname?: string; role?: string }

function validateNickname(value: string): string | undefined {
  const nickname = value.trim()
  if (!nickname) return "Nickname can't be empty."
  if (nickname.length > MAX_NICKNAME_LENGTH) {
    return `Nickname can be at most ${MAX_NICKNAME_LENGTH} characters.`
  }
  return undefined
}

/** Maps a 400 from the API onto the form's fields where possible. */
function fieldErrorsFromApi(error: unknown): FieldErrors {
  if (!(error instanceof HttpError)) return {}
  const errors: FieldErrors = {}
  for (const { field, message } of error.details) {
    if (field === "nickname" || field === "role") errors[field] ??= message
  }
  return errors
}

type EditUserDialogProps = {
  /** The account being edited. `null` closes the dialog. */
  user: AdminUser | null
  /**
   * Saves the changes. Reject with the API error to keep the dialog open and
   * show it (`useUsers().updateUser` does this).
   */
  onSave: (user: AdminUser, changes: UpdateUserInput) => Promise<void>
  onClose: () => void
}

export function EditUserDialog({ user, onSave, onClose }: EditUserDialogProps) {
  const { value: shown, session } = useRetainedValue(user)
  // Lives here (not in the form) so Escape and the backdrop can't close the
  // dialog mid-request.
  const [saving, setSaving] = useState(false)

  return (
    <Dialog
      open={user !== null}
      onOpenChange={(open) => {
        if (!open && !saving) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        {shown && (
          <EditUserForm
            key={`${shown.id}:${session}`}
            user={shown}
            saving={saving}
            onSavingChange={setSaving}
            onSave={onSave}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type EditUserFormProps = Omit<EditUserDialogProps, "user"> & {
  user: AdminUser
  saving: boolean
  onSavingChange: (saving: boolean) => void
}

function EditUserForm({
  user,
  saving,
  onSavingChange,
  onSave,
  onClose,
}: EditUserFormProps) {
  const currentRole = roleOf(user)
  const [nickname, setNickname] = useState(user.nickname)
  const [role, setRole] = useState<ApprovableRole>(currentRole ?? "guest")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  // Only send what actually changed.
  const changes: UpdateUserInput = {}
  if (nickname.trim() !== user.nickname) changes.nickname = nickname.trim()
  if (currentRole !== null && role !== currentRole) changes.role = role
  const hasChanges = Object.keys(changes).length > 0

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !hasChanges) return

    const nicknameError = validateNickname(nickname)
    if (nicknameError) {
      setErrors({ nickname: nicknameError })
      return
    }

    setErrors({})
    setFormError(null)
    onSavingChange(true)
    try {
      await onSave(user, changes)
      onClose()
    } catch (err) {
      const apiErrors = fieldErrorsFromApi(err)
      if (Object.keys(apiErrors).length > 0) setErrors(apiErrors)
      else setFormError(errorMessage(err, `Couldn't update ${user.username}.`))
    } finally {
      onSavingChange(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="mx-auto text-xl">Edit User</DialogTitle>
        <DialogDescription>
          You can update this account's nickname or role.
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className="gap-5">
        <Field>
          <FloatingInput
            id="edit-user-username"
            label="Username"
            value={user.username}
            disabled
            readOnly
          />
        </Field>

        <Field data-invalid={errors.nickname ? true : undefined}>
          <FloatingInput
            id="edit-user-nickname"
            label="Nickname"
            value={nickname}
            autoComplete="off"
            disabled={saving}
            aria-invalid={errors.nickname ? true : undefined}
            onChange={(event) => {
              setNickname(event.target.value)
              setErrors((prev) => ({ ...prev, nickname: undefined }))
            }}
          />
          {errors.nickname && <FieldError>{errors.nickname}</FieldError>}
        </Field>

        <FieldSet data-invalid={errors.role ? true : undefined}>
          <FieldLegend variant="label">Role</FieldLegend>
          {currentRole === null ? (
            <>
              <div>
                <RoleBadge role={user.role} />
              </div>
              <FieldDescription>
                Pick a role when you approve this registration.
              </FieldDescription>
            </>
          ) : (
            <RadioGroup
              value={role}
              disabled={saving}
              className="gap-2"
              onValueChange={(value) => {
                if (!isApprovableRole(value)) return
                setRole(value)
                setErrors((prev) => ({ ...prev, role: undefined }))
              }}
            >
              {ROLE_OPTIONS.map(({ value, label, description }) => (
                <Label
                  key={value}
                  htmlFor={`edit-user-role-${value}`}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/5"
                >
                  <RadioGroupItem
                    id={`edit-user-role-${value}`}
                    value={value}
                    className="mt-0.5"
                  />
                  <span className="grid gap-0.5">
                    <span className="font-medium">{label}</span>
                    <span className="text-sm text-muted-foreground">
                      {description}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          )}
          {errors.role && <FieldError>{errors.role}</FieldError>}
        </FieldSet>

        {formError && <FieldError>{formError}</FieldError>}
      </FieldGroup>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !hasChanges}>
          {saving && <Spinner />}
          Save changes
        </Button>
      </DialogFooter>
    </form>
  )
}

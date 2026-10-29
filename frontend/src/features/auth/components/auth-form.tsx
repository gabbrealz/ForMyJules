import type { SubmitEvent, ReactNode } from "react"
import { FieldGroup, FieldError } from "#components/ui/field"
import { Button } from "#components/ui/button"
import { Spinner } from "#components/ui/spinner"

export function AuthForm({ onSubmit, submitLabel, pending, error, children }: {
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void | Promise<void>
  submitLabel: string
  pending: boolean
  error: string | null
  children: ReactNode
}) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup className="gap-5">
        {children}
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" size="lg" className="h-10 w-full text-sm" disabled={pending}>
          {pending && <Spinner />}
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  )
}

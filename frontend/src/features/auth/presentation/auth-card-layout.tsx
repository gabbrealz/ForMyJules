import type { ReactNode, SubmitEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { CatIcon } from "lucide-react"

import { Backdrop } from "@shared/components/backdrop.tsx"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { FieldError, FieldGroup } from "#components/ui/field"
import { Spinner } from "#components/ui/spinner"

type AuthCardLayoutProps = {
  title: string
  description: string
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void | Promise<void>
  submitLabel: string
  pending: boolean
  /** Form-level error shown above the submit button. */
  error: string | null
  footer: { prompt: string; linkLabel: string; to: string }
  /** The form fields. */
  children: ReactNode
}

// The form lives here too (not just the card) so the submit button and footer
// stay inside the same FieldGroup and keep the original 5-unit rhythm.
export function AuthCardLayout({
  title,
  description,
  onSubmit,
  submitLabel,
  pending,
  error,
  footer,
  children,
}: AuthCardLayoutProps) {
  const navigate = useNavigate()

  return (
    <Backdrop>
      <div className="relative flex min-h-svh flex-col items-center justify-center gap-4 px-4 py-10">
        <Card className="w-full max-w-sm bg-card/90 backdrop-blur-md">
          <CardHeader className="items-center justify-items-center text-center">
            <span className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-apricot text-brown">
              <CatIcon className="size-6" />
            </span>
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} noValidate>
              <FieldGroup className="gap-5">
                {children}
                {error && <FieldError>{error}</FieldError>}
                <Button
                  type="submit"
                  size="lg"
                  className="h-10 w-full text-sm"
                  disabled={pending}
                >
                  {pending && <Spinner />}
                  {submitLabel}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {footer.prompt}{" "}
                  <Link
                    to={footer.to}
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    {footer.linkLabel}
                  </Link>
                </p>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Button
          variant="ghost"
          size="sm"
          className="text-cream hover:bg-cream/15 hover:text-cream"
          onClick={() => navigate("/")}
        >
          Back to start
        </Button>
      </div>
    </Backdrop>
  )
}

import type { ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { CatIcon } from "lucide-react"

import { Backdrop } from "#components/backdrop"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

type AuthLayoutProps = {
  title: string
  description: string
  footer: { prompt: string; linkLabel: string; to: string }
  /** The form fields. */
  children: ReactNode
}

// Page shell for login/signup: backdrop, card and footer link. The form itself
// lives in the auth feature (LoginForm / SignupForm).
export function AuthLayout({ title, description, footer, children }: AuthLayoutProps) {
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
            <div className="flex flex-col gap-5">
              {children}
              <p className="text-center text-sm text-muted-foreground">
                {footer.prompt}{" "}
                <Link
                  to={footer.to}
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  {footer.linkLabel}
                </Link>
              </p>
            </div>
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

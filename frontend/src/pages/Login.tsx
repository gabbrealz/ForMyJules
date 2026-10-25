import { useState, type SubmitEvent } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { CatIcon } from "lucide-react"

import { useAuth } from "../features/auth/index.ts"
import { Backdrop } from "#components/backdrop"
import { FloatingInput, PasswordToggle } from "#components/floating-input"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Field, FieldError, FieldGroup } from "#components/ui/field"
import { Spinner } from "#components/ui/spinner"
import { APP_NAME } from "#lib/brand"

export default function Login() {
  const { isAuthenticated, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Send people back to the page they were trying to reach.
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from
      ?.pathname ?? "/home"

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't log you in. Check your details and try again."
      )
      setPending(false)
    }
  }

  return (
    <Backdrop>
      <div className="relative flex min-h-svh flex-col items-center justify-center gap-4 px-4 py-10">
        <Card className="w-full max-w-sm bg-card/90 backdrop-blur-md">
          <CardHeader className="items-center justify-items-center text-center">
            <span className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-apricot text-brown">
              <CatIcon className="size-6" />
            </span>
            <CardTitle className="text-xl font-bold">Welcome back</CardTitle>
            <CardDescription>Log in to {APP_NAME}.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate>
              <FieldGroup className="gap-5">
                <Field data-invalid={error ? true : undefined}>
                  <FloatingInput
                    id="username"
                    name="username"
                    label="Username"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    aria-invalid={error ? true : undefined}
                  />
                </Field>
                <Field data-invalid={error ? true : undefined}>
                  <FloatingInput
                    id="password"
                    name="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={error ? true : undefined}
                    endAdornment={
                      <PasswordToggle
                        shown={showPassword}
                        onToggle={() => setShowPassword((shown) => !shown)}
                        label={showPassword ? "Hide password" : "Show password"}
                      />
                    }
                  />
                </Field>
                {error && <FieldError>{error}</FieldError>}
                <Button
                  type="submit"
                  size="lg"
                  className="h-10 w-full text-sm"
                  disabled={pending}
                >
                  {pending && <Spinner />}
                  Log in
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    Sign up
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

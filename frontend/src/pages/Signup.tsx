import { useState, type SubmitEvent } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { CatIcon, EyeIcon, EyeOffIcon } from "lucide-react"

import { useAuth } from "../auth/auth-context.ts"
import { Backdrop } from "#components/backdrop"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "#components/ui/input-group"
import { Spinner } from "#components/ui/spinner"
import { APP_NAME } from "#lib/brand"

type FieldName = "username" | "nickname" | "password" | "confirmPassword"
type FieldErrors = Partial<Record<FieldName, string>>

const MIN_USERNAME_LENGTH = 3
const MIN_PASSWORD_LENGTH = 8

function validate(values: Record<FieldName, string>): FieldErrors {
  const errors: FieldErrors = {}
  const username = values.username.trim()

  if (!username) {
    errors.username = "Choose a username."
  } else if (username.length < MIN_USERNAME_LENGTH) {
    errors.username = `Username must be at least ${MIN_USERNAME_LENGTH} characters.`
  } else if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    errors.username =
      "Use only letters, numbers, dots, dashes and underscores."
  }

  if (!values.nickname.trim()) {
    errors.nickname = "Tell us what to call you."
  }

  if (!values.password) {
    errors.password = "Create a password."
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm your password."
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Passwords don't match."
  }

  return errors
}

export default function Signup() {
  const { isAuthenticated, signup } = useAuth()
  const navigate = useNavigate()

  const [values, setValues] = useState<Record<FieldName, string>>({
    username: "",
    nickname: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/home" replace />
  }

  function setValue(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
    // Clear a field's error as soon as the person starts fixing it.
    if (fieldErrors[name]) {
      setFieldErrors((current) => ({ ...current, [name]: undefined }))
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const errors = validate(values)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setPending(true)
    try {
      await signup(values.username, values.nickname, values.password)
      // On success the auth state flips and the redirect above takes over.
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't create your account. Please try again."
      )
      setPending(false)
    }
  }

  const passwordToggle = (
    <InputGroupAddon align="inline-end">
      <InputGroupButton
        size="icon-xs"
        aria-label={showPassword ? "Hide passwords" : "Show passwords"}
        onClick={() => setShowPassword((shown) => !shown)}
      >
        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
      </InputGroupButton>
    </InputGroupAddon>
  )

  return (
    <Backdrop>
      <div className="relative flex min-h-svh flex-col items-center justify-center gap-4 px-4 py-10">
        <Card className="w-full max-w-sm bg-card/90 backdrop-blur-md">
          <CardHeader className="items-center justify-items-center text-center">
            <span className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-apricot text-brown">
              <CatIcon className="size-6" />
            </span>
            <CardTitle className="text-xl font-bold">
              Create your account
            </CardTitle>
            <CardDescription>Join {APP_NAME}.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate>
              <FieldGroup className="gap-5">
                <Field data-invalid={fieldErrors.username ? true : undefined}>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    autoFocus
                    value={values.username}
                    onChange={(e) => setValue("username", e.target.value)}
                    aria-invalid={fieldErrors.username ? true : undefined}
                  />
                  <FieldError>{fieldErrors.username}</FieldError>
                </Field>

                <Field data-invalid={fieldErrors.nickname ? true : undefined}>
                  <FieldLabel htmlFor="nickname">Nickname</FieldLabel>
                  <Input
                    id="nickname"
                    name="nickname"
                    autoComplete="nickname"
                    value={values.nickname}
                    onChange={(e) => setValue("nickname", e.target.value)}
                    aria-invalid={fieldErrors.nickname ? true : undefined}
                  />
                  <FieldError>{fieldErrors.nickname}</FieldError>
                </Field>

                <Field data-invalid={fieldErrors.password ? true : undefined}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={values.password}
                      onChange={(e) => setValue("password", e.target.value)}
                      aria-invalid={fieldErrors.password ? true : undefined}
                    />
                    {passwordToggle}
                  </InputGroup>
                  <FieldError>{fieldErrors.password}</FieldError>
                </Field>

                <Field
                  data-invalid={fieldErrors.confirmPassword ? true : undefined}
                >
                  <FieldLabel htmlFor="confirmPassword">
                    Confirm Password
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={values.confirmPassword}
                      onChange={(e) =>
                        setValue("confirmPassword", e.target.value)
                      }
                      aria-invalid={
                        fieldErrors.confirmPassword ? true : undefined
                      }
                    />
                    {passwordToggle}
                  </InputGroup>
                  <FieldError>{fieldErrors.confirmPassword}</FieldError>
                </Field>

                {error && <FieldError>{error}</FieldError>}

                <Button
                  type="submit"
                  size="lg"
                  className="h-10 w-full text-sm"
                  disabled={pending}
                >
                  {pending && <Spinner />}
                  Sign up
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    Log in
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

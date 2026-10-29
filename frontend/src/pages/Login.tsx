import { Navigate } from "react-router-dom"

import { AuthCardLayout, useLoginForm } from "../features/auth/index.ts"
import {
  FloatingInput,
  PasswordToggle,
} from "@shared/components/floating-input.tsx"
import { Field } from "#components/ui/field"
import { APP_NAME } from "#lib/brand"

export default function Login() {
  const form = useLoginForm()

  if (form.redirectTo) {
    return <Navigate to={form.redirectTo} replace />
  }

  const invalid = form.error ? true : undefined

  return (
    <AuthCardLayout
      title="Welcome back"
      description={`Log in to ${APP_NAME}.`}
      onSubmit={form.handleSubmit}
      submitLabel="Log in"
      pending={form.pending}
      error={form.error}
      footer={{
        prompt: "Don't have an account?",
        linkLabel: "Sign up",
        to: "/signup",
      }}
    >
      <Field data-invalid={invalid}>
        <FloatingInput
          id="username"
          name="username"
          label="Username"
          autoComplete="username"
          autoFocus
          value={form.username}
          onChange={(e) => form.setUsername(e.target.value)}
          aria-invalid={invalid}
        />
      </Field>
      <Field data-invalid={invalid}>
        <FloatingInput
          id="password"
          name="password"
          label="Password"
          type={form.showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => form.setPassword(e.target.value)}
          aria-invalid={invalid}
          endAdornment={
            <PasswordToggle
              shown={form.showPassword}
              onToggle={form.toggleShowPassword}
              label={form.showPassword ? "Hide password" : "Show password"}
            />
          }
        />
      </Field>
    </AuthCardLayout>
  )
}

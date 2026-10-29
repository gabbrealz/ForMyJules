import { Navigate } from "react-router-dom"
import { Field } from "#components/ui/field"
import { FloatingInput, PasswordToggle } from "#components/floating-input"
import { useLoginForm } from "../hooks/use-login-form.ts"
import { AuthForm } from "./auth-form.tsx"

export function LoginForm() {
  const form = useLoginForm()
  if (form.redirectTo) return <Navigate to={form.redirectTo} replace />
  const invalid = form.error ? true : undefined

  return (
    <AuthForm
      onSubmit={form.handleSubmit}
      submitLabel="Log in"
      pending={form.pending}
      error={form.error}
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
    </AuthForm>
  );
}

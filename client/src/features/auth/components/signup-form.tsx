import { Navigate } from "react-router-dom"
import { Field, FieldError } from "#components/ui/field"
import { FloatingInput, PasswordToggle } from "#components/floating-input"
import { useSignupForm } from "../hooks/use-signup-form.ts"
import { AuthForm } from "./auth-form.tsx"

export function SignupForm() {
  const form = useSignupForm()
  if (form.redirectTo) return <Navigate to={form.redirectTo} replace />
  const { values, fieldErrors, setValue } = form

  if (form.successMessage) {
    return (
      <div role="status" className="space-y-2 py-2 text-center">
        <p className="font-heading text-lg font-semibold">Account created</p>
        <p className="text-sm text-pretty text-muted-foreground">
          {form.successMessage}
        </p>
      </div>
    )
  }

  const passwordToggle = (
    <PasswordToggle
      shown={form.showPassword}
      onToggle={form.toggleShowPassword}
      label={form.showPassword ? "Hide passwords" : "Show passwords"}
    />
  )

  return (
    <AuthForm
      onSubmit={form.handleSubmit}
      submitLabel="Sign up"
      pending={form.pending}
      error={form.error}
    >
      <Field data-invalid={fieldErrors.username ? true : undefined}>
        <FloatingInput
          id="username"
          name="username"
          label="Username"
          autoComplete="username"
          autoFocus
          value={values.username}
          onChange={(e) => setValue("username", e.target.value)}
          aria-invalid={fieldErrors.username ? true : undefined}
        />
        <FieldError>{fieldErrors.username}</FieldError>
      </Field>

      <Field data-invalid={fieldErrors.nickname ? true : undefined}>
        <FloatingInput
          id="nickname"
          name="nickname"
          label="Nickname"
          autoComplete="nickname"
          value={values.nickname}
          onChange={(e) => setValue("nickname", e.target.value)}
          aria-invalid={fieldErrors.nickname ? true : undefined}
        />
        <FieldError>{fieldErrors.nickname}</FieldError>
      </Field>

      <Field data-invalid={fieldErrors.password ? true : undefined}>
        <FloatingInput
          id="password"
          name="password"
          label="Password"
          type={form.showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => setValue("password", e.target.value)}
          aria-invalid={fieldErrors.password ? true : undefined}
          endAdornment={passwordToggle}
        />
        <FieldError>{fieldErrors.password}</FieldError>
      </Field>

      <Field data-invalid={fieldErrors.confirmPassword ? true : undefined}>
        <FloatingInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          type={form.showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(e) => setValue("confirmPassword", e.target.value)}
          aria-invalid={fieldErrors.confirmPassword ? true : undefined}
          endAdornment={passwordToggle}
        />
        <FieldError>{fieldErrors.confirmPassword}</FieldError>
      </Field>
    </AuthForm>
  );
}
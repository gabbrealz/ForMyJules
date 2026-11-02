import { usePageTitle } from "#hooks/use-page-title"

import { AuthLayout } from "#layouts/auth-layout"
import { LoginForm } from "#features/auth"
import { APP_NAME } from "#config/brand"

export default function Login() {
  usePageTitle("Login")

  return (
    <AuthLayout
      title="Welcome back"
      description={`Log in to ${APP_NAME}.`}
      footer={{
        prompt: "Don't have an account?",
        linkLabel: "Sign up",
        to: "/signup",
      }}
    >
      <LoginForm />
    </AuthLayout>
  )
}

import { AuthLayout } from "#layouts/auth-layout"
import { SignupForm } from "#features/auth"
import { APP_NAME } from "#config/brand"

export default function Signup() {
  return (
    <AuthLayout
      title="Create your account"
      description={`Join ${APP_NAME}.`}
      footer={{
        prompt: "Already have an account?",
        linkLabel: "Log in",
        to: "/login",
      }}
    >
      <SignupForm />
    </AuthLayout>
  )
}

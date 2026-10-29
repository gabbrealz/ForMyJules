import { Navigate, Outlet, useLocation } from "react-router-dom"
import { Spinner } from "#components/ui/spinner"
import type { LoginRedirectState } from "./login-redirect.ts"
import { useAuth } from "./use-auth.ts"

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  // Don't redirect while the session is still being restored.
  if (status === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (status === "anonymous") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location } satisfies LoginRedirectState}
      />
    )
  }

  return <Outlet />
}

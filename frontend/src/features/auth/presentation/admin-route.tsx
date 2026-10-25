import { Navigate, Outlet } from "react-router-dom"
import { isAdmin } from "../domain/auth-user.ts"
import { useRequiredUser } from "./use-required-user.ts"

// Must be nested under <ProtectedRoute />, which guarantees a user.
export function AdminRoute({ redirectTo = "/home" }: { redirectTo?: string }) {
  const user = useRequiredUser()

  if (!isAdmin(user)) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}

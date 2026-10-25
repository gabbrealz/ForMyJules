import { useAuth } from "./use-auth.ts"

/** Non-null user for screens rendered under <ProtectedRoute />. */
export function useRequiredUser() {
  const { user } = useAuth()
  if (!user) {
    throw new Error("useRequiredUser must be used inside a <ProtectedRoute />")
  }
  return user
}

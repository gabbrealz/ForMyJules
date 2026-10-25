import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "./use-auth.ts"

export function useLogout(redirectTo = "/login") {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return useCallback(async () => {
    await logout()
    navigate(redirectTo, { replace: true })
  }, [logout, navigate, redirectTo])
}

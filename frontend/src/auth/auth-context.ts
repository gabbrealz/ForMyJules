import { createContext, useContext } from "react"

export type AuthUser = {
  username: string
  displayName: string
}

export type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider />")
  }
  return context
}

import { createContext, useContext } from "react"
import type { AuthUser } from "../types.ts"

export type AuthState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: AuthUser }
  | { status: "anonymous"; user: null }

export type AuthContextValue = AuthState & {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  /**
   * Creates a pending account. It does NOT sign the person in: an admin has to
   * approve it first. Resolves with the server's message to show them.
   */
  signup: (
    username: string,
    nickname: string,
    password: string
  ) => Promise<{ message: string }>
  /** Ends the session only. Use useLogout() when you also want to navigate. */
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider />")
  }
  return context
}
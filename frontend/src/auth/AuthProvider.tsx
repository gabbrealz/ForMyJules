import { useCallback, useMemo, useState, type ReactNode } from "react"
import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
} from "./auth-context.ts"

const STORAGE_KEY = "den.auth.user"

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function writeStoredUser(user: AuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage can be unavailable (private mode); the session just won't persist.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)

  const login = useCallback(async (username: string, password: string) => {
    const name = username.trim()
    if (!name || !password) {
      throw new Error("Enter your username and password.")
    }

    // TODO: replace this stub with a real request to your backend.
    // For now any non-empty username and password is accepted so the UI can be built.
    const next: AuthUser = {
      username: name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
    }
    writeStoredUser(next)
    setUser(next)
  }, [])

  const logout = useCallback(() => {
    writeStoredUser(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

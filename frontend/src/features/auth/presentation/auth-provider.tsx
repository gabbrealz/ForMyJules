import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { AuthApi, SessionStore } from "../application/ports.ts"
import {
  login as loginUseCase,
  logout as logoutUseCase,
  restoreSession,
  signup as signupUseCase,
} from "../application/use-cases.ts"
import type { Session } from "../domain/session.ts"
import {
  AuthContext,
  type AuthContextValue,
  type AuthState,
} from "./auth-context.ts"

const anonymous: AuthState = { status: "anonymous", user: null }

function fromSession(session: Session | null): AuthState {
  return session ? { status: "authenticated", user: session.user } : anonymous
}

type AuthProviderProps = {
  api: AuthApi
  store: SessionStore
  children: ReactNode
}

export function AuthProvider({ api, store, children }: AuthProviderProps) {
  const ports = useMemo(() => ({ api, store }), [api, store])

  // Paint instantly from the cached session; otherwise wait for the server.
  const [state, setState] = useState<AuthState>(() => {
    const cached = store.load()
    return cached ? fromSession(cached) : { status: "loading", user: null }
  })

  // Bumped by every login/signup/logout so a slow restore can't overwrite them.
  const epoch = useRef(0)

  useEffect(() => {
    const startedAt = epoch.current
    restoreSession(ports).then(
      (session) => {
        if (epoch.current === startedAt) setState(fromSession(session))
      },
      () => {
        // Server unreachable: keep a cached session, but don't spin forever.
        if (epoch.current === startedAt) {
          setState((prev) => (prev.status === "loading" ? anonymous : prev))
        }
      }
    )
  }, [ports])

  const login = useCallback(
    async (username: string, password: string) => {
      epoch.current += 1
      setState(fromSession(await loginUseCase(ports, username, password)))
    },
    [ports]
  )

  const signup = useCallback(
    async (username: string, nickname: string, password: string) => {
      epoch.current += 1
      setState(
        fromSession(await signupUseCase(ports, username, nickname, password))
      )
    },
    [ports]
  )

  const logout = useCallback(async () => {
    epoch.current += 1
    await logoutUseCase(ports)
    setState(anonymous)
  }, [ports])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: state.status === "authenticated",
      login,
      signup,
      logout,
    }),
    [state, login, signup, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

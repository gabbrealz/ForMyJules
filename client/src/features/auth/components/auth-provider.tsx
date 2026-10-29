import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  AuthContext,
  type AuthContextValue,
  type AuthState,
} from "../hooks/use-auth.ts"
import { authApi } from "../services/auth-api.ts"
import { sessionCache } from "../services/session-cache.ts"
import type { Session } from "../types.ts"

const anonymous: AuthState = { status: "anonymous", user: null }

function fromSession(session: Session | null): AuthState {
  return session ? { status: "authenticated", user: session.user } : anonymous
}

export function AuthProvider({ children }: { children: ReactNode }) {

  // Paint instantly from the cached session; otherwise wait for the server.
  const [state, setState] = useState<AuthState>(() => {
    const cached = sessionCache.load();
    return cached ? fromSession(cached) : { status: "loading", user: null }
  })

  // Bumped by every login/signup/logout so a slow restore can't overwrite them.
  const epoch = useRef(0)

  useEffect(() => {
    const startedAt = epoch.current
    authApi.getCurrentSession().then(
      (session) => {
        if (epoch.current !== startedAt) return;
        if (session) sessionCache.save(session);
        else sessionCache.clear();
        setState(fromSession(session));
      },
      () => {
        // Server unreachable: keep a cached session, but don't spin forever.
        if (epoch.current === startedAt) {
          setState((prev) => (prev.status === "loading" ? anonymous : prev));
        }
      }
    )
  }, [])

  const login = useCallback(
    async (username: string, password: string) => {
      epoch.current += 1
      const session = await authApi.login({ username: username.trim(), password });
      sessionCache.save(session);
      setState(fromSession(session));
    }, [])

  const signup = useCallback(
    async (username: string, nickname: string, password: string) => {
      epoch.current += 1
      const session = await authApi.signup({
        username: username.trim(),
        nickname: nickname.trim(),
        password,
      });
      sessionCache.save(session);
      setState(fromSession(session));
    }, [])

  const logout = useCallback(async () => {
    epoch.current += 1
    // Best effort: sign out locally even if the server can't be reached.
    await authApi.logout().catch(() => {})
    sessionCache.clear()
    setState(anonymous)
  }, [])

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

import type { ReactNode } from "react"
import {
  AuthProvider,
  LocalStorageSessionStore,
  StubAuthApi,
} from "../features/auth/index.ts"

// The only place adapters are chosen. Swap StubAuthApi for the HTTP adapter
// here once the backend exists.
const sessionStore = new LocalStorageSessionStore()
const authApi = new StubAuthApi(sessionStore)

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider api={authApi} store={sessionStore}>
      {children}
    </AuthProvider>
  )
}

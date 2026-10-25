// Domain
export type { AuthUser, Role } from "./domain/auth-user.ts"
export { isAdmin } from "./domain/auth-user.ts"
export type { Session } from "./domain/session.ts"
export { InvalidCredentialsError } from "./domain/credentials.ts"

// Ports (so src/app or another feature can type adapters)
export type { AuthApi, SessionStore } from "./application/ports.ts"

// Adapters: for the composition root in src/app only
export { LocalStorageSessionStore } from "./infrastructure/local-storage-session-store.ts"
export { StubAuthApi } from "./infrastructure/stub-auth-api.ts"

// Presentation
export { AuthProvider } from "./presentation/auth-provider.tsx"
export { useAuth } from "./presentation/use-auth.ts"
export { useRequiredUser } from "./presentation/use-required-user.ts"
export { useLogout } from "./presentation/use-logout.ts"
export { ProtectedRoute } from "./presentation/protected-route.tsx"
export { AdminRoute } from "./presentation/admin-route.tsx"

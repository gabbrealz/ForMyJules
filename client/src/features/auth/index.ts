export type { AuthUser, Role, User, UserRole } from "./types.ts"
export { isAdmin, canManagePhotos } from "./types.ts"

// Presentation
export { AuthProvider } from "./components/auth-provider.tsx"
export { ProtectedRoute } from "./components/protected-route.tsx"
export { AdminRoute } from "./components/admin-route.tsx"
export { LoginForm } from "./components/login-form.tsx"
export { SignupForm } from "./components/signup-form.tsx"

export { useAuth } from "./hooks/use-auth.ts"
export { useRequiredUser } from "./hooks/use-required-user.ts"
export { useLogout } from "./hooks/use-logout.ts"
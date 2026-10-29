import type { LoginCredentials, Session, SignupCredentials } from "../types.ts"
import { sessionCache } from "./session-cache.ts"

const deriveDisplayName = (username: string) =>
  username.charAt(0).toUpperCase() + username.slice(1)

// TODO: replace each method body with a call to `http` (#services/http-client),
// e.g. http.post<Session>("/api/auth/login", credentials). Throw real errors
// (e.g. "username already taken") from login/signup.
export const authApi = {
  async login({ username }: LoginCredentials): Promise<Session> {
    // Any non-empty username and password is accepted so the UI can be built.
    // Everyone is "admin" while stubbed so /admin keeps working as it does today.
    return {
      user: {
        username,
        displayName: deriveDisplayName(username),
        role: "admin",
      },
    }
  },

  async signup({ username, nickname }: SignupCredentials): Promise<Session> {
    // The account is "created" locally and the person is signed straight in.
    return {
      user: { username, displayName: nickname, role: "admin" },
    }
  },

  async getCurrentSession(): Promise<Session | null> {
    return sessionCache.load(); // stub only: no server, so read the cache
  },

  async logout(): Promise<void> {
    // Nothing to invalidate server-side while stubbed. AuthProvider clears the cache.
  },
}

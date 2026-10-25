import type {
  LoginCredentials,
  SignupCredentials,
} from "../domain/credentials.ts"
import type { Session } from "../domain/session.ts"

export interface AuthApi {
  login(credentials: LoginCredentials): Promise<Session>
  signup(credentials: SignupCredentials): Promise<Session>
  /** Resolves to null when there is no valid session (not an error). */
  getCurrentSession(): Promise<Session | null>
  logout(): Promise<void>
}

/** Client-side cache of the session, used for the first paint only. */
export interface SessionStore {
  load(): Session | null
  save(session: Session): void
  clear(): void
}

export type AuthPorts = {
  api: AuthApi
  store: SessionStore
}

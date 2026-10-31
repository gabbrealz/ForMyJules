import { http, HttpError, type RequestOptions } from "#services/http-client"
import type { LoginCredentials, Session, SignupCredentials, User } from "../types.ts"

export type SignupResponse = {
  message: string
  /** The new account, with role `pending_approval`. */
  user: User
}

// /api/auth
export const authApi = {
  /**
   * Creates a `pending_approval` account. No session is started: an admin has to
   * approve the account before the person can log in.
   * Errors: 409 (username taken), 400 (validation, see HttpError.details),
   * 429 (5 signups per IP per hour).
   */
  signup: (body: SignupCredentials, opts?: RequestOptions) =>
    http.post<SignupResponse>("/api/auth/signup", body, opts),

  /**
   * Starts a session (the server sets the httpOnly `sid` cookie).
   * Errors: 401 (bad credentials), 403 with code "pending_approval", 400,
   * 429 (10 failed attempts per IP within 15 minutes).
   */
  login: (body: LoginCredentials, opts?: RequestOptions) =>
    http.post<Session>("/api/auth/login", body, opts),

  /** Ends the session. Safe to call when logged out. */
  logout: (opts?: RequestOptions) =>
    http.post<void>("/api/auth/logout", undefined, opts),

  /** The current session, or null when logged out (401). Other failures still throw. */
  async getCurrentSession(opts?: RequestOptions): Promise<Session | null> {
    try {
      return await http.get<Session>("/api/auth/me", opts)
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) return null
      throw error
    }
  },
}

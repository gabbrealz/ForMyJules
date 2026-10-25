import type { AuthApi, SessionStore } from "../application/ports.ts"
import type {
  LoginCredentials,
  SignupCredentials,
} from "../domain/credentials.ts"
import { deriveDisplayName } from "../domain/display-name.ts"
import type { Session } from "../domain/session.ts"

// TODO: replace with an HTTP adapter against the Express backend. Real errors
// (e.g. "username already taken") should be thrown from login/signup.
export class StubAuthApi implements AuthApi {
  private readonly store: SessionStore

  // The stub has no server, so it stands in for the server-side session by
  // reading the locally stored one. That keeps "stay signed in after reload".
  constructor(store: SessionStore) {
    this.store = store
  }

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
  }

  async signup({ username, nickname }: SignupCredentials): Promise<Session> {
    // The account is "created" locally and the person is signed straight in.
    return {
      user: { username, displayName: nickname, role: "admin" },
    }
  }

  async getCurrentSession(): Promise<Session | null> {
    return this.store.load()
  }

  async logout(): Promise<void> {
    // Nothing to invalidate server-side; the use case clears the local store.
  }
}

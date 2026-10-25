import {
  parseLoginCredentials,
  parseSignupCredentials,
} from "../domain/credentials.ts"
import type { Session } from "../domain/session.ts"
import type { AuthPorts } from "./ports.ts"

export async function login(
  { api, store }: AuthPorts,
  username: string,
  password: string
): Promise<Session> {
  const credentials = parseLoginCredentials(username, password)
  const session = await api.login(credentials)
  store.save(session)
  return session
}

export async function signup(
  { api, store }: AuthPorts,
  username: string,
  nickname: string,
  password: string
): Promise<Session> {
  const credentials = parseSignupCredentials(username, nickname, password)
  const session = await api.signup(credentials)
  store.save(session)
  return session
}

export async function logout({ api, store }: AuthPorts): Promise<void> {
  try {
    await api.logout()
  } catch {
    // Best effort: if the server can't be reached the person must still be
    // signed out locally, otherwise the button would appear to do nothing.
  }
  store.clear()
}

export async function restoreSession({
  api,
  store,
}: AuthPorts): Promise<Session | null> {
  const session = await api.getCurrentSession()
  if (session) {
    store.save(session)
  } else {
    store.clear()
  }
  return session
}

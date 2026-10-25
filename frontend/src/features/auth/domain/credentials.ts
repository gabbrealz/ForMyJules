export type LoginCredentials = {
  username: string
  password: string
}

export type SignupCredentials = {
  username: string
  nickname: string
  password: string
}

export class InvalidCredentialsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InvalidCredentialsError"
  }
}

export function parseLoginCredentials(
  username: string,
  password: string
): LoginCredentials {
  const name = username.trim()
  // The password is intentionally not trimmed: spaces can be part of it.
  if (!name || !password) {
    throw new InvalidCredentialsError("Enter your username and password.")
  }
  return { username: name, password }
}

export function parseSignupCredentials(
  username: string,
  nickname: string,
  password: string
): SignupCredentials {
  const name = username.trim()
  const nick = nickname.trim()
  if (!name || !nick || !password) {
    throw new InvalidCredentialsError(
      "Fill in all the fields to create your account."
    )
  }
  return { username: name, nickname: nick, password }
}

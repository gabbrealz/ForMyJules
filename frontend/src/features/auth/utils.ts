import type { Location } from "react-router-dom";

export const MIN_USERNAME_LENGTH = 3
export const MIN_PASSWORD_LENGTH = 8
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]+$/

export type SignupField =
  | "username"
  | "nickname"
  | "password"
  | "confirmPassword"
export type SignupValues = Record<SignupField, string>
export type SignupFieldErrors = Partial<Record<SignupField, string>>

export function validateSignup(values: SignupValues): SignupFieldErrors {
  const errors: SignupFieldErrors = {}
  const username = values.username.trim()

  if (!username) {
    errors.username = "Choose a username."
  } else if (username.length < MIN_USERNAME_LENGTH) {
    errors.username = `Username must be at least ${MIN_USERNAME_LENGTH} characters.`
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username =
      "Use only letters, numbers, dots, dashes and underscores."
  }

  if (!values.nickname.trim()) {
    errors.nickname = "Tell us what to call you."
  }

  if (!values.password) {
    errors.password = "Create a password."
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm your password."
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Passwords don't match."
  }

  return errors
}


export const DEFAULT_POST_LOGIN_PATH = "/home"

/** What <ProtectedRoute /> puts in location.state when it sends someone to /login. */
export type LoginRedirectState = {
  from: Pick<Location, "pathname" | "search" | "hash">
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : ""
}

// location.state is untyped at runtime (history can hold anything), so it is
// validated instead of cast. Only in-app absolute paths are accepted: "//host"
// would be read as a protocol-relative URL.
export function getPostLoginPath(state: unknown): string {
  if (!isRecord(state)) return DEFAULT_POST_LOGIN_PATH
  const { from } = state
  if (!isRecord(from)) return DEFAULT_POST_LOGIN_PATH

  const { pathname, search, hash } = from
  if (
    typeof pathname !== "string" ||
    !pathname.startsWith("/") ||
    pathname.startsWith("//")
  ) {
    return DEFAULT_POST_LOGIN_PATH
  }

  return pathname + stringOrEmpty(search) + stringOrEmpty(hash)
}


export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

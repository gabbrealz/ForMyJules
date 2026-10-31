import type { Location } from "react-router-dom";
import { HttpError } from "#services/http-client"

// These mirror the API's rules (API.md > POST /api/auth/signup). The server
// lowercases usernames, so uppercase letters are fine to type.
export const MIN_USERNAME_LENGTH = 3
export const MAX_USERNAME_LENGTH = 30
export const MAX_NICKNAME_LENGTH = 32
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_BYTES = 72 // bcrypt limit, counted in UTF-8 bytes
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/

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
  } else if (username.length > MAX_USERNAME_LENGTH) {
    errors.username = `Username can be at most ${MAX_USERNAME_LENGTH} characters.`
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username = "Use only letters, numbers and underscores."
  }

  const nickname = values.nickname.trim()
  if (!nickname) {
    errors.nickname = "Tell us what to call you."
  } else if (nickname.length > MAX_NICKNAME_LENGTH) {
    errors.nickname = `Nickname can be at most ${MAX_NICKNAME_LENGTH} characters.`
  }

  if (!values.password) {
    errors.password = "Create a password."
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  } else if (new TextEncoder().encode(values.password).length > MAX_PASSWORD_BYTES) {
    errors.password = "Password is too long. Try a shorter one."
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
  // A 400 from the API lists what was wrong with each field.
  if (error instanceof HttpError && error.details.length > 0) {
    return error.details.map((issue) => issue.message).join(" ")
  }
  return error instanceof Error ? error.message : fallback
}

/**
 * Maps a failed signup request onto the form's fields where possible, e.g. a 409
 * "username taken" goes under the username box. Empty when it isn't a field problem.
 */
export function signupFieldErrorsFromApi(error: unknown): SignupFieldErrors {
  if (!(error instanceof HttpError)) return {}
  if (error.status === 409) return { username: error.message }

  const errors: SignupFieldErrors = {}
  for (const { field, message } of error.details) {
    if (field === "username" || field === "nickname" || field === "password") {
      errors[field] ??= message
    }
  }
  return errors
}
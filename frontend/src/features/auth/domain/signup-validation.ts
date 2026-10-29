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

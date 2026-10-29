import { useState, type SubmitEvent } from "react"
import {
  DEFAULT_POST_LOGIN_PATH,
  errorMessage,
  validateSignup,
  type SignupField,
  type SignupFieldErrors,
  type SignupValues,
} from "../utils.ts"
import { useAuth } from "./use-auth.ts"

const FALLBACK_ERROR = "Couldn't create your account. Please try again."

const EMPTY_VALUES: SignupValues = {
  username: "",
  nickname: "",
  password: "",
  confirmPassword: "",
}

export function useSignupForm() {
  const { isAuthenticated, signup } = useAuth()

  const [values, setValues] = useState<SignupValues>(EMPTY_VALUES)
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function setValue(name: SignupField, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
    // Clear a field's error as soon as the person starts fixing it.
    setFieldErrors((current) =>
      current[name] ? { ...current, [name]: undefined } : current
    )
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const errors = validateSignup(values)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setPending(true)
    try {
      await signup(values.username, values.nickname, values.password)
      // On success the auth state flips and the redirect in the page takes over.
    } catch (err) {
      setError(errorMessage(err, FALLBACK_ERROR))
    } finally {
      setPending(false)
    }
  }

  return {
    values,
    setValue,
    fieldErrors,
    showPassword,
    toggleShowPassword: () => setShowPassword((shown) => !shown),
    error,
    pending,
    handleSubmit,
    /** Where to send an already-authenticated visitor, or null to show the form. */
    redirectTo: isAuthenticated ? DEFAULT_POST_LOGIN_PATH : null,
  }
}

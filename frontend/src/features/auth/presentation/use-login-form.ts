import { useState, type SubmitEvent } from "react"
import { useLocation } from "react-router-dom"
import { errorMessage } from "./error-message.ts"
import { getPostLoginPath } from "./login-redirect.ts"
import { useAuth } from "./use-auth.ts"

const FALLBACK_ERROR = "Couldn't log you in. Check your details and try again."

export function useLoginForm() {
  const { isAuthenticated, login } = useAuth()
  const location = useLocation()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Send people back to the page they were trying to reach (path, query and hash).
  const redirectTo = isAuthenticated ? getPostLoginPath(location.state) : null

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(errorMessage(err, FALLBACK_ERROR))
    } finally {
      setPending(false)
    }
  }

  return {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    toggleShowPassword: () => setShowPassword((shown) => !shown),
    error,
    pending,
    handleSubmit,
    /** Where to send an already-authenticated visitor, or null to show the form. */
    redirectTo,
  }
}

import { useState } from "react"

/**
 * Keeps the last non-null value around after `value` goes back to null, so a
 * dialog can keep rendering its content while the close animation plays.
 *
 * `session` increments each time the dialog is (re)opened or pointed at a
 * different value. Use it in a `key` to reset form state between openings.
 */
export function useRetainedValue<T>(value: T | null) {
  const [previous, setPrevious] = useState<T | null>(value)
  const [retained, setRetained] = useState<T | null>(value)
  const [session, setSession] = useState(0)

  // Adjusting state while rendering is React's documented way to derive state
  // from props without an extra effect pass.
  if (previous !== value) {
    setPrevious(value)
    if (value !== null) {
      setRetained(value)
      setSession((current) => current + 1)
    }
  }

  return { value: value ?? retained, session }
}

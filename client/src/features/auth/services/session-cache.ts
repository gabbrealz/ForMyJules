import { isSession, type Session } from "../types.ts"

const STORAGE_KEY = "den.auth.session"

export const sessionCache = {
  load(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      // Validate: stored data may be stale or from an older shape.
      const parsed: unknown = JSON.parse(raw)
      return isSession(parsed) ? parsed : null
    } catch {
      return null
    }
  },

  save(session: Session): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {
      // Storage can be unavailable (private mode); the session just won't persist.
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Same as save: nothing to clear if storage is unavailable.
    }
  },
}

import type { ReactNode } from "react"

import { BoothSessionContext } from "./booth-session-context"
import { useBoothSession } from "./use-booth-session"

/**
 * Joins the shared photobooth session for as long as it is mounted. Mount it only in "with
 * others" mode: solo never opens the session.
 */
export function BoothSessionProvider({ children }: { children: ReactNode }) {
  const session = useBoothSession(true)
  return (
    <BoothSessionContext.Provider value={session}>
      {children}
    </BoothSessionContext.Provider>
  )
}

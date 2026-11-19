import { createContext, useContext } from "react"

import type { BoothSession } from "./use-booth-session"

/** Holds the one session of the group photobooth. Null outside <BoothSessionProvider>. */
export const BoothSessionContext = createContext<BoothSession | null>(null)

/** The group session. Only usable below <BoothSessionProvider>, i.e. in "with others" mode. */
export function useBoothSessionContext(): BoothSession {
  const session = useContext(BoothSessionContext)
  if (session === null) {
    throw new Error(
      "useBoothSessionContext must be used inside <BoothSessionProvider> (the 'with others' photobooth).",
    )
  }
  return session
}

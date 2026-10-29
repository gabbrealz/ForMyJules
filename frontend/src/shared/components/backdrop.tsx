import type { ReactNode } from "react"

import { BACKDROP_IMAGE } from "#lib/brand"

// Full-screen photo backdrop shared by the landing and login pages.
// The brown wash keeps cream text readable on top of any photo you swap in.
export function Backdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-svh overflow-hidden bg-brown">
      <img
        src={BACKDROP_IMAGE}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 size-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-brown/90 via-brown/50 to-brown/30" />
      {children}
    </div>
  )
}

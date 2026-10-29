import { useNavigate } from "react-router-dom"

import { useAuth } from "../features/auth/index.ts"
import { Backdrop } from "@shared/components/backdrop.tsx"
import { Brand } from "#components/brand"
import { Button } from "#components/ui/button"

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  return (
    <Backdrop>
      <div className="relative mx-auto flex min-h-svh w-full max-w-6xl flex-col px-6 py-8 sm:px-10">
        <header>
          <Brand className="text-cream" />
        </header>

        <div className="mt-auto pt-24 pb-10 motion-safe:animate-in motion-safe:duration-700 motion-safe:fade-in motion-safe:slide-in-from-bottom-4 sm:pb-16">
          <h1 className="max-w-3xl font-heading text-5xl leading-[1.05] font-extrabold tracking-tight text-balance text-cream sm:text-7xl">
            A cozy corner of the internet, just for the two of us.
          </h1>
          <p className="mt-5 max-w-md text-base text-pretty text-cream/85 sm:text-lg">
            Photos, songs, scrapbooks and a few small surprises, kept safe in
            one place.
          </p>
          <Button
            size="lg"
            className="mt-8 h-12 rounded-full bg-vanilla px-7 text-base font-semibold text-brown hover:bg-apricot"
            onClick={() => navigate(isAuthenticated ? "/home" : "/login")}
          >
            Proceed
          </Button>
        </div>
      </div>
    </Backdrop>
  )
}

import type { ReactNode } from "react"

import { Badge } from "#components/ui/badge"

type AdminPageProps = {
  title: string
  description: string
  count?: number
  children: ReactNode
}

// Shared frame for the admin pages: heading, short description and a count pill.
// On desktop the layout is locked to the viewport height, so the page scrolls itself.
export function AdminPage({
  title,
  description,
  count,
  children,
}: AdminPageProps) {
  return (
    <div className="w-full md:h-svh md:overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
        <header className="mb-6 space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {title}
            </h1>
            {count !== undefined && <Badge variant="secondary">{count}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </header>
        {children}
      </div>
    </div>
  )
}

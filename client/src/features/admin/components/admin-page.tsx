import type { ReactNode } from "react"

import { Badge } from "#components/ui/badge"
import { PageShell } from "#layouts/page-shell"

type AdminPageProps = {
  title: string
  description: string
  count?: number
  children: ReactNode
}

// Shared frame for the admin pages: heading, short description and a count pill.
// fitViewport locks the page to the space below the header on desktop, so it
// scrolls itself.
export function AdminPage({
  title,
  description,
  count,
  children,
}: AdminPageProps) {
  return (
    <PageShell
      fitViewport
      title={title}
      subtitle={description}
      badge={
        count === undefined ? undefined : (
          <Badge variant="secondary" className="py-3 text-base">
            {count}
          </Badge>
        )
      }
    >
      {children}
    </PageShell>
  )
}

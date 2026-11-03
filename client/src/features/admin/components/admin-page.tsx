import type { ReactNode } from "react"

import PageHeader from "#components/page-header"
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
      <div className="mx-auto flex w-full max-w-6xl flex-col p-4 md:p-8">
        <PageHeader title={title} subtitle={description} badge={
          count === undefined ? undefined : <Badge variant="secondary" className="text-base py-3">{count}</Badge>
        }/>
        {children}
      </div>
    </div>
  )
}

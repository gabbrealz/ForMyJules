import type { ReactNode } from "react"
import { cn } from "cn"

import PageHeader from "#components/page-header"

type PageShellProps = {
  /** Page title. Omit it for a page that draws its own heading. */
  title?: string
  subtitle?: string
  /** Shown next to the title (e.g. a count). */
  badge?: ReactNode
  /**
   * For pages whose size depends on the viewport (the scrapbook book). On md+
   * the shell takes exactly the space below the header and scrolls inside
   * itself, with a stable scrollbar gutter and no horizontal overflow, so a
   * scrollbar appearing can't resize the page's contents.
   */
  fitViewport?: boolean
  /**
   * With fitViewport, for a page that wants the whole space (the scrapbook's
   * full screen): no max width, tighter padding, and the content box is exactly
   * as tall as the shell, so children can fill it with flex-1 min-h-0 and be
   * measured instead of guessed at.
   */
  fill?: boolean
  /** Extra classes for the content container, e.g. "max-w-4xl" to narrow it. */
  className?: string
  children?: ReactNode
}

/**
 * The frame every in-app page sits in: centered container, page padding and
 * the page title. It doesn't render <main>; SidebarInset (the layout) already is.
 */
export function PageShell({
  title,
  subtitle,
  badge,
  fitViewport = false,
  fill = false,
  className,
  children,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col",
        fitViewport &&
          "overflow-x-hidden md:h-[calc(100svh-var(--header-height))] md:overflow-y-auto md:[scrollbar-gutter:stable]",
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col",
          fill ? "min-h-0 max-w-none p-4" : "max-w-6xl p-4 md:p-8",
          className,
        )}
      >
        {title && <PageHeader title={title} subtitle={subtitle} badge={badge} />}
        {children}
      </div>
    </div>
  )
}

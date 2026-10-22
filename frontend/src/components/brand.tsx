import { cn } from "cn"
import { CatIcon } from "lucide-react"

import { APP_NAME } from "#lib/brand"

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-apricot text-brown">
        <CatIcon className="size-5" />
      </span>
      <span className="truncate font-heading text-lg font-bold tracking-tight">
        {APP_NAME}
      </span>
    </div>
  )
}

import { cn } from "cn"

import logo from "#assets/brand/calico_cat.png"
import { APP_NAME } from "#config/brand"

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <span className="overflow-hidden flex justify-center items-center p-1.5 bg-peach-200 border border-peach-300 rounded-md">
        <img src={logo} alt="Logo" className="size-7 drop-shadow-[0_0_2px_rgba(0,0,0,0.33)]" />
      </span>
      <span className="truncate font-heading text-lg font-bold tracking-tight">
        {APP_NAME}
      </span>
    </div>
  )
}

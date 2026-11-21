import { cn } from "cn"

import logo from "#assets/brand/calico_cat.png"
import { APP_NAME } from "#config/brand"

interface BrandProps {
  variant?: "default" | "square" | "icon";
  className?: string;
  iconClassName?: string;
}

export function Brand({ className, iconClassName, variant="default" }: BrandProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <BrandIcon variant={variant} className={iconClassName} />
      <span className="truncate font-heading text-lg font-bold tracking-tight">
        {APP_NAME}
      </span>
    </div>
  )
}

interface BrandIconProps {
  variant: "default" | "square" | "icon";
  className?: string;
}

export function BrandIcon({ variant, className }: BrandIconProps) {
  if (variant === "icon") {
    return (
      <img src={logo} alt="Logo" className={cn(
        "size-7 drop-shadow-[0_0_2px_rgba(0,0,0,0.33)]",
        className
      )}/>
    )
  }
  return (
    <span className={cn(
      "overflow-hidden size-10 flex justify-center items-center p-1.5 bg-peach-200 border border-peach-300",
      variant === "default" ? "rounded-full p-2" : "rounded-sm",
      className
    )}>
      <img src={logo} alt="Logo" className="size-full drop-shadow-[0_0_2px_rgba(0,0,0,0.33)]" />
    </span>
  )
}

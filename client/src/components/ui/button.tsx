"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { useRipple } from "#hooks/use-ripple"

/**
 * Material-style "state layer": a currentColor overlay that fades in on
 * hover (8%), keyboard focus (10%), press (10%) and when a menu is open.
 */
const stateLayer =
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-current before:opacity-0 before:transition-opacity before:duration-200 before:ease-out hover:before:opacity-[0.08] focus-visible:before:opacity-10 active:before:opacity-10 aria-expanded:before:opacity-[0.08] motion-reduce:before:transition-none"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Brightness, not a bg-color change: css paints a gradient over
        // `[data-slot="button"].bg-primary`, which would hide the color change.
        default:
          "bg-primary text-primary-foreground hover:brightness-115 active:brightness-95",
        outline: [
          stateLayer,
          "border-border bg-background shadow-xs dark:border-input dark:bg-input/30",
        ],
        secondary: [stateLayer, "bg-secondary text-secondary-foreground"],
        ghost: [stateLayer],
        destructive: [
          stateLayer,
          "bg-destructive/10 text-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40",
        ],
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        lg: "h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  hasRipple = false,
  children,
  onPointerDown,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & { hasRipple?: boolean }) {
  const ripple = useRipple<HTMLButtonElement>()

  // The hook's handlers do nothing without the layer, so they stay attached
  // even when `hasRipple` is false.

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      onPointerDown={(event) => {
        onPointerDown?.(event)
        ripple.handlers.onPointerDown(event)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        ripple.handlers.onKeyDown(event)
      }}
      onKeyUp={(event) => {
        onKeyUp?.(event)
        ripple.handlers.onKeyUp(event)
      }}
      onBlur={(event) => {
        onBlur?.(event)
        ripple.handlers.onBlur(event)
      }}
      {...props}
    >
      {children}
      {hasRipple && (
        <span
          ref={ripple.layerRef}
          aria-hidden="true"
          data-slot="button-ripple"
          className="pointer-events-none absolute inset-0 isolate overflow-hidden rounded-[inherit]"
        />
      )}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }

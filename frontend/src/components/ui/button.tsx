"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/* -------------------------------------------------------------------------- */
/*  Ripple tuning (Material 3 values)                                          */
/* -------------------------------------------------------------------------- */

const RIPPLE_OPACITY = 0.16 // peak opacity of the ripple (uses currentColor)
const RIPPLE_GROW_MS = 450 // how long the circle takes to reach full size
const RIPPLE_FADE_MS = 350 // fade-out after release
const RIPPLE_MIN_PRESS_MS = 225 // quick taps still show the ripple for this long
const RIPPLE_EASING = "cubic-bezier(0.2, 0, 0, 1)" // MD3 "emphasized decelerate"

/**
 * Spawns a ripple inside `host` and returns a `release` function.
 * The ripple grows from the press point to the farthest corner, holds while
 * the pointer/key is down, then fades out on release.
 * Coordinates are viewport (client) coords; omit them to ripple from the center.
 */
function startRipple(
  host: HTMLElement,
  clientX?: number,
  clientY?: number
): () => void {
  const noop = () => {}

  if (
    typeof window === "undefined" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return noop
  }

  const rect = host.getBoundingClientRect()
  const x = clientX === undefined ? rect.width / 2 : clientX - rect.left
  const y = clientY === undefined ? rect.height / 2 : clientY - rect.top
  const radius = Math.hypot(
    Math.max(x, rect.width - x),
    Math.max(y, rect.height - y)
  )

  const ripple = document.createElement("span")
  if (typeof ripple.animate !== "function") return noop

  Object.assign(ripple.style, {
    position: "absolute",
    left: `${x - radius}px`,
    top: `${y - radius}px`,
    width: `${radius * 2}px`,
    height: `${radius * 2}px`,
    borderRadius: "9999px",
    backgroundColor: "currentColor",
    opacity: String(RIPPLE_OPACITY),
    pointerEvents: "none",
    willChange: "transform, opacity",
  })
  host.appendChild(ripple)

  ripple.animate(
    [{ transform: "scale(0.3)" }, { transform: "scale(1)" }],
    { duration: RIPPLE_GROW_MS, easing: RIPPLE_EASING, fill: "forwards" }
  )

  const startedAt = performance.now()
  let released = false

  return () => {
    if (released) return
    released = true

    const wait = Math.max(
      0,
      RIPPLE_MIN_PRESS_MS - (performance.now() - startedAt)
    )
    window.setTimeout(() => {
      const fade = ripple.animate(
        [{ opacity: RIPPLE_OPACITY }, { opacity: 0 }],
        { duration: RIPPLE_FADE_MS, easing: "linear", fill: "forwards" }
      )
      fade.onfinish = () => ripple.remove()
      fade.oncancel = () => ripple.remove()
    }, wait)
  }
}

const isInert = (el: HTMLElement) =>
  el.matches(":disabled, [aria-disabled='true'], [data-disabled]")

/* -------------------------------------------------------------------------- */
/*  Variants                                                                   */
/* -------------------------------------------------------------------------- */

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
        default: [stateLayer, "bg-primary text-primary-foreground"],
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
        // Links keep their underline hover and get no ripple.
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

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

function Button({
  className,
  variant = "default",
  size = "default",
  children,
  onPointerDown,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const rippleLayerRef = React.useRef<HTMLSpanElement>(null)
  const releaseKeyRippleRef = React.useRef<(() => void) | null>(null)

  const endKeyRipple = () => {
    releaseKeyRippleRef.current?.()
    releaseKeyRippleRef.current = null
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(event)

    const host = event.currentTarget
    const layer = rippleLayerRef.current
    if (!layer || event.button !== 0 || isInert(host)) return

    const release = startRipple(layer, event.clientX, event.clientY)

    // Hold the ripple until the pointer lifts, leaves, or is cancelled.
    const endEvents = ["pointerup", "pointerleave", "pointercancel"] as const
    const done = () => {
      endEvents.forEach((name) => host.removeEventListener(name, done))
      release()
    }
    endEvents.forEach((name) => host.addEventListener(name, done))
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event)

    const layer = rippleLayerRef.current
    if (
      !layer ||
      event.repeat ||
      event.target !== event.currentTarget ||
      (event.key !== "Enter" && event.key !== " ") ||
      isInert(event.currentTarget)
    ) {
      return
    }

    endKeyRipple()
    releaseKeyRippleRef.current = startRipple(layer) // from the center
  }

  function handleKeyUp(event: React.KeyboardEvent<HTMLButtonElement>) {
    onKeyUp?.(event)
    if (event.key === "Enter" || event.key === " ") endKeyRipple()
  }

  function handleBlur(event: React.FocusEvent<HTMLButtonElement>) {
    onBlur?.(event)
    endKeyRipple()
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={handleBlur}
      {...props}
    >
      {children}
      {variant !== "link" && (
        <span
          ref={rippleLayerRef}
          aria-hidden="true"
          data-slot="button-ripple"
          className="pointer-events-none absolute inset-0 isolate overflow-hidden rounded-[inherit]"
        />
      )}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }

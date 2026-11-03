import { useCallback, useEffect, useMemo, useRef } from "react"
import { Link } from "react-router-dom"
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useAnimationControls,
  type Variants,
} from "framer-motion"
import { cn } from "cn"
import type { LucideIcon } from "lucide-react"

import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "#components/ui/sidebar"

import { useRipple } from "../hooks/use-ripple"

// ─── Icon personalities ──────────────────────────────────────────────────────
// Every icon gets its own little move on hover and a shared squish on click.
// Each keyframe list starts and ends on the resting value, so the icon always
// lands back where it began. Amplitudes are kept small so the motion reads as
// a nudge rather than a performance.

const REST = { y: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0 }

const PRESS = {
  scale: [1, 0.88, 1.08, 1],
  transition: { duration: 0.4, ease: "easeOut" },
}

const ICON_MOTION = {
  // Squash-and-stretch hop.
  hop: {
    rest: REST,
    press: PRESS,
    hover: {
      y: [0, -3.5, 0, -1.5, 0],
      scaleX: [1, 0.95, 1.07, 0.99, 1],
      scaleY: [1, 1.07, 0.92, 1.02, 1],
      transition: {
        duration: 0.7,
        ease: "easeOut",
        times: [0, 0.28, 0.52, 0.78, 1],
      },
    },
  },
  // Photos fanning out.
  fan: {
    rest: REST,
    press: PRESS,
    hover: {
      rotate: [0, -10, 7, -3, 0],
      scale: [1, 1.09, 1.12, 1.05, 1],
      transition: { duration: 0.7, ease: "easeInOut" },
    },
  },
  // Lub-dub.
  heartbeat: {
    rest: REST,
    press: PRESS,
    hover: {
      scale: [1, 1.1, 1, 1.16, 1],
      rotate: [0, -3.0, 0, 3.0, 0],
      transition: {
        duration: 0.8,
        ease: "easeInOut",
        times: [0, 0.2, 0.4, 0.65, 1],
      },
    },
  },
  // Shutter click.
  snap: {
    rest: REST,
    press: PRESS,
    hover: {
      scale: [1, 0.9, 1.1, 1],
      rotate: [0, -4.5, 3.5, 0],
      transition: { duration: 0.5, ease: "easeOut", times: [0, 0.25, 0.6, 1] },
    },
  },
  // A note swaying to the beat.
  sway: {
    rest: REST,
    press: PRESS,
    hover: {
      rotate: [0, -9, 8, -5, 3, 0],
      y: [0, -1.5, 0, -1, 0, 0],
      transition: { duration: 0.9, ease: "easeInOut" },
    },
  },
  // One full turn of the wheel. A turn has to be 360° to land back on rest, so
  // it's scaled down by being quicker, and the click is a snappy turn with a
  // small bump instead of a double spin.
  spin: {
    rest: REST,
    hover: {
      rotate: [0, 360],
      transition: { duration: 0.75, ease: "easeInOut" },
    },
    press: {
      rotate: [0, 360],
      scale: [1, 1.1, 1],
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  },
  // Side-to-side waddle.
  waddle: {
    rest: REST,
    press: PRESS,
    hover: {
      rotate: [0, -4.5, 4.5, -4.5, 4.5, 0],
      y: [0, -1, 0, -1, 0, 0],
      transition: { duration: 0.7, ease: "easeInOut" },
    },
  },
  // Springy pop.
  pop: {
    rest: REST,
    press: PRESS,
    hover: {
      scale: [1, 1.16, 0.97, 1.04, 1],
      rotate: [0, -4, 2, 0, 0],
      transition: { duration: 0.6, ease: "easeOut" },
    },
  },
} satisfies Record<string, Variants>

export type NavPersonality = keyof typeof ICON_MOTION

/**
 * Plays an icon animation once, all the way through, even if the pointer leaves
 * early. Hovers are ignored while something is already playing so quickly
 * sweeping the mouse down the list doesn't make the icons jitter; a click always
 * interrupts.
 */
function useIconPlayer() {
  const controls = useAnimationControls()
  const token = useRef(0)
  const busy = useRef(false)
  const alive = useRef(false)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const play = useCallback(
    async (name: "hover" | "press") => {
      if (!alive.current) return
      if (name === "hover" && busy.current) return
      const id = ++token.current
      busy.current = true
      await controls.start(name)
      // Only the latest animation resets state (an interrupted one stops here).
      if (alive.current && id === token.current) {
        controls.set("rest")
        busy.current = false
      }
    },
    [controls],
  )

  return useMemo(() => ({ controls, play }), [controls, play])
}

// ─── Nav item ────────────────────────────────────────────────────────────────

type NavItemProps = {
  to: string
  label: string
  icon: LucideIcon
  /** Which little animation the icon plays. */
  personality: NavPersonality
  isActive: boolean
  onNavigate?: () => void
  badge?: number
}

const SPRING_OVERSHOOT = "ease-[cubic-bezier(0.34,1.56,0.64,1)]"

export function NavItem({
  to,
  label,
  icon: Icon,
  personality,
  isActive,
  onNavigate,
  badge,
}: NavItemProps) {
  const { controls, play } = useIconPlayer()
  // Links activate on Enter only (Space scrolls the page), so only Enter ripples.
  const ripple = useRipple<HTMLButtonElement>({ keys: ["Enter"] })
  const hasBadge = badge !== undefined && badge > 0

  return (
    <MotionConfig reducedMotion="user">
      {/* Fixed 40px row, so the 32px collapsed button sits centered where the
            full-height one was and every item keeps its position. */}
      <SidebarMenuItem className="group/nav-item flex h-10 items-center justify-center">
        <SidebarMenuButton
          render={<Link to={to} />}
          isActive={isActive}
          // Shown on hover only while the sidebar is collapsed to icons.
          tooltip={label}
          // The default hover/active fill is replaced by the layers below, so
          // the button itself stays transparent.
          className={cn(
            "group/nav relative isolate h-10 overflow-visible! rounded-xl bg-transparent! px-3 transition-none hover:bg-transparent! active:bg-transparent!",
            hasBadge && "pr-10",
          )}
          {...ripple.handlers}
          onClick={() => {
            onNavigate?.()
            void play("press")
          }}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") void play("hover")
          }}
          onFocus={(event) => {
            if (event.currentTarget.matches(":focus-visible"))
              void play("hover")
          }}
        >
          {/* Active pill: each item owns its own. It grows in when the item
              becomes active and shrinks away when it stops being active.
              `initial={false}` keeps it from animating on first render. */}
          <AnimatePresence initial={false}>
            {isActive && (
              <motion.span
                aria-hidden
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute inset-0 -z-10 rounded-xl bg-sidebar-accent shadow-xs"
              />
            )}
          </AnimatePresence>

          {/* State layer: a tint of the text color that fades in on hover (8%),
              keyboard focus and press (10%). Sits over the pill when active. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-current opacity-0 transition-opacity duration-200 ease-out group-hover/nav:opacity-[0.08] group-focus-visible/nav:opacity-10 group-active/nav:opacity-10 motion-reduce:transition-none"
          />

          {/* Click ripple: drawn here from the press point, clipped to the
              item's rounded shape and kept behind the icon and label. */}
          <span
            ref={ripple.layerRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]"
          />

          <span className="relative flex min-w-0 flex-1 items-center gap-2 overflow-visible! group-data-[collapsible=icon]:justify-center transition-transform duration-150 ease-out group-active/nav:scale-[0.97] motion-reduce:transition-none motion-reduce:transform-none">
            <motion.span
              variants={ICON_MOTION[personality]}
              initial="rest"
              animate={controls}
              className="grid size-5 shrink-0 place-items-center"
            >
              <Icon className="size-4.5" />
            </motion.span>
            <span
              className={cn(
                "truncate transition-transform duration-300 group-data-[collapsible=icon]:hidden motion-reduce:transition-none",
                SPRING_OVERSHOOT,
                "motion-safe:group-hover/nav:translate-x-0.5",
              )}
            >
              {label}
            </span>
          </span>
        </SidebarMenuButton>

        {hasBadge && (
          <SidebarMenuBadge
            className={cn(
              "top-2.5 rounded-full bg-apricot text-brown transition-transform duration-300 motion-reduce:transition-none",
              SPRING_OVERSHOOT,
              "motion-safe:group-hover/nav-item:-rotate-6 motion-safe:group-hover/nav-item:scale-110",
            )}
          >
            {badge}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    </MotionConfig>
  )
}

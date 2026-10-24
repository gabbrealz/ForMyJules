import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  MotionConfig,
  motion,
  useAnimationControls,
  useReducedMotion,
  type Variants,
} from "framer-motion"
import { cn } from "cn"
import type { LucideIcon } from "lucide-react"

import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "#components/ui/sidebar"

// ─── Icon personalities ──────────────────────────────────────────────────────
// Every icon gets its own little move on hover and a shared squish on click.
// Each keyframe list starts and ends on the resting value, so the icon always
// lands back where it began.

const REST = { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0 }

const PRESS = {
  scale: [1, 0.74, 1.2, 1],
  transition: { duration: 0.4, ease: "easeOut" },
}

const ICON_MOTION = {
  // Squash-and-stretch hop.
  hop: {
    rest: REST,
    press: PRESS,
    hover: {
      y: [0, -7, 0, -3, 0],
      scaleX: [1, 0.9, 1.14, 0.98, 1],
      scaleY: [1, 1.14, 0.84, 1.04, 1],
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
      rotate: [0, -14, 10, -5, 0],
      scale: [1, 1.18, 1.18, 1.1, 1],
      transition: { duration: 0.7, ease: "easeInOut" },
    },
  },
  // Lub-dub.
  heartbeat: {
    rest: REST,
    press: PRESS,
    hover: {
      scale: [1, 1.25, 1, 1.3, 1],
      rotate: [0, -5, 0, 5, 0],
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
      scale: [1, 0.8, 1.2, 1],
      rotate: [0, -9, 7, 0],
      transition: { duration: 0.5, ease: "easeOut", times: [0, 0.25, 0.6, 1] },
    },
  },
  // A note swaying to the beat.
  sway: {
    rest: REST,
    press: PRESS,
    hover: {
      rotate: [0, -18, 16, -10, 6, 0],
      y: [0, -3, 0, -2, 0, 0],
      transition: { duration: 0.9, ease: "easeInOut" },
    },
  },
  // One full turn of the wheel; clicking gives it a bigger spin.
  spin: {
    rest: REST,
    hover: {
      rotate: [0, 360],
      transition: { duration: 0.95, ease: "easeInOut" },
    },
    press: {
      rotate: [0, 720],
      scale: [1, 1.2, 1],
      transition: { duration: 0.9, ease: "easeInOut" },
    },
  },
  // Side-to-side waddle.
  waddle: {
    rest: REST,
    press: PRESS,
    hover: {
      rotate: [0, -9, 9, -9, 9, 0],
      y: [0, -2, 0, -2, 0, 0],
      transition: { duration: 0.7, ease: "easeInOut" },
    },
  },
  // Springy pop.
  pop: {
    rest: REST,
    press: PRESS,
    hover: {
      scale: [1, 1.32, 0.94, 1.08, 1],
      rotate: [0, -8, 4, 0, 0],
      transition: { duration: 0.6, ease: "easeOut" },
    },
  },
  // Nudges backwards.
  backslide: {
    rest: REST,
    hover: {
      x: [0, -5, 2, 0],
      transition: { duration: 0.5, ease: "easeOut" },
    },
    press: {
      x: [0, -9, 0],
      transition: { duration: 0.35, ease: "easeOut" },
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
    [controls]
  )

  return useMemo(() => ({ controls, play }), [controls, play])
}

// ─── Click burst ─────────────────────────────────────────────────────────────

const BURST = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
  const large = i % 2 === 0
  const distance = large ? 17 : 13
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    large,
  }
})

// Six tiny dots that pop outward from the icon and fade.
function Burst() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {BURST.map(({ x, y, large }, i) => (
        <motion.span
          key={i}
          className={cn(
            "absolute top-1/2 left-1/2 rounded-full",
            large ? "-m-[2.5px] size-[5px] bg-ring" : "-m-[1.5px] size-[3px] bg-primary"
          )}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x, y, scale: [0, 1.2, 0], opacity: [1, 1, 0] }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
      ))}
    </span>
  )
}

// ─── Nav item ────────────────────────────────────────────────────────────────

type NavItemProps = {
  to: string
  label: string
  icon: LucideIcon
  /** Which little animation the icon plays. */
  personality: NavPersonality
  isActive: boolean
  /**
   * Id for the sliding "you are here" pill. Items in the same list share one id
   * so the pill glides between them; use a different id per sidebar.
   */
  pillId: string
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
  pillId,
  onNavigate,
  badge,
}: NavItemProps) {
  const reduceMotion = useReducedMotion()
  const { controls, play } = useIconPlayer()
  const [burst, setBurst] = useState(0)
  const hasBadge = badge !== undefined && badge > 0

  return (
    <MotionConfig reducedMotion="user">
      <SidebarMenuItem className="group/nav-item">
        <SidebarMenuButton
          render={<Link to={to} />}
          isActive={isActive}
          // The default hover/active fill is replaced by the layers below, so
          // the button itself stays transparent.
          className={cn(
            "group/nav relative isolate h-10 overflow-visible! rounded-xl bg-transparent! px-3 hover:bg-transparent! active:bg-transparent!",
            hasBadge && "pr-10"
          )}
          onClick={() => {
            onNavigate?.()
            void play("press")
            if (!reduceMotion) setBurst((n) => n + 1)
          }}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") void play("hover")
          }}
          onFocus={(event) => {
            if (event.currentTarget.matches(":focus-visible")) void play("hover")
          }}
        >
          {/* Active pill: one shared element that springs from item to item. */}
          {isActive && (
            <motion.span
              layoutId={pillId}
              aria-hidden
              transition={{ type: "spring", stiffness: 520, damping: 40 }}
              className="absolute inset-0 -z-10 rounded-xl bg-sidebar-accent shadow-xs"
            />
          )}

          {/* Hover wash: grows in from the left. */}
          {!isActive && (
            <span
              aria-hidden
              className="absolute inset-0 -z-10 origin-left scale-x-90 rounded-xl bg-sidebar-accent/60 opacity-0 transition duration-200 ease-out group-hover/nav:scale-x-100 group-hover/nav:opacity-100 motion-reduce:transition-none"
            />
          )}

          <span className="relative flex min-w-0 flex-1 items-center gap-2 overflow-visible! transition-transform duration-150 ease-out group-active/nav:scale-[0.97] motion-reduce:transition-none motion-reduce:transform-none">
            <motion.span
              variants={ICON_MOTION[personality]}
              initial="rest"
              animate={controls}
              className="relative grid size-5 shrink-0 place-items-center"
            >
              <Icon className="size-4.5" />
              {burst > 0 && <Burst key={burst} />}
            </motion.span>
            <span
              className={cn(
                "truncate transition-transform duration-300 motion-reduce:transition-none",
                SPRING_OVERSHOOT,
                "motion-safe:group-hover/nav:translate-x-0.5"
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
              "motion-safe:group-hover/nav-item:-rotate-6 motion-safe:group-hover/nav-item:scale-110"
            )}
          >
            {badge}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    </MotionConfig>
  )
}

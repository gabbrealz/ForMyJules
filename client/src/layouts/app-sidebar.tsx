import type { ComponentProps } from "react"
import { useLocation } from "react-router-dom"
import {
  BookHeartIcon,
  CameraIcon,
  FerrisWheelIcon,
  HouseIcon,
  ImagesIcon,
  MusicIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  UserRoundCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { usePendingCount } from "#features/admin"
import { useAuth } from "#features/auth"
import { isAdmin } from "../features/auth/types.ts"
import { cn } from "cn"

import { NavItem, type NavPersonality } from "#components/nav-item"
import { useRipple } from "#hooks/use-ripple"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarMenu,
  SidebarSeparator,
  useSidebar,
} from "#components/ui/sidebar"

type AppNavItem = {
  label: string
  to: string
  icon: LucideIcon
  personality: NavPersonality
}

const NAV_ITEMS: AppNavItem[] = [
  { label: "Home", to: "/home", icon: HouseIcon, personality: "hop" },
  { label: "Gallery", to: "/gallery", icon: ImagesIcon, personality: "fan" },
  {
    label: "Scrapbook",
    to: "/scrapbook",
    icon: BookHeartIcon,
    personality: "heartbeat",
  },
  {
    label: "Photobooth",
    to: "/photobooth",
    icon: CameraIcon,
    personality: "snap",
  },
  { label: "Music Locker", to: "/music", icon: MusicIcon, personality: "sway" },
  {
    label: "Spin the Wheel",
    to: "/spin-the-wheel",
    icon: FerrisWheelIcon,
    personality: "spin",
  },
]

// Only shown to admins, after the items above.
const ADMIN_NAV_ITEMS: (AppNavItem & { showPendingCount?: boolean })[] = [
  {
    label: "Users",
    to: "/admin/users",
    icon: UsersIcon,
    personality: "waddle",
  },
  {
    label: "Registrations",
    to: "/admin/pending",
    icon: UserRoundCheckIcon,
    personality: "pop",
    showPendingCount: true,
  },
]

const isActivePath = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(`${to}/`)

// Its own component so the pending-count request is only made for admins.
function AdminNavGroup({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate: () => void
}) {
  const pendingCount = usePendingCount()

  return (
    <SidebarGroup>
      {/* Collapsed: the label hides itself, so a divider marks where the group starts. */}
      <SidebarSeparator className="mb-2 hidden bg-sidebar-foreground/30 h-[1.5px] rounded-full group-data-[collapsible=icon]:block" />
      <SidebarGroupLabel>Admin</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-2!">
          {ADMIN_NAV_ITEMS.map(({ showPendingCount, ...item }) => (
            <NavItem
              key={item.to}
              {...item}
              badge={showPendingCount ? pendingCount || undefined : undefined}
              isActive={isActivePath(pathname, item.to)}
              onNavigate={onNavigate}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { isMobile, setOpenMobile, open, toggleSidebar } = useSidebar()
  const ripple = useRipple<HTMLButtonElement>()

  function closeMobileSidebar() {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarGroupLabel>App</SidebarGroupLabel>
            <SidebarMenu className="gap-2!">
              {NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.to}
                  {...item}
                  isActive={isActivePath(pathname, item.to)}
                  onNavigate={closeMobileSidebar}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && isAdmin(user) && (
          <AdminNavGroup pathname={pathname} onNavigate={closeMobileSidebar} />
        )}
      </SidebarContent>
      {/* Desktop only: the phone sidebar is a slide-over, there's nothing to collapse.
        Right-aligned while expanded; centered on the icon rail (same axis as the
        nav icons) once collapsed, with a divider under it. */}
      {!isMobile && (
        <SidebarFooter className="gap-2 p-2">
          <SidebarSeparator className="hidden bg-sidebar-foreground/30 h-[1.5px] rounded-full group-data-[collapsible=icon]:block" />
          <div className={cn("flex", open ? "justify-end" : "justify-center")}>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
              aria-expanded={open}
              {...ripple.handlers}
              className="relative isolate flex size-8 cursor-pointer items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            >
              <span
                ref={ripple.layerRef}
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit] text-sidebar-foreground"
              />
              {open ? (
                <PanelLeftCloseIcon className="size-4.5" />
              ) : (
                <PanelLeftOpenIcon className="size-4.5" />
              )}
            </button>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
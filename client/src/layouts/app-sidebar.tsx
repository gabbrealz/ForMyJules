import type { ComponentProps } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  BookHeartIcon,
  CameraIcon,
  ChevronsUpDownIcon,
  FerrisWheelIcon,
  HouseIcon,
  ImagesIcon,
  LogOutIcon,
  MusicIcon,
  UserIcon,
  UserRoundCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { usePendingCount } from "#features/admin"
import { useAuth, useLogout } from "#features/auth"
import { isAdmin } from "../features/auth/types.ts"
import { Brand } from "#components/brand"
import { NavItem, type NavPersonality } from "#components/nav-item"
import { Avatar, AvatarFallback } from "#components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
    label: "Pending Registrations",
    to: "/admin/pending",
    icon: UserRoundCheckIcon,
    personality: "pop",
    showPendingCount: true,
  },
]

const isActivePath = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(`${to}/`)

function ProfileAvatar({
  name,
  size,
}: {
  name: string
  size?: "default" | "lg"
}) {
  return (
    <Avatar size={size}>
      <AvatarFallback className="bg-apricot font-heading font-semibold text-brown">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}

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
  const navigate = useNavigate()
  const { user } = useAuth()
  const logout = useLogout("/")
  const { isMobile, setOpenMobile } = useSidebar()

  const displayName = user?.nickname ?? "Guest"
  const username = user?.username ?? "guest"

  function closeMobileSidebar() {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar {...props}>
      {/* Collapsed: only the brand's first child (its icon) stays. */}
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        <div className="min-w-0 group-data-[collapsible=icon]:[&>*>:not(:first-child)]:hidden">
          <Brand className="text-sidebar-foreground" />
        </div>
      </SidebarHeader>

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

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:px-3.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="rounded-xl transition-none"
                  />
                }
              >
                <ProfileAvatar name={displayName} />
                <div className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-medium">
                    {displayName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    @{username}
                  </span>
                </div>
                <ChevronsUpDownIcon className="ml-auto" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={8}
                className="w-64 rounded-xl"
              >
                {/* Mini profile card */}
                <div className="flex items-center gap-3 rounded-lg bg-secondary p-3">
                  <ProfileAvatar name={displayName} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate font-heading text-sm font-semibold">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{username}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="py-2"
                  onClick={() => {
                    closeMobileSidebar()
                    navigate("/profile")
                  }}
                >
                  <UserIcon />
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  className="py-2"
                  onClick={logout}
                >
                  <LogOutIcon />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

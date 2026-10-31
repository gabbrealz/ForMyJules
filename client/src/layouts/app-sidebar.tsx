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
  type LucideIcon,
} from "lucide-react"

import { useAuth, useLogout } from "../features/auth/index.ts"
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "#components/ui/sidebar"

const NAV_ITEMS: {
  label: string
  to: string
  icon: LucideIcon
  personality: NavPersonality
}[] = [
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

function ProfileAvatar({ name, size }: { name: string; size?: "default" | "lg" }) {
  return (
    <Avatar size={size}>
      <AvatarFallback className="bg-apricot font-heading font-semibold text-brown">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
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
      <SidebarHeader className="p-4">
        <Brand className="text-sidebar-foreground" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {/* gap-2! = a bit more air between items (was gap-1) */}
            <SidebarMenu className="gap-2!">
              {NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.to}
                  {...item}
                  pillId="app-nav-pill"
                  isActive={
                    pathname === item.to || pathname.startsWith(`${item.to}/`)
                  }
                  onNavigate={closeMobileSidebar}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<SidebarMenuButton size="lg" className="rounded-xl" />}
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
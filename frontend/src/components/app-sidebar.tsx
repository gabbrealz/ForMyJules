import type { ComponentProps } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
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
} from "lucide-react"

import { useAuth } from "../auth/auth-context.ts"
import { Brand } from "#components/brand"
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

const NAV_ITEMS = [
  { label: "Home", to: "/home", icon: HouseIcon },
  { label: "Gallery", to: "/gallery", icon: ImagesIcon },
  { label: "Scrapbook", to: "/scrapbook", icon: BookHeartIcon },
  { label: "Photobooth", to: "/photobooth", icon: CameraIcon },
  { label: "Music Locker", to: "/music", icon: MusicIcon },
  { label: "Spin the Wheel", to: "/spin-the-wheel", icon: FerrisWheelIcon },
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
  const { user, logout } = useAuth()
  const { isMobile, setOpenMobile } = useSidebar()

  const displayName = user?.displayName ?? "Guest"
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
            <SidebarMenu>
              {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    render={<Link to={to} />}
                    isActive={pathname === to || pathname.startsWith(`${to}/`)}
                    onClick={closeMobileSidebar}
                    className="h-10 rounded-xl px-3"
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
                  onClick={() => {
                    logout()
                    navigate("/", { replace: true })
                  }}
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

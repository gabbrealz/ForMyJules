import type { ComponentProps } from "react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "cn"
import {
  ArrowLeftIcon,
  UserRoundCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { Brand } from "#components/brand"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "#components/ui/sidebar"
import { PENDING_REGISTRATIONS } from "../../pages/admin/mock-data.ts"

type NavItem = {
  label: string
  to: string
  icon: LucideIcon
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { label: "Users", to: "/admin/users", icon: UsersIcon },
  {
    label: "Pending Registrations",
    to: "/admin/pending",
    icon: UserRoundCheckIcon,
    // TODO: replace with the real pending count from your backend.
    badge: PENDING_REGISTRATIONS.length,
  },
]

export function AdminSidebar(props: ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

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
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ label, to, icon: Icon, badge }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    render={<Link to={to} />}
                    isActive={pathname === to || pathname.startsWith(`${to}/`)}
                    onClick={closeMobileSidebar}
                    className={cn(
                      "h-10 rounded-xl px-3",
                      badge !== undefined && "pr-10"
                    )}
                  >
                    <Icon />
                    <span className="truncate">{label}</span>
                  </SidebarMenuButton>
                  {badge !== undefined && badge > 0 && (
                    <SidebarMenuBadge className="top-2.5 rounded-full bg-apricot text-brown">
                      {badge}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link to="/home" />}
              onClick={closeMobileSidebar}
              className="h-10 rounded-xl px-3"
            >
              <ArrowLeftIcon />
              <span>Back to app</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

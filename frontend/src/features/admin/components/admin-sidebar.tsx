import type { ComponentProps } from "react"
import { useLocation } from "react-router-dom"
import {
  ArrowLeftIcon,
  UserRoundCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { Brand } from "#components/brand"
import { NavItem, type NavPersonality } from "#components/nav-item"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "#components/ui/sidebar"
import { PENDING_REGISTRATIONS } from "../services/mock-data.ts"

type AdminNavItem = {
  label: string
  to: string
  icon: LucideIcon
  personality: NavPersonality
  badge?: number
}

const NAV_ITEMS: AdminNavItem[] = [
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
            <SidebarMenu className="gap-2!">
              {NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.to}
                  {...item}
                  pillId="admin-nav-pill"
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
          <NavItem
            to="/home"
            label="Back to app"
            icon={ArrowLeftIcon}
            personality="backslide"
            pillId="admin-footer-pill"
            isActive={false}
            onNavigate={closeMobileSidebar}
          />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

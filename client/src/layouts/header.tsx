import { Link, useNavigate } from "react-router-dom"
import { ChevronDownIcon, LogOutIcon, UserIcon } from "lucide-react"
import { cn } from "cn"

import { useAuth, useLogout } from "#features/auth"
import { Brand } from "#components/brand"
import { Avatar, AvatarFallback } from "#components/ui/avatar"
import { Button } from "#components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import { SidebarTrigger, useSidebar } from "#components/ui/sidebar"

function ProfileAvatar({
  name,
  size,
}: {
  name: string
  size?: "sm" | "default" | "lg"
}) {
  return (
    <Avatar size={size}>
      <AvatarFallback className="bg-apricot font-heading font-semibold text-brown">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}

// The profile card that used to live in the sidebar footer: avatar + name as
// the trigger, and the mini profile card, "View Profile" and "Logout" in the menu.
function ProfileMenu() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const logout = useLogout("/")

  const displayName = user?.nickname ?? "Guest"
  const username = user?.username ?? "guest"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-11 gap-2.5 rounded-xl px-2 transition-none"
          />
        }
      >
        <ProfileAvatar name={displayName} />
        {/* On narrow screens only the avatar shows; the text stays for screen readers. */}
        <span className="grid min-w-0 text-left leading-tight max-sm:sr-only">
          <span className="truncate text-sm">{displayName}</span>
          <span className="-translate-y-0.5 truncate text-xs text-muted-foreground">
            @{username}
          </span>
        </span>
        <ChevronDownIcon className="size-4 text-muted-foreground max-sm:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
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
        <DropdownMenuItem className="px-4 py-2" onClick={() => navigate("/profile")}>
          <UserIcon />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          className="px-4 py-2 rounded-b-xl"
          onClick={logout}
        >
          <LogOutIcon />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * App header: brand on the left, profile menu on the right. On phones it also
 * carries the button that opens the slide-over sidebar. Must be rendered
 * inside <SidebarProvider>.
 *
 * Its height is the `--header-height` CSS variable (see globals.css), so
 * anything that has to fit "the viewport minus the header" can use the same
 * value.
 */
export function Header({ className }: { className?: string }) {
  const { isMobile } = useSidebar()

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-sidebar-border bg-header px-3 text-sidebar-foreground backdrop-blur sm:px-4",
        className,
      )}
    >
      {isMobile && <SidebarTrigger />}

      <Link
        to="/"
        className="flex min-w-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Brand />
      </Link>

      <div className="ml-auto">
        <ProfileMenu />
      </div>
    </header>
  )
}

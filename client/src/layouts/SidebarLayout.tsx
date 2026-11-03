import { useLayoutEffect } from "react"
import { ChevronsLeftIcon } from "lucide-react"
import { Outlet } from "react-router-dom"
import { usePanelRef } from "react-resizable-panels"
import { AppSidebar } from "#layouts/app-sidebar"
import { cn } from "cn"
import { Brand } from "#components/brand"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "#components/ui/resizable"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "#components/ui/sidebar"
import { useIsMobile } from "#hooks/use-mobile"

// Sidebar width limits (px) on desktop.
const SIDEBAR_DEFAULT_WIDTH = "260px"
const SIDEBAR_MIN_WIDTH = "220px"
const SIDEBAR_MAX_WIDTH = "380px"
// Icons only. A nav icon is centered 30px from the sidebar's left edge when
// expanded (8px group padding + 12px item padding + half the 20px icon), so a
// 60px rail keeps every icon exactly where it was.
const SIDEBAR_COLLAPSED_WIDTH = "60px"

// Sits inside <SidebarProvider> so it can read the open state. The sidebar
// state (collapse button, Ctrl/Cmd+B) and the panel follow each other:
// toggling the state collapses or expands the panel, and dragging the panel
// shut (or back open) updates the state.
function ResizableShell() {
  const { open, setOpen, toggleSidebar } = useSidebar()
  const panelRef = usePanelRef()

  // Layout effect: the panel resizes in the same frame as the sidebar's state
  // change, so there's no frame of expanded styles squeezed into the narrow rail.
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    if (open && panel.isCollapsed()) panel.expand()
    else if (!open && !panel.isCollapsed()) panel.collapse()
  }, [open, panelRef])

  return (
    <ResizablePanelGroup orientation="horizontal">
      <ResizablePanel
        id="sidebar"
        panelRef={panelRef}
        collapsible
        collapsedSize={SIDEBAR_COLLAPSED_WIDTH}
        defaultSize={SIDEBAR_DEFAULT_WIDTH}
        minSize={SIDEBAR_MIN_WIDTH}
        maxSize={SIDEBAR_MAX_WIDTH}
        groupResizeBehavior="preserve-pixel-size"
        onResize={() => {
          const collapsed = panelRef.current?.isCollapsed()
          if (collapsed !== undefined && collapsed === open) setOpen(!collapsed)
        }}
      >
        <AppSidebar collapsible="panel" />
      </ResizablePanel>
      {/* Zero-width anchor on the sidebar's right edge, so the button rides the
          edge while the panel is resized (a button inside the panel would be
          clipped by it). top-15 centers it on the bottom of the brand header. */}
      <div className="relative z-20 w-0 shrink-0">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          className="absolute top-15 left-0 flex size-6 -translate-x-1/2 cursor-pointer! items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_*]:cursor-pointer!"
        >
          <ChevronsLeftIcon
            className={cn(
              "size-3.5 transition-transform duration-200 motion-reduce:transition-none",
              !open && "rotate-180",
            )}
          />
        </button>
      </div>
      <ResizableHandle withHandle />
      <ResizablePanel id="content">
        <SidebarInset className="min-h-full">
          <Outlet />
        </SidebarInset>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default function SidebarLayout() {
  const isMobile = useIsMobile()

  // Phones get the stock slide-over sidebar; resizing only makes sense on desktop.
  if (isMobile) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur">
            <SidebarTrigger />
            <Brand className="text-foreground" />
          </header>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <ResizableShell />
    </SidebarProvider>
  )
}

import { useLayoutEffect } from "react"
import { Outlet } from "react-router-dom"
import { usePanelRef } from "react-resizable-panels"
import { AppSidebar } from "#layouts/app-sidebar"
import { Header } from "#layouts/header"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "#components/ui/resizable"
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "#components/ui/sidebar"
import { useIsMobile } from "#hooks/use-mobile"

// Sidebar width limits (px) on desktop.
const SIDEBAR_DEFAULT_WIDTH = "240px"
const SIDEBAR_MIN_WIDTH = "200px"
const SIDEBAR_MAX_WIDTH = "300px"
// Icons only. A nav icon is centered 30px from the sidebar's left edge when
// expanded (8px group padding + 12px item padding + half the 20px icon), so a
// 60px rail keeps every icon exactly where it was.
const SIDEBAR_COLLAPSED_WIDTH = "68px"

// Sits inside <SidebarProvider> so it can read the open state. The sidebar
// state (collapse button, Ctrl/Cmd+B) and the panel follow each other:
// toggling the state collapses or expands the panel, and dragging the panel
// shut (or back open) updates the state.
function ResizableShell() {
  const { open, setOpen } = useSidebar()
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
  // The header sticks to the top of the page, which scrolls normally.
  if (isMobile) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    )
  }

  // Desktop: the header spans the full width, and the sidebar + content take
  // whatever height is left below it.
  return (
    <SidebarProvider className="h-svh flex-col overflow-hidden">
      <Header />
      <div className="min-h-0 flex-1">
        <ResizableShell />
      </div>
    </SidebarProvider>
  )
}

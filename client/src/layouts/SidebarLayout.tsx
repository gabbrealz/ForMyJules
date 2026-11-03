import { useEffect } from "react"
import { Outlet } from "react-router-dom"
import { usePanelRef } from "react-resizable-panels"
import { AppSidebar } from "#layouts/app-sidebar"
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
// Icons only; matches SIDEBAR_WIDTH_ICON (3rem) in the sidebar component.
const SIDEBAR_COLLAPSED_WIDTH = "48px"

// Sits inside <SidebarProvider> so it can read the open state. The sidebar
// state (collapse button, Ctrl/Cmd+B) and the panel follow each other:
// toggling the state collapses or expands the panel, and dragging the panel
// shut (or back open) updates the state.
function ResizableShell() {
  const { open, setOpen } = useSidebar()
  const panelRef = usePanelRef()

  useEffect(() => {
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

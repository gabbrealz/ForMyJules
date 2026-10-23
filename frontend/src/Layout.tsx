import type { ComponentProps, ComponentType } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '#components/app-sidebar';
import { Brand } from '#components/brand';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '#components/ui/resizable';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#components/ui/sidebar';
import { useIsMobile } from '#hooks/use-mobile';

// Sidebar width limits (px) on desktop.
const SIDEBAR_DEFAULT_WIDTH = '260px';
const SIDEBAR_MIN_WIDTH = '220px';
const SIDEBAR_MAX_WIDTH = '380px';

type SidebarComponent = ComponentType<ComponentProps<typeof Sidebar>>;

// `sidebar` lets a route group (e.g. /admin) reuse this shell with its own navigation.
export default function Layout({
  sidebar: SidebarNav = AppSidebar,
}: {
  sidebar?: SidebarComponent;
}) {
  const isMobile = useIsMobile();

  // Phones get the stock slide-over sidebar; resizing only makes sense on desktop.
  if (isMobile) {
    return (
      <SidebarProvider>
        <SidebarNav />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur">
            <SidebarTrigger />
            <Brand className="text-foreground" />
          </header>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel
          id="sidebar"
          defaultSize={SIDEBAR_DEFAULT_WIDTH}
          minSize={SIDEBAR_MIN_WIDTH}
          maxSize={SIDEBAR_MAX_WIDTH}
          groupResizeBehavior="preserve-pixel-size"
        >
          <SidebarNav collapsible="none" className="w-full" />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="content">
          <SidebarInset className="min-h-full">
            <Outlet />
          </SidebarInset>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  );
}

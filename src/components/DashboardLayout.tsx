import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AIAssistant } from "@/components/AIAssistant";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { OrderQuickViewProvider, useOrderQuickView } from "@/components/common/OrderQuickView";

function OrderSearchTrigger() {
  const quickView = useOrderQuickView();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        quickView?.openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quickView]);

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 text-muted-foreground"
      onClick={() => quickView?.openSearch()}
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Buscar pedido</span>
      <kbd className="hidden md:inline pointer-events-none rounded border bg-muted px-1.5 font-mono text-[10px]">
        {isMac ? "⌘" : "Ctrl"} K
      </kbd>
    </Button>
  );
}

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <OrderQuickViewProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-14 flex items-center justify-between border-b px-4 bg-card">
              <div className="flex items-center">
                <SidebarTrigger className="mr-4" />
                <h1 className="text-lg font-semibold text-foreground">Bionovations SAS</h1>
              </div>
              <div className="flex items-center gap-2">
                <OrderSearchTrigger />
                <NotificationBell />
              </div>
            </header>
            <main className="flex-1 p-6">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </main>
          </div>
          <AIAssistant />
        </div>
      </OrderQuickViewProvider>
    </SidebarProvider>
  );
}

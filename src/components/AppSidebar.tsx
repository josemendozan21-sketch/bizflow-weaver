import { Home, ShoppingCart, Factory, Truck, Calculator, Package, Palette, Shield, DollarSign, CalendarDays } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessRoute } from "@/lib/rolePermissions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { getRoleLabel } from "@/lib/rolePermissions";

const items = [
  { title: "Inicio", url: "/", icon: Home },
  { title: "Ventas", url: "/ventas", icon: ShoppingCart },
  { title: "Inventarios", url: "/inventarios", icon: Package },
  { title: "Diseño de logos", url: "/diseno-logos", icon: Palette },
  { title: "Producción", url: "/produccion", icon: Factory },
  { title: "Logística", url: "/logistica", icon: Truck },
  { title: "Contabilidad", url: "/contabilidad", icon: Calculator },
  { title: "Costos", url: "/costos", icon: DollarSign },
  { title: "Eventos", url: "/eventos", icon: CalendarDays },
  { title: "Usuarios", url: "/admin-usuarios", icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role, user, signOut } = useAuth();

  const visibleItems = items.filter((item) => canAccessRoute(role, item.url));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">B</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-sidebar-foreground">Bionovations</h2>
              <p className="text-xs text-sidebar-foreground/60">Panel interno</p>
            </div>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-md bg-sidebar-primary flex items-center justify-center mx-auto">
            <span className="text-sidebar-primary-foreground font-bold text-sm">B</span>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
            {role && (
              <div className="text-xs font-medium text-sidebar-foreground">
                {getRoleLabel(role)}
              </div>
            )}
            <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="mx-auto" onClick={signOut} title="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

import { Home, ShoppingCart, Factory, Truck, Calculator, Package, Palette } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Inicio", url: "/", icon: Home },
  { title: "Ventas", url: "/ventas", icon: ShoppingCart },
  { title: "Producción", url: "/produccion", icon: Factory },
  { title: "Logística", url: "/logistica", icon: Truck },
  { title: "Contabilidad", url: "/contabilidad", icon: Calculator },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

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
              {items.map((item) => (
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
    </Sidebar>
  );
}

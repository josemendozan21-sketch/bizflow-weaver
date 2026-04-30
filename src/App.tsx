import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { canAccessRoute, getAllowedRoutes } from "@/lib/rolePermissions";
import Index from "./pages/Index";
import Ventas from "./pages/Ventas";
import Inventarios from "./pages/Inventarios";
import DisenoLogos from "./pages/DisenoLogos";
import Produccion from "./pages/Produccion";
import Logistica from "./pages/Logistica";
import Contabilidad from "./pages/Contabilidad";
import Auth from "./pages/Auth";
import AdminUsuarios from "./pages/AdminUsuarios";
import Costos from "./pages/Costos";
import Eventos from "./pages/Eventos";
import Ferias from "./pages/Ferias";
import Galeria from "./pages/Galeria";
import FeriaPOS from "./pages/FeriaPOS";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";
import { ReactNode } from "react";

const queryClient = new QueryClient();

function getDefaultRoute(role: Parameters<typeof getAllowedRoutes>[0]): string {
  if (!role) return "/";
  const routes = getAllowedRoutes(role);
  return routes[0] || "/";
}

function LoadingScreen() {
  const handleCleanAndReload = async () => {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <p className="text-muted-foreground">Cargando...</p>
        <button className="text-sm font-medium text-primary hover:underline" onClick={handleCleanAndReload}>
          Limpiar caché y reintentar
        </button>
      </div>
    </div>
  );
}

function NoRoleScreen() {
  const { signOut, user } = useAuth();

  const handleRetry = async () => {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Usuario sin permisos asignados</h1>
        <p className="text-sm text-muted-foreground">
          La cuenta {user?.email ? `(${user.email}) ` : ""}ya inició sesión, pero todavía no tiene un rol activo. Pide al administrador que le asigne un rol.
        </p>
        <div className="flex flex-col items-center gap-2">
          <button className="text-sm font-medium text-primary hover:underline" onClick={handleRetry}>Reintentar permisos</button>
          <button className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline" onClick={signOut}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, path }: { children: ReactNode; path: string }) {
  const { role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!role) return <NoRoleScreen />;
  if (!canAccessRoute(role, path)) return <Navigate to={getDefaultRoute(role)} replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!role) return <NoRoleScreen />;
  if (role === "admin") return <Index />;
  return <Navigate to={getDefaultRoute(role)} replace />;
}

function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Auth />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/install" element={<Install />} />
            <Route path="*" element={
              <AuthGate>
                <Routes>
                  <Route element={<DashboardLayout />}>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/ventas" element={<ProtectedRoute path="/ventas"><Ventas /></ProtectedRoute>} />
                <Route path="/inventarios" element={<ProtectedRoute path="/inventarios"><Inventarios /></ProtectedRoute>} />
                <Route path="/diseno-logos" element={<ProtectedRoute path="/diseno-logos"><DisenoLogos /></ProtectedRoute>} />
                <Route path="/produccion" element={<ProtectedRoute path="/produccion"><Produccion /></ProtectedRoute>} />
                <Route path="/logistica" element={<ProtectedRoute path="/logistica"><Logistica /></ProtectedRoute>} />
                <Route path="/contabilidad" element={<ProtectedRoute path="/contabilidad"><Contabilidad /></ProtectedRoute>} />
                <Route path="/admin-usuarios" element={<ProtectedRoute path="/admin-usuarios"><AdminUsuarios /></ProtectedRoute>} />
                <Route path="/costos" element={<ProtectedRoute path="/costos"><Costos /></ProtectedRoute>} />
                <Route path="/eventos" element={<ProtectedRoute path="/eventos"><Eventos /></ProtectedRoute>} />
                <Route path="/ferias" element={<ProtectedRoute path="/ferias"><Ferias /></ProtectedRoute>} />
                <Route path="/galeria" element={<ProtectedRoute path="/galeria"><Galeria /></ProtectedRoute>} />
                <Route path="/feria-pos" element={<ProtectedRoute path="/feria-pos"><FeriaPOS /></ProtectedRoute>} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthGate>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

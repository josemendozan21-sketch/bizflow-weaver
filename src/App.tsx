import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { canAccessRoute } from "@/lib/rolePermissions";
import Index from "./pages/Index";
import Ventas from "./pages/Ventas";
import Inventarios from "./pages/Inventarios";
import DisenoLogos from "./pages/DisenoLogos";
import Produccion from "./pages/Produccion";
import Logistica from "./pages/Logistica";
import Contabilidad from "./pages/Contabilidad";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { ReactNode } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ children, path }: { children: ReactNode; path: string }) {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (!canAccessRoute(role, path)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Cargando...</p></div>;
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
          <AuthGate>
            <Routes>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/ventas" element={<ProtectedRoute path="/ventas"><Ventas /></ProtectedRoute>} />
                <Route path="/inventarios" element={<ProtectedRoute path="/inventarios"><Inventarios /></ProtectedRoute>} />
                <Route path="/diseno-logos" element={<ProtectedRoute path="/diseno-logos"><DisenoLogos /></ProtectedRoute>} />
                <Route path="/produccion" element={<ProtectedRoute path="/produccion"><Produccion /></ProtectedRoute>} />
                <Route path="/logistica" element={<ProtectedRoute path="/logistica"><Logistica /></ProtectedRoute>} />
                <Route path="/contabilidad" element={<ProtectedRoute path="/contabilidad"><Contabilidad /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthGate>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

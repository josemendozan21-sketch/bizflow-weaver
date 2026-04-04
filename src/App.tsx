import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Ventas from "./pages/Ventas";
import Inventarios from "./pages/Inventarios";
import DisenoLogos from "./pages/DisenoLogos";
import Produccion from "./pages/Produccion";
import Logistica from "./pages/Logistica";
import Contabilidad from "./pages/Contabilidad";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/produccion" element={<Produccion />} />
            <Route path="/logistica" element={<Logistica />} />
            <Route path="/contabilidad" element={<Contabilidad />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

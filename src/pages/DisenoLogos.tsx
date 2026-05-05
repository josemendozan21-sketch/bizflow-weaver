import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLogoRequests } from "@/hooks/useLogoRequests";
import { NuevasSolicitudes } from "@/components/diseno/NuevasSolicitudes";
import { TrabajoDisenador } from "@/components/diseno/TrabajoDisenador";
import { AprobacionAsesor } from "@/components/diseno/AprobacionAsesor";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const DisenoLogos = () => {
  const { data: requests = [], isLoading } = useLogoRequests();
  const { role } = useAuth();
  const isEstampacion = role === "estampacion";
  const [estampSearch, setEstampSearch] = useState("");

  const filteredForEstampacion = useMemo(() => {
    const q = estampSearch.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      [r.client_name, r.brand, r.product, r.advisor_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [requests, estampSearch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = requests.filter((r) => r.status === "pendiente_diseno").length;
  const designCount = requests.filter((r) => ["pendiente_diseno", "en_revision", "ajustado", "ajustes_solicitados"].includes(r.status)).length;
  const approvalCount = requests.filter((r) => r.status === "aprobado").length;
  const doneCount = requests.filter((r) => r.status === "finalizado").length;

  // Estampacion only sees the Aprobación tab (read-only)
  if (isEstampacion) {
    const aprobadosList = filteredForEstampacion.filter((r) => r.status === "aprobado");
    const historicList = filteredForEstampacion.filter((r) => ["aprobado", "finalizado"].includes(r.status));
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Diseño de Logos</h1>
          <p className="text-muted-foreground">Logos aprobados para estampación</p>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, marca, producto o asesor..."
            value={estampSearch}
            onChange={(e) => setEstampSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs defaultValue="aprobados">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="aprobados">Pendientes ({aprobadosList.length})</TabsTrigger>
            <TabsTrigger value="todos">Todos los aprobados ({historicList.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="aprobados">
            <AprobacionAsesor requests={filteredForEstampacion} />
          </TabsContent>
          <TabsContent value="todos">
            <AprobacionAsesor requests={historicList.map((r) => ({ ...r, status: "aprobado" as any }))} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Diseño de Logos</h1>
        <p className="text-muted-foreground">Gestión de solicitudes de diseño para productos personalizados</p>
      </div>

      <Tabs defaultValue="solicitudes">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="solicitudes">Solicitudes ({pendingCount})</TabsTrigger>
          <TabsTrigger value="diseno">Diseñador ({designCount})</TabsTrigger>
          <TabsTrigger value="aprobacion">Aprobación ({approvalCount})</TabsTrigger>
          <TabsTrigger value="finalizados">Finalizados ({doneCount})</TabsTrigger>
        </TabsList>
        <TabsContent value="solicitudes">
          <NuevasSolicitudes requests={requests} />
        </TabsContent>
        <TabsContent value="diseno">
          <TrabajoDisenador requests={requests} />
        </TabsContent>
        <TabsContent value="aprobacion">
          <AprobacionAsesor requests={requests} />
        </TabsContent>
        <TabsContent value="finalizados">
          <DisenosFinalizados requests={requests} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DisenoLogos;

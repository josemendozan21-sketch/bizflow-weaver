import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLogoRequests } from "@/hooks/useLogoRequests";
import { NuevasSolicitudes } from "@/components/diseno/NuevasSolicitudes";
import { TrabajoDisenador } from "@/components/diseno/TrabajoDisenador";
import { AprobacionAsesor } from "@/components/diseno/AprobacionAsesor";
import { DisenosFinalizados } from "@/components/diseno/DisenosFinalizados";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const DisenoLogos = () => {
  const { data: requests = [], isLoading } = useLogoRequests();
  const { role } = useAuth();
  const isEstampacion = role === "estampacion";

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
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Diseño de Logos</h1>
          <p className="text-muted-foreground">Logos aprobados para estampación</p>
        </div>
        <AprobacionAsesor requests={requests} />
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoRequest, useUpdateLogoRequest } from "@/hooks/useLogoRequests";
import { StatusBadge } from "./StatusBadge";
import { Download, User, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  requests: LogoRequest[];
}

export function DisenosFinalizados({ requests }: Props) {
  const approved = requests.filter((r) => r.status === "aprobado" || r.status === "finalizado");
  const updateRequest = useUpdateLogoRequest();

  const handleFinalize = async (id: string) => {
    await updateRequest.mutateAsync({ id, status: "finalizado" as any });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Diseños finalizados</h2>
        <p className="text-sm text-muted-foreground">{approved.length} diseño(s) aprobado(s) / finalizado(s)</p>
      </div>

      {approved.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay diseños finalizados aún.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {approved.map((req) => (
            <Card key={req.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{req.client_name}</CardTitle>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-sm text-muted-foreground">{req.brand} · {req.product}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border rounded-lg p-3 bg-muted/20 flex items-center justify-center">
                  <img
                    src={req.adjusted_logo_url || req.original_logo_url}
                    alt="Diseño final"
                    className="max-h-24 object-contain"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {req.advisor_name}</span>
                  {req.approved_at && (
                    <span>Aprobado: {format(new Date(req.approved_at), "d MMM yyyy", { locale: es })}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {req.adjusted_logo_url && (
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <a href={req.adjusted_logo_url} download target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1 h-3 w-3" /> Descargar
                      </a>
                    </Button>
                  )}
                  {req.status === "aprobado" && (
                    <Button size="sm" className="flex-1" onClick={() => handleFinalize(req.id)}>
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Finalizar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoRequest } from "@/hooks/useLogoRequests";
import { StatusBadge } from "./StatusBadge";
import { CreateRequestDialog } from "./CreateRequestDialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileImage, User, MessageSquare, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  requests: LogoRequest[];
}

export function NuevasSolicitudes({ requests }: Props) {
  const filtered = requests.filter((r) => r.status === "pendiente_diseno");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Solicitudes nuevas</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} solicitud(es) pendiente(s) de diseño</p>
        </div>
        <CreateRequestDialog />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay solicitudes pendientes de diseño.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((req) => (
            <Card key={req.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{req.client_name}</CardTitle>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-sm text-muted-foreground">{req.brand} · {req.product}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border rounded-lg p-2 bg-muted/20 flex items-center justify-center">
                  <img src={req.original_logo_url} alt="Logo original" className="max-h-20 object-contain" />
                </div>
                {req.client_comments && (
                  <div className="flex gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{req.client_comments}</span>
                  </div>
                )}
                {req.additional_instructions && (
                  <div className="flex gap-2 text-sm">
                    <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{req.additional_instructions}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {req.advisor_name}</span>
                  <span>{format(new Date(req.created_at), "d MMM yyyy", { locale: es })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

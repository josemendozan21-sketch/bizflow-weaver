import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoRequest } from "@/hooks/useLogoRequests";
import { StatusBadge } from "./StatusBadge";
import { CreateRequestDialog } from "./CreateRequestDialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileImage, User, MessageSquare, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LogoPreview } from "./LogoPreview";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";

interface Props {
  requests: LogoRequest[];
}

export function NuevasSolicitudes({ requests }: Props) {
  const { role } = useAuth();
  const canCreate = role === "admin" || role === "produccion";
  const filtered = requests.filter((r) => r.status === "pendiente_diseno");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Solicitudes nuevas</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} solicitud(es) pendiente(s) de diseño</p>
        </div>
        {canCreate && <CreateRequestDialog />}
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
                  <CardTitle className="text-base">
                    {req.client_name}
                    {req.logo_name && (
                      <span className="block text-xs font-normal text-primary mt-0.5">🎨 {req.logo_name}</span>
                    )}
                  </CardTitle>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-sm text-muted-foreground">{req.brand} · {req.product}</p>
                {req.order_code && <div className="mt-1"><OrderCodeBadge code={req.order_code} compact /></div>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border rounded-lg p-2 bg-muted/20 flex items-center justify-center min-h-20 overflow-hidden">
                  {req.original_logo_url && req.original_logo_url.startsWith("http") ? (
                    <LogoPreview url={req.original_logo_url} alt="Logo original" />
                  ) : (
                    <div className="text-xs text-muted-foreground text-center px-2 py-3 flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      Sin logo — diseñar desde la personalización
                    </div>
                  )}
                </div>
                {[
                  ...(((req as any).original_logo_url_2 ? [{ name: (req as any).logo_name_2 || null, url: (req as any).original_logo_url_2 }] : [])),
                  ...(((req as any).extra_logos as Array<{ name?: string | null; url?: string | null }> | null) || []),
                ]
                  .filter((l) => l?.url)
                  .map((l, i) => (
                    <div key={`extra-logo-${i}`} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Logo {i + 2}{l?.name ? ` — ${l.name}` : ""}
                      </p>
                      <div className="border rounded-lg p-2 bg-muted/20 flex items-center justify-center min-h-[80px]">
                        <LogoPreview url={l!.url!} alt={`Logo ${i + 2}`} />
                      </div>
                    </div>
                  ))}
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoRequest, useUpdateLogoRequest } from "@/hooks/useLogoRequests";
import { StatusBadge } from "./StatusBadge";
import { CheckCircle2, FileText, User, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  requests: LogoRequest[];
}

export function AprobacionAsesor({ requests }: Props) {
  const { role } = useAuth();
  const filtered = requests.filter((r) => r.status === "aprobado");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Logos aprobados — Listos para estampado</h2>
        <p className="text-sm text-muted-foreground">{filtered.length} diseño(s) aprobado(s)</p>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay diseños aprobados pendientes de estampado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((req) => (
            <ApprovedCard key={req.id} request={req} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovedCard({ request: req, role }: { request: LogoRequest; role: string | null }) {
  const [generating, setGenerating] = useState(false);
  const updateRequest = useUpdateLogoRequest();
  const canGeneratePDF = role === "admin" || role === "produccion";

  const handleGeneratePDF = () => {
    setGenerating(true);
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("No se pudo abrir la ventana de impresión. Permite las ventanas emergentes.");
        return;
      }

      const today = format(new Date(), "d 'de' MMMM yyyy", { locale: es });
      const approvedDate = req.approved_at
        ? format(new Date(req.approved_at), "d 'de' MMMM yyyy", { locale: es })
        : "—";

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Orden de Estampado — ${req.client_name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 15px; }
            .header h1 { font-size: 22px; color: #1e40af; }
            .header p { font-size: 12px; color: #6b7280; margin-top: 4px; }
            .logo-container { text-align: center; margin: 30px 0; }
            .logo-container img { max-height: 250px; max-width: 100%; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px 14px; text-align: left; border: 1px solid #d1d5db; }
            th { background: #f3f4f6; font-weight: 600; width: 200px; }
            .footer { text-align: center; margin-top: 40px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Orden de Estampado — Bionovations</h1>
            <p>Documento generado para el área de producción</p>
          </div>
          <div class="logo-container">
            <img src="${req.adjusted_logo_url || req.original_logo_url}" alt="Logo para estampar" />
          </div>
          <table>
            <tr><th>Cliente</th><td>${req.client_name}</td></tr>
            <tr><th>Marca</th><td>${req.brand}</td></tr>
            <tr><th>Producto</th><td>${req.product}</td></tr>
            <tr><th>Fecha de aprobación</th><td>${approvedDate}</td></tr>
            <tr><th>Asesor responsable</th><td>${req.advisor_name}</td></tr>
            ${req.design_notes ? `<tr><th>Notas del diseñador</th><td>${req.design_notes}</td></tr>` : ""}
          </table>
          <div class="footer">Generado el ${today}</div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalize = async () => {
    await updateRequest.mutateAsync({ id: req.id, status: "finalizado" as any });
    toast.success("Logo marcado como finalizado");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{req.client_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{req.brand} · {req.product}</p>
          </div>
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Aprobado — Listo para estampar
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="border rounded-lg p-3 bg-muted/20 flex items-center justify-center">
          <img
            src={req.adjusted_logo_url || req.original_logo_url}
            alt="Logo aprobado"
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
          {canGeneratePDF && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleGeneratePDF}
              disabled={generating}
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FileText className="mr-1 h-3 w-3" /> 📄 Generar PDF para estampado</>}
            </Button>
          )}
          {canGeneratePDF && (
            <Button size="sm" className="flex-1" onClick={handleFinalize}>
              <CheckCircle2 className="mr-1 h-3 w-3" /> Finalizar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

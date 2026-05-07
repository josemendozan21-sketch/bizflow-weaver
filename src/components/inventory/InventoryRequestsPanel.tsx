import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Clock, History, User as UserIcon } from "lucide-react";
import { useInventoryRequests, type InventoryRequest } from "@/hooks/useInventoryRequests";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const AREA_LABEL: Record<string, string> = {
  produccion: "Producción",
  estampacion: "Estampación",
  logistica: "Logística",
  asesor_comercial: "Asesor comercial",
  inventarios: "Inventarios",
  admin: "Admin",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendiente: "default",
  aprobada: "secondary",
  rechazada: "destructive",
};

const InventoryRequestsPanel = () => {
  const { role } = useAuth();
  const isInventarios = role === "inventarios" || role === "admin";
  const { requests, isLoading, approve, reject } = useInventoryRequests();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const pendientes = requests.filter((r) => r.status === "pendiente");
  const historial = requests.filter((r) => r.status !== "pendiente");

  const handleApprove = async (r: InventoryRequest) => {
    setBusy(r.id);
    const res = await approve(r.id);
    setBusy(null);
    if (!res.success) toast.error(res.message);
    else toast.success(`Aprobada: ${r.quantity} uds de "${r.item_name}"`);
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    if (!rejectReason.trim()) { toast.error("Indica el motivo del rechazo"); return; }
    setBusy(rejectingId);
    const res = await reject(rejectingId, rejectReason.trim());
    setBusy(null);
    if (!res.success) toast.error(res.message);
    else {
      toast.success("Solicitud rechazada");
      setRejectingId(null);
      setRejectReason("");
    }
  };

  const renderRow = (r: InventoryRequest, showActions: boolean) => (
    <TableRow key={r.id}>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium flex items-center gap-1.5">
            <UserIcon className="h-3 w-3 text-muted-foreground" />
            {r.requester_name}
          </span>
          <span className="text-xs text-muted-foreground">{AREA_LABEL[r.requester_area] || r.requester_area}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{r.item_name}</div>
        <div className="text-xs text-muted-foreground">
          {r.brand} · {r.category === "cuerpos_referencias" ? "Cuerpos" : "Producto terminado"}
        </div>
      </TableCell>
      <TableCell className="text-right font-semibold">{Number(r.quantity).toLocaleString("es-CO")}</TableCell>
      <TableCell className="max-w-[180px] text-xs text-muted-foreground">
        {r.reason || "—"}
        {r.rejection_reason && (
          <div className="text-destructive mt-1">Rechazo: {r.rejection_reason}</div>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: es })}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant={STATUS_VARIANT[r.status]} className="text-[10px] capitalize">{r.status}</Badge>
      </TableCell>
      {showActions && (
        <TableCell className="text-right space-x-1">
          <Button size="sm" variant="default" disabled={busy === r.id}
            onClick={() => handleApprove(r)} className="gap-1">
            <Check className="h-3.5 w-3.5" /> Aprobar
          </Button>
          <Button size="sm" variant="outline" disabled={busy === r.id}
            onClick={() => { setRejectingId(r.id); setRejectReason(""); }} className="gap-1">
            <X className="h-3.5 w-3.5" /> Rechazar
          </Button>
        </TableCell>
      )}
    </TableRow>
  );

  const renderTable = (rows: InventoryRequest[], showActions: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Solicitante</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead className="text-right">Cantidad</TableHead>
          <TableHead>Motivo</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          {showActions && <TableHead className="text-right">Acciones</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showActions ? 7 : 6} className="text-center text-muted-foreground py-6 text-sm">
              Sin solicitudes
            </TableCell>
          </TableRow>
        ) : (
          rows.map((r) => renderRow(r, showActions))
        )}
      </TableBody>
    </Table>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isInventarios ? "Solicitudes de inventario" : "Mis solicitudes"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pendientes">
          <TabsList>
            <TabsTrigger value="pendientes" className="gap-1.5">
              <Clock className="h-4 w-4" /> Pendientes
              {pendientes.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{pendientes.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="historial" className="gap-1.5">
              <History className="h-4 w-4" /> Historial
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pendientes" className="mt-4">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground py-6">Cargando…</p>
            ) : (
              renderTable(pendientes, isInventarios)
            )}
          </TabsContent>
          <TabsContent value="historial" className="mt-4">
            {renderTable(historial, false)}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={!!rejectingId} onOpenChange={(o) => !o && setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>Indica el motivo para que el solicitante lo vea.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ej: sin stock, esperar producción..." rows={3} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectingId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={busy === rejectingId}>
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default InventoryRequestsPanel;
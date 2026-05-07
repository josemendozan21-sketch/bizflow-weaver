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
import { Check, X, Clock, History, User as UserIcon, Send, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventoryRequests, type InventoryRequest } from "@/hooks/useInventoryRequests";
import { useInventory } from "@/hooks/useInventory";
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
  en_produccion: "outline",
  en_estampacion: "outline",
};

type RouteOption = "logistica" | "produccion" | "estampacion";

type OriginFilter = "todas" | "detal" | "mayor" | "internos";

const getOrigin = (r: InventoryRequest): { key: "detal" | "mayor" | "interno"; label: string; cls: string } => {
  const reason = (r.reason || "").toLowerCase();
  if (reason.includes("detal")) {
    return { key: "detal", label: "Detal", cls: "bg-fuchsia-600 hover:bg-fuchsia-700 text-white" };
  }
  if (r.requester_area === "asesor_comercial") {
    return { key: "mayor", label: "Mayor", cls: "bg-blue-600 hover:bg-blue-700 text-white" };
  }
  return { key: "interno", label: AREA_LABEL[r.requester_area] || r.requester_area, cls: "bg-slate-500 hover:bg-slate-600 text-white" };
};

const extractClient = (r: InventoryRequest): string | null => {
  if (!r.reason) return null;
  const m = r.reason.match(/Pedido al detal de\s+(.+)/i) || r.reason.match(/cliente:\s*(.+)/i);
  return m ? m[1].trim() : null;
};

const InventoryRequestsPanel = () => {
  const { role } = useAuth();
  const isInventarios = role === "inventarios" || role === "admin";
  const { requests, isLoading, approve, reject, routeTo } = useInventoryRequests();
  const { stockItems } = useInventory();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Record<string, RouteOption>>({});
  const [originFilter, setOriginFilter] = useState<OriginFilter>("todas");

  const matchesOrigin = (r: InventoryRequest) => {
    if (originFilter === "todas") return true;
    const o = getOrigin(r).key;
    if (originFilter === "detal") return o === "detal";
    if (originFilter === "mayor") return o === "mayor";
    return o === "interno";
  };
  const pendientes = requests.filter((r) => r.status === "pendiente" && matchesOrigin(r));
  const historial = requests.filter((r) => r.status !== "pendiente" && matchesOrigin(r));

  const counts = {
    todas: requests.filter((r) => r.status === "pendiente").length,
    detal: requests.filter((r) => r.status === "pendiente" && getOrigin(r).key === "detal").length,
    mayor: requests.filter((r) => r.status === "pendiente" && getOrigin(r).key === "mayor").length,
    internos: requests.filter((r) => r.status === "pendiente" && getOrigin(r).key === "interno").length,
  };

  const getStockFor = (r: InventoryRequest): number | null => {
    let item = r.stock_item_id ? stockItems.find((s) => s.id === r.stock_item_id) : undefined;
    if (!item) {
      item = stockItems.find(
        (s) => s.brand === r.brand && s.category === r.category &&
          s.name.toLowerCase() === r.item_name.toLowerCase()
      );
    }
    return item ? Number(item.available) : null;
  };

  const suggestRoute = (r: InventoryRequest, stock: number | null): RouteOption => {
    if (stock !== null && stock >= Number(r.quantity)) return "logistica";
    if (r.category === "producto_terminado" && r.order_id) return "estampacion";
    return "produccion";
  };

  const getRoute = (r: InventoryRequest, stock: number | null): RouteOption =>
    routes[r.id] || suggestRoute(r, stock);

  const handleApprove = async (r: InventoryRequest) => {
    setBusy(r.id);
    const res = await approve(r.id);
    setBusy(null);
    if (!res.success) toast.error(res.message);
    else toast.success(`Aprobada: ${r.quantity} uds de "${r.item_name}"`);
  };

  const handleProcess = async (r: InventoryRequest, stock: number | null) => {
    const route = getRoute(r, stock);
    setBusy(r.id);
    let res;
    if (route === "logistica") res = await approve(r.id);
    else res = await routeTo(r.id, route);
    setBusy(null);
    if (!res.success) toast.error(res.message);
    else toast.success(res.message);
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

  const renderRow = (r: InventoryRequest, showActions: boolean) => {
    const stock = getStockFor(r);
    const route = getRoute(r, stock);
    const qty = Number(r.quantity);
    const sufficient = stock !== null && stock >= qty;
    const partial = stock !== null && stock > 0 && stock < qty;
    const none = stock !== null && stock <= 0;
    const deficit = stock === null ? null : Math.max(0, qty - stock);
    const mismatch = showActions && route === "logistica" && stock !== null && stock < qty;
    const stockBadge = stock === null
      ? <Badge variant="outline" className="text-[10px]">N/D</Badge>
      : sufficient
        ? <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]">{stock} / {qty}</Badge>
        : partial
          ? <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px]">{stock} / {qty}</Badge>
          : <Badge variant="destructive" className="text-[10px]">0 / {qty}</Badge>;
    return (
    <TableRow key={r.id} className={mismatch ? "bg-destructive/5" : undefined}>
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
      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-0.5">
          {stockBadge}
          {deficit !== null && deficit > 0 && (
            <span className="text-[10px] text-destructive">Faltan {deficit}</span>
          )}
        </div>
      </TableCell>
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
        <Badge variant={STATUS_VARIANT[r.status]} className="text-[10px] capitalize">
          {r.status.replace("_", " ")}
        </Badge>
        {!showActions && r.routed_to && (
          <div className="text-[10px] text-muted-foreground mt-0.5">→ {AREA_LABEL[r.routed_to] || r.routed_to}</div>
        )}
      </TableCell>
      {showActions && (
        <>
          <TableCell>
            <Select value={route} onValueChange={(v) => setRoutes((p) => ({ ...p, [r.id]: v as RouteOption }))}>
              <SelectTrigger className={`h-8 text-xs w-[160px] ${mismatch ? "border-destructive text-destructive" : ""}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="logistica">Entregar a Logística</SelectItem>
                <SelectItem value="produccion">Pasar a Producción</SelectItem>
                <SelectItem value="estampacion">Pasar a Estampación</SelectItem>
              </SelectContent>
            </Select>
            {mismatch && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-destructive">
                <AlertTriangle className="h-3 w-3" />
                Stock insuficiente
              </div>
            )}
          </TableCell>
          <TableCell className="text-right space-x-1 whitespace-nowrap">
            <Button size="sm" variant="default" disabled={busy === r.id}
              onClick={() => handleProcess(r, stock)} className="gap-1">
              {route === "logistica" ? <Check className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              Procesar
            </Button>
            <Button size="sm" variant="outline" disabled={busy === r.id}
              onClick={() => { setRejectingId(r.id); setRejectReason(""); }} className="gap-1">
              <X className="h-3.5 w-3.5" /> Rechazar
            </Button>
          </TableCell>
        </>
      )}
    </TableRow>
    );
  };

  const renderTable = (rows: InventoryRequest[], showActions: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Solicitante</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead className="text-right">Cantidad</TableHead>
          <TableHead className="text-center">Stock</TableHead>
          <TableHead>Motivo</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          {showActions && <TableHead>Ruteo</TableHead>}
          {showActions && <TableHead className="text-right">Acciones</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showActions ? 9 : 7} className="text-center text-muted-foreground py-6 text-sm">
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
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, PackageCheck, Search } from "lucide-react";
import { toast } from "sonner";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";
import { useOrderRequirements, type OrderRequirement } from "@/hooks/useOrderRequirements";
import { useInventory } from "@/hooks/useInventory";

const normalize = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const brandLabel = (b: string) =>
  /sweat/i.test(b) ? "Sweatspot" : /magical/i.test(b) ? "Magical Warmers" : b;

const TypeBadge = ({ type }: { type?: string | null }) => {
  if (!type) return null;
  const cold = /fr[ií]o/i.test(type);
  return (
    <Badge variant="outline" className="text-[11px]">
      {cold ? "❄️ Frío" : "🔥 Térmico"}
    </Badge>
  );
};

export default function OrderRequirementsPanel() {
  const { requirements, isLoading, confirmRequirement } = useOrderRequirements();
  const { stockItems } = useInventory();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"pendiente" | "confirmado">("pendiente");
  const [target, setTarget] = useState<OrderRequirement | null>(null);
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);

  const availableOf = (r: OrderRequirement) => {
    const item = stockItems.find((s) => s.id === r.stock_item_id);
    return Number(item?.available ?? 0);
  };

  const filtered = useMemo(() => {
    const q = normalize(search);
    return requirements
      .filter((r) => r.status === tab)
      .filter(
        (r) =>
          !q ||
          normalize(r.item_name).includes(q) ||
          normalize(r.order_code || "").includes(q) ||
          normalize(r.brand).includes(q),
      );
  }, [requirements, tab, search]);

  const openConfirm = (r: OrderRequirement) => {
    const avail = availableOf(r);
    setTarget(r);
    setQty(String(Math.min(avail, Number(r.quantity_required))));
  };

  const doConfirm = async () => {
    if (!target) return;
    setSaving(true);
    const res = await confirmRequirement(target.id, Number(qty || 0));
    setSaving(false);
    if (res.success) {
      toast.success(res.message);
      setTarget(null);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PackageCheck className="h-4 w-4" /> Requerimientos de órdenes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Cada pedido nuevo genera su requerimiento. Confirma lo disponible para descontarlo del inventario; el faltante
          se acumula automáticamente en un lote de producción.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={tab === "pendiente" ? "default" : "outline"} onClick={() => setTab("pendiente")}>
            Pendientes ({requirements.filter((r) => r.status === "pendiente").length})
          </Button>
          <Button size="sm" variant={tab === "confirmado" ? "default" : "outline"} onClick={() => setTab("confirmado")}>
            Confirmados
          </Button>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Pedido, referencia o marca…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando requerimientos…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin requerimientos en esta vista.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const avail = availableOf(r);
              const covered = Math.min(avail, Number(r.quantity_required));
              const missing = Number(r.quantity_required) - covered;
              return (
                <div key={r.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <OrderCodeBadge code={r.order_code} compact />
                    <span className="font-medium">{r.item_name}</span>
                    <TypeBadge type={r.product_type} />
                    <Badge variant="secondary" className="text-[11px]">{brandLabel(r.brand)}</Badge>
                    {r.color && <Badge variant="outline" className="text-[11px]">{r.color}</Badge>}
                    <Badge variant="outline" className="text-[11px]">
                      {r.logo && r.logo.trim() ? "Con logo" : "Sin logo"}
                    </Badge>
                  </div>

                  {r.status === "pendiente" ? (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span>
                        Pedido: <strong>{Number(r.quantity_required)}</strong>
                      </span>
                      <span className="text-emerald-600">
                        Disponible: <strong>{covered}</strong>
                      </span>
                      {missing > 0 ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="h-3.5 w-3.5" /> Faltan <strong>{missing}</strong> → producción
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Cubierto con inventario
                        </span>
                      )}
                      <Button size="sm" className="ml-auto" onClick={() => openConfirm(r)}>
                        Confirmar disponible
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>Pedido: {Number(r.quantity_required)}</span>
                      <span className="text-emerald-600">Descontado: {Number(r.quantity_covered)}</span>
                      <span className="text-amber-600">A producción: {Number(r.quantity_missing)}</span>
                      <span className="ml-auto text-xs">
                        {r.confirmed_by_name} ·{" "}
                        {r.confirmed_at ? new Date(r.confirmed_at).toLocaleString("es-CO") : ""}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar disponible</DialogTitle>
            <DialogDescription>
              {target?.item_name} — pedido {target ? Number(target.quantity_required) : 0} uds. Lo que confirmes se
              descuenta del inventario; el resto pasa al lote de producción.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Unidades a descontar de inventario</Label>
            <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
            {target && (
              <p className="text-xs text-muted-foreground">
                Stock actual: {availableOf(target)} · Faltante resultante:{" "}
                {Math.max(Number(target.quantity_required) - Number(qty || 0), 0)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>Cancelar</Button>
            <Button onClick={doConfirm} disabled={saving}>
              {saving ? "Confirmando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

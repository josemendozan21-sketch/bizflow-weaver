import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowDownToLine, ArrowUpFromLine, Clock, RotateCcw, Zap, Factory } from "lucide-react";
import { toast } from "sonner";
import { useInventory } from "@/hooks/useInventory";
import { useInventoryMovements, type MovementKind } from "@/hooks/useInventoryMovements";
import { supabase } from "@/integrations/supabase/client";
import { RESERVATIONS_ENABLED } from "@/lib/featureFlags";
import { matchesQuery } from "@/lib/search";
import { useFerias } from "@/hooks/useFerias";
import { formatStockOptionLabel } from "@/lib/referenceCatalog";


type ActionKind = MovementKind | "solicitud";

const ALL_KIND_OPTIONS: { value: ActionKind; label: string; icon: any; color: string }[] = [
  { value: "entrada", label: "Entrada", icon: ArrowDownToLine, color: "text-emerald-600" },
  { value: "salida", label: "Salida", icon: ArrowUpFromLine, color: "text-orange-600" },
  { value: "reserva", label: "Reservar (en proceso)", icon: Clock, color: "text-amber-600" },
  { value: "liberar_reserva", label: "Liberar reserva", icon: RotateCcw, color: "text-blue-600" },
  { value: "solicitud", label: "Solicitud a producción", icon: Factory, color: "text-fuchsia-600" },
];

const CATEGORIES = [
  { value: "materia_prima", label: "Materia prima" },
  { value: "cuerpos_referencias", label: "Cuerpos" },
  { value: "producto_terminado", label: "Producto terminado" },
  { value: "importados", label: "Importados" },
];

const KIND_OPTIONS = ALL_KIND_OPTIONS.filter(
  (k) => RESERVATIONS_ENABLED || !["reserva", "liberar_reserva"].includes(k.value as string),
);

interface OrderOption { id: string; order_code: string | null; client_name: string; advisor_name: string | null; }

const REQUESTER_OPTIONS = [
  "Producción",
  "Estampación",
  "Logística",
  "Punto 92",
  "Asesor comercial",
  "Feria",
  "Inventarios",
  "Otro",
];

export default function QuickMovementForm() {
  const { stockItems } = useInventory();
  const { createMovement } = useInventoryMovements();

  const [kind, setKind] = useState<ActionKind>("salida");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [stockItemId, setStockItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [requesterArea, setRequesterArea] = useState("");
  const [requesterOther, setRequesterOther] = useState("");
  const [purpose, setPurpose] = useState("");
  const [supplier, setSupplier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [magicalTipo, setMagicalTipo] = useState<"" | "frio" | "calor">("");
  const [destKind, setDestKind] = useState<"ninguno" | "pedido" | "feria">("ninguno");
  const [orderId, setOrderId] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [recentOrders, setRecentOrders] = useState<OrderOption[]>([]);
  const [feriaId, setFeriaId] = useState("");
  const [sweatLogo, setSweatLogo] = useState<"" | "con" | "sin">("");

  const feriasQuery = useFerias();
  const ferias = (feriasQuery.data ?? []).filter((f: any) => f.status !== "cancelada");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_code, client_name, advisor_name")
        .order("created_at", { ascending: false })
        .limit(300);
      setRecentOrders((data as any) || []);
    })();
  }, []);

  const orderOptions = useMemo(
    () =>
      recentOrders
        .filter((o) => matchesQuery([o.order_code, o.client_name, o.advisor_name], orderSearch))
        .slice(0, 60),
    [recentOrders, orderSearch],
  );

  const brands = useMemo(
    () => Array.from(new Set(stockItems.map((s) => s.brand))).sort(),
    [stockItems],
  );
  const items = useMemo(
    () =>
      stockItems
        .filter((s) => {
          if (brand && s.brand !== brand) return false;
          if (category && s.category !== category) return false;
          // Solicitudes a producción solo aplican a cuerpos o producto terminado
          if (kind === "solicitud" && !["cuerpos_referencias", "producto_terminado"].includes(s.category)) return false;
          if (brand === "magical" && magicalTipo) {
            const pt = (s.product_type || "").toLowerCase();
            if (magicalTipo === "frio" && !/fr[ií]o/.test(pt)) return false;
            if (magicalTipo === "calor" && !/(calor|t[eé]rmico)/.test(pt)) return false;
          }
          if (brand === "sweatspot" && sweatLogo) {
            const hasLogo = !!s.logo && String(s.logo).trim() !== "";
            if (sweatLogo === "con" && !hasLogo) return false;
            if (sweatLogo === "sin" && hasLogo) return false;
          }
          return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [stockItems, brand, category, kind, magicalTipo, sweatLogo],
  );
  const selected = stockItems.find((s) => s.id === stockItemId);

  useEffect(() => {
    setStockItemId("");
  }, [brand, category, magicalTipo, sweatLogo]);

  useEffect(() => {
    if (brand !== "magical") setMagicalTipo("");
    if (brand !== "sweatspot") setSweatLogo("");
  }, [brand]);

  const reset = () => {
    setStockItemId("");
    setQuantity("");
    setRequesterArea("");
    setRequesterOther("");
    setPurpose("");
    setSupplier("");
    setDestKind("ninguno");
    setOrderId("");
    setOrderSearch("");
    setFeriaId("");
  };

  const handleSubmit = async () => {
    if (!selected) return toast.error("Selecciona un ítem");
    const qty = Number(quantity);
    if (!qty || qty <= 0) return toast.error("Cantidad inválida");

    if (kind === "solicitud") {
      if (!["cuerpos_referencias", "producto_terminado"].includes(selected.category)) {
        return toast.error("Solo se puede solicitar cuerpos o producto terminado");
      }
      setSubmitting(true);
      const ptRaw = `${selected.product_type || ""} ${selected.name || ""}`;
      const tipoPlastico = /calor|t[eé]rmico/i.test(ptRaw) ? "calor" : "frio";
      const tipoLabel = tipoPlastico === "calor" ? "Térmico" : "Frío";
      const { error } = await supabase.from("body_production_tasks").insert({
        tipo_plastico: tipoPlastico,
        referencia: `${selected.name} (${tipoLabel})`,
        unidades: qty,
        status: "pendiente",
        brand: selected.brand,
      } as any);

      if (error) {
        setSubmitting(false);
        return toast.error(`No se pudo crear la solicitud: ${error.message}`);
      }
      const catLabel = selected.category === "cuerpos_referencias" ? "cuerpos" : "producto terminado";
      await supabase.from("notifications").insert({
        target_role: "produccion",
        title: "Nueva solicitud de producción",
        message: `Inventarios solicita ${qty} uds de "${selected.name}" (${selected.brand}, ${catLabel})${purpose ? `. Motivo: ${purpose}` : ""}`,
        type: "info",
      } as any);
      toast.success("Solicitud enviada a producción");
      reset();
      setSubmitting(false);
      return;
    }

    if ((kind === "salida" || kind === "reserva") && qty > selected.available) {
      return toast.error(`Stock insuficiente. Disponible: ${selected.available}`);
    }
    if (kind === "liberar_reserva" && qty > Number((selected as any).in_process || 0)) {
      return toast.error(`En proceso insuficiente: ${(selected as any).in_process || 0}`);
    }

    setSubmitting(true);
    const direction = kind === "entrada" || kind === "liberar_reserva" ? "retorno" : "entrega";
    const requestedBy = requesterArea === "Otro" ? requesterOther.trim() : requesterArea;
    const res = await createMovement({
      stock_item_id: selected.id,
      item_name: selected.name,
      brand: selected.brand,
      category: selected.category,
      quantity: qty,
      direction,
      movement_kind: kind as MovementKind,
      area: "produccion", // default; real "área" semantics now in purpose
      requested_by_name: requestedBy || null,
      purpose: purpose || null,
      supplier: kind === "entrada" ? supplier || null : null,
      reason: purpose || null,
      order_id: destKind === "pedido" && orderId ? orderId : null,
      feria_id: destKind === "feria" && feriaId ? feriaId : null,
    });
    setSubmitting(false);
    if (res.success) {
      toast.success(res.message);
      reset();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-5 w-5 text-primary" /> Registro rápido de movimiento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-2 block">Tipo</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {KIND_OPTIONS.map((k) => {
              const Icon = k.icon;
              const active = kind === k.value;
              return (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  className={`flex items-center gap-2 border rounded-md p-3 text-sm transition ${
                    active ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${k.color}`} />
                  {k.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Marca</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger><SelectValue placeholder="Selecciona marca" /></SelectTrigger>
              <SelectContent>
                {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Selecciona categoría" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Ítem</Label>
          {(brand === "magical" || brand === "sweatspot") && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              {brand === "magical" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <Select value={magicalTipo} onValueChange={(v) => setMagicalTipo(v as any)}>
                    <SelectTrigger><SelectValue placeholder="Frío o Térmico" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="frio">Frío</SelectItem>
                      <SelectItem value="calor">Térmico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {brand === "sweatspot" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Logo</Label>
                  <Select value={sweatLogo} onValueChange={(v) => setSweatLogo(v as any)}>
                    <SelectTrigger><SelectValue placeholder="Con o sin logo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="con">Con logo</SelectItem>
                      <SelectItem value="sin">Sin logo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <Select value={stockItemId} onValueChange={setStockItemId} disabled={!brand || !category}>
            <SelectTrigger>
              <SelectValue placeholder={brand && category ? "Selecciona ítem" : "Primero marca y categoría"} />
            </SelectTrigger>
            <SelectContent>
              {items.map((it) => (
                <SelectItem key={it.id} value={it.id}>
                  {it.name}
                  {it.brand === "magical" && it.product_type
                    ? ` · ${/calor|t[eé]rmico/i.test(it.product_type) ? "Térmico" : it.product_type}`
                    : ""}
                  {it.brand === "sweatspot"
                    ? ` · ${it.logo ? `Con logo${typeof it.logo === "string" && it.logo.toLowerCase() !== "sweatspot" ? ` (${it.logo})` : ""}` : "Sin logo"}`
                    : ""}
                  {it.color ? ` · ${it.color}` : ""}
                  {" · disp. "}{it.available}
                  {Number((it as any).in_process || 0) > 0 ? ` · en proceso ${(it as any).in_process}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected && (
            <div className="flex items-center gap-2 mt-2 text-xs">
              <Badge variant="outline">Disponible: {selected.available} {selected.unit}</Badge>
              {Number((selected as any).in_process || 0) > 0 && (
                <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-400">
                  En proceso: {(selected as any).in_process}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Cantidad</Label>
            <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Solicitante (área)</Label>
            <Select value={requesterArea} onValueChange={setRequesterArea}>
              <SelectTrigger><SelectValue placeholder="Selecciona área" /></SelectTrigger>
              <SelectContent>
                {REQUESTER_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            {requesterArea === "Otro" && (
              <Input
                className="mt-2"
                value={requesterOther}
                onChange={(e) => setRequesterOther(e.target.value)}
                placeholder="Especifica quién solicita"
              />
            )}
          </div>
          <div>
            <Label>{kind === "entrada" ? "Proveedor" : "—"}</Label>
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder={kind === "entrada" ? "Nombre proveedor" : "—"}
              disabled={kind !== "entrada"}
            />
          </div>
        </div>

        {kind !== "entrada" && kind !== "solicitud" && (
          <div className="space-y-2 rounded-md border p-3">
            <Label className="text-sm">Destino de la salida (para trazabilidad)</Label>
            <div className="flex flex-wrap gap-2">
              {([
                { v: "ninguno", l: "Sin destino específico" },
                { v: "pedido", l: "Pedido" },
                { v: "feria", l: "Feria" },
              ] as const).map((o) => (
                <Button
                  key={o.v}
                  type="button"
                  size="sm"
                  variant={destKind === o.v ? "default" : "outline"}
                  onClick={() => setDestKind(o.v)}
                >
                  {o.l}
                </Button>
              ))}
            </div>
            {destKind === "pedido" && (
              <div className="space-y-2">
                <Input
                  placeholder="Buscar por número de pedido, cliente o asesor…"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                />
                <Select value={orderId} onValueChange={setOrderId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona el pedido" /></SelectTrigger>
                  <SelectContent>
                    {orderOptions.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Sin resultados</div>
                    )}
                    {orderOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.order_code || "s/n"} · {o.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {destKind === "feria" && (
              <Select value={feriaId} onValueChange={setFeriaId}>
                <SelectTrigger><SelectValue placeholder="Selecciona la feria" /></SelectTrigger>
                <SelectContent>
                  {ferias.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}{f.city ? ` — ${f.city}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <div>
          <Label>Para qué / motivo</Label>
          <Textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Ej: Pedido cliente XYZ, reposición, compra mensual…"
            rows={2}
          />
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
          {submitting ? "Registrando..." : "Registrar movimiento"}
        </Button>
      </CardContent>
    </Card>
  );
}
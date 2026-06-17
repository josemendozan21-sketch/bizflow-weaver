import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Calendar, Package, Hammer, Users, Pencil, Check, X, Plus } from "lucide-react";
import { type Feria, useFeriaSales, calcFeriaTotalCost, calcFeriaTotalBudget, useUpdateFeria } from "@/hooks/useFerias";
import { FeriaInventoryTab } from "./FeriaInventoryTab";
import { FeriaSalesTab } from "./FeriaSalesTab";
import { FeriaStaffTab } from "./FeriaStaffTab";
import { EditFeriaDialog } from "./EditFeriaDialog";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_COLOR: Record<string, string> = {
  planificada: "bg-primary/15 text-primary border-primary/30",
  en_curso: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  finalizada: "bg-muted text-muted-foreground border-border",
  cancelada: "bg-destructive/15 text-destructive border-destructive/30",
};

const COST_BREAKDOWN: Array<{ key: keyof Feria; budgetKey: keyof Feria; label: string }> = [
  { key: "stand_cost", budgetKey: "budget_stand_cost", label: "Costo Feria" },
  { key: "shipping_cost", budgetKey: "budget_shipping_cost", label: "Envío Mercancía" },
  { key: "tickets_cost", budgetKey: "budget_tickets_cost", label: "Tiquetes" },
  { key: "advertising_cost", budgetKey: "budget_advertising_cost", label: "Publicidad" },
  { key: "merchandise_cost", budgetKey: "budget_merchandise_cost", label: "Costo de Mercancía" },
  { key: "employees_cost", budgetKey: "budget_employees_cost", label: "Empleados" },
  { key: "lodging_cost", budgetKey: "budget_lodging_cost", label: "Hospedaje" },
  { key: "transport_cost", budgetKey: "budget_transport_cost", label: "Transporte" },
  { key: "food_cost", budgetKey: "budget_food_cost", label: "Alimentación" },
  { key: "other_costs", budgetKey: "budget_other_costs", label: "Otros" },
];

const PREDEFINED_MATERIALS = [
  "Malla exhibición", "Rack para banners", "Banners", "Mesa", "Sillas", "Ganchos",
  "Tijeras", "Cintas", "Tablas para anotar", "Datáfonos", "Carpa", "Displays",
  "Iluminación", "Extensiones eléctricas", "Bolsas de empaque", "Etiquetas de precio",
];

export function FeriaDetail({ feria, onBack }: { feria: Feria; onBack: () => void }) {
  const { data: sales = [] } = useFeriaSales(feria.id);
  const { role } = useAuth();
  const canSeeFinancials = role === "admin" || role === "contabilidad";
  const canManageStaff = role === "admin" || role === "contabilidad" || role === "logistica";
  const canEdit = role === "admin";
  const update = useUpdateFeria();

  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({
    stand_number: "",
    stand_size: "",
    materials_needed: [] as string[],
    notes: "",
  });
  const [customMaterial, setCustomMaterial] = useState("");

  useEffect(() => {
    setInfoForm({
      stand_number: feria.stand_number || "",
      stand_size: feria.stand_size || "",
      materials_needed: feria.materials_needed || [],
      notes: feria.notes || "",
    });
  }, [feria]);

  const toggleMaterial = (m: string) => {
    setInfoForm((p) => ({
      ...p,
      materials_needed: p.materials_needed.includes(m)
        ? p.materials_needed.filter((x) => x !== m)
        : [...p.materials_needed, m],
    }));
  };

  const addCustomMaterial = () => {
    const v = customMaterial.trim();
    if (!v || infoForm.materials_needed.includes(v)) return;
    setInfoForm({ ...infoForm, materials_needed: [...infoForm.materials_needed, v] });
    setCustomMaterial("");
  };

  const startEditingInfo = () => {
    setInfoForm({
      stand_number: feria.stand_number || "",
      stand_size: feria.stand_size || "",
      materials_needed: feria.materials_needed || [],
      notes: feria.notes || "",
    });
    setCustomMaterial("");
    setEditingInfo(true);
  };

  const saveInfo = async () => {
    await update.mutateAsync({
      id: feria.id,
      stand_number: infoForm.stand_number || null,
      stand_size: infoForm.stand_size || null,
      materials_needed: infoForm.materials_needed.length > 0 ? infoForm.materials_needed : null,
      notes: infoForm.notes || null,
    });
    setEditingInfo(false);
  };

  const totalCosts = calcFeriaTotalCost(feria);
  const totalRevenue = useMemo(() => sales.reduce((s, x) => s + Number(x.total_amount), 0), [sales]);
  const profit = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{feria.name}</h2>
            <Badge variant="outline" className={STATUS_COLOR[feria.status] || ""}>{feria.status.replace("_", " ")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {feria.city}{feria.venue ? ` · ${feria.venue}` : ""}
          </p>
        </div>
        {canEdit && <EditFeriaDialog feria={feria} />}
      </div>

      <div className={`grid grid-cols-2 gap-3 ${canSeeFinancials ? "md:grid-cols-4" : "md:grid-cols-2"}`}>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Calendar className="h-3 w-3" />Fechas</div>
          <p className="text-sm font-medium mt-1">{format(new Date(feria.start_date), "dd MMM", { locale: es })} – {format(new Date(feria.end_date), "dd MMM yyyy", { locale: es })}</p>
          {feria.setup_date && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Hammer className="h-3 w-3" /> Montaje: {format(new Date(feria.setup_date), "dd MMM", { locale: es })}
            </p>
          )}
        </Card>
        {canSeeFinancials && (
          <>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Costo Total</div>
              <p className="text-lg font-semibold text-destructive">${totalCosts.toLocaleString()}</p>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Ingreso Total</div>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">${totalRevenue.toLocaleString()}</p>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Utilidad</div>
              <p className={`text-lg font-semibold ${profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                ${profit.toLocaleString()}
              </p>
              {totalRevenue > 0 && <p className="text-xs text-muted-foreground">{margin.toFixed(1)}% margen</p>}
            </Card>
          </>
        )}
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Estado</div>
          <p className="text-sm font-medium mt-1 capitalize">{feria.status.replace("_", " ")}</p>
        </Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="info">Información</TabsTrigger>
          {canSeeFinancials && <TabsTrigger value="costos">Desglose de costos</TabsTrigger>}
          <TabsTrigger value="personal"><Users className="mr-2 h-4 w-4" />Personal</TabsTrigger>
          <TabsTrigger value="inventario"><Package className="mr-2 h-4 w-4" />Inventario asignado</TabsTrigger>
          {canSeeFinancials && <TabsTrigger value="ventas">Ventas</TabsTrigger>}
        </TabsList>

        <TabsContent value="info" className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Información del stand</h3>
              {canEdit && !editingInfo && (
                <Button variant="outline" size="sm" onClick={startEditingInfo}>
                  <Pencil className="mr-2 h-4 w-4" />Editar
                </Button>
              )}
              {canEdit && editingInfo && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingInfo(false)}>
                    <X className="mr-2 h-4 w-4" />Cancelar
                  </Button>
                  <Button size="sm" onClick={saveInfo} disabled={update.isPending}>
                    <Check className="mr-2 h-4 w-4" />Guardar
                  </Button>
                </div>
              )}
            </div>

            {editingInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">N° Stand</Label>
                    <Input value={infoForm.stand_number} onChange={(e) => setInfoForm({ ...infoForm, stand_number: e.target.value })} placeholder="Ej. 6 y 7" />
                  </div>
                  <div>
                    <Label className="text-xs">Tamaño stand</Label>
                    <Input value={infoForm.stand_size} onChange={(e) => setInfoForm({ ...infoForm, stand_size: e.target.value })} placeholder="Ej. 2x6" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs">Materiales</Label>
                  <div className="flex flex-wrap gap-1">
                    {PREDEFINED_MATERIALS.map((m) => {
                      const checked = infoForm.materials_needed.includes(m);
                      return (
                        <label key={m} className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border cursor-pointer transition-colors ${checked ? "bg-primary/10 border-primary/30 text-primary" : "hover:bg-muted"}`}>
                          <Checkbox checked={checked} onCheckedChange={() => toggleMaterial(m)} className="h-3 w-3" />
                          <span>{m}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={customMaterial}
                      onChange={(e) => setCustomMaterial(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomMaterial(); } }}
                      placeholder="Agregar otro material..."
                      className="text-xs h-8"
                    />
                    <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={addCustomMaterial}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {infoForm.materials_needed.filter((m) => !PREDEFINED_MATERIALS.includes(m)).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {infoForm.materials_needed.filter((m) => !PREDEFINED_MATERIALS.includes(m)).map((m) => (
                        <span key={m} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {m}
                          <button type="button" onClick={() => toggleMaterial(m)}><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Notas</Label>
                  <Textarea value={infoForm.notes} onChange={(e) => setInfoForm({ ...infoForm, notes: e.target.value })} placeholder="Notas adicionales del stand..." />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Stand</h4>
                  <p className="text-sm">N°: <span className="text-muted-foreground">{feria.stand_number || "—"}</span></p>
                  <p className="text-sm">Tamaño: <span className="text-muted-foreground">{feria.stand_size || "—"}</span></p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Materiales</h4>
                  <div className="flex flex-wrap gap-1">
                    {(feria.materials_needed || []).length === 0 ? <span className="text-sm text-muted-foreground">Sin materiales</span> :
                      feria.materials_needed!.map((s, i) => <Badge key={i} variant="outline">{s}</Badge>)}
                  </div>
                </div>
                {feria.notes && (
                  <div className="md:col-span-2">
                    <h4 className="font-semibold mb-2">Notas</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feria.notes}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        {canSeeFinancials && (
          <TabsContent value="costos">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Desglose de costos</h3>
              <div className="space-y-2">
                {COST_BREAKDOWN.map((c) => {
                  const value = Number(feria[c.key] || 0);
                  return (
                    <div key={c.key as string} className="flex justify-between py-2 border-b last:border-0">
                      <span className="text-sm">{c.label}</span>
                      <span className="text-sm font-medium">${value.toLocaleString()}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between pt-3 border-t-2 font-bold">
                  <span>Costo Total</span>
                  <span className="text-destructive">${totalCosts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Ingreso Total</span>
                  <span className="text-emerald-600 dark:text-emerald-400">${totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-lg bg-emerald-500/10 px-3 py-2 rounded">
                  <span>Utilidad</span>
                  <span className={profit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
                    ${profit.toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="personal"><FeriaStaffTab feriaId={feria.id} canManage={canManageStaff} /></TabsContent>
        <TabsContent value="inventario"><FeriaInventoryTab feriaId={feria.id} /></TabsContent>
        {canSeeFinancials && <TabsContent value="ventas"><FeriaSalesTab feriaId={feria.id} /></TabsContent>}
      </Tabs>
    </div>
  );
}

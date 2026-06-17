import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { useFeriaSales, useUpdateFeria, type Feria, type ScenarioInput } from "@/hooks/useFerias";
import { calcBreakEven, calcScenario, proposeCommissions, type CommissionProposal } from "@/lib/feriaProjections";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  useFeriaCommissions, useApproveCommission, useApproveAllCommissions, useRejectCommission,
} from "@/hooks/useFeriaCommissions";

const SCENARIO_LABEL: Record<keyof Feria["scenarios"], string> = {
  pesimista: "Pesimista",
  realista: "Realista",
  optimista: "Optimista",
};

const SCENARIO_COLOR: Record<string, string> = {
  pesimista: "border-destructive/30 bg-destructive/5",
  realista: "border-primary/30 bg-primary/5",
  optimista: "border-emerald-500/30 bg-emerald-500/5",
};

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString();
}

export function FeriaProjectionTab({ feria }: { feria: Feria }) {
  const update = useUpdateFeria();
  const { data: sales = [] } = useFeriaSales(feria.id);
  const { data: commissions = [] } = useFeriaCommissions(feria.id);
  const approveOne = useApproveCommission();
  const approveAll = useApproveAllCommissions();
  const reject = useRejectCommission();

  const [settings, setSettings] = useState({
    target_margin_pct: feria.target_margin_pct,
    iva_pct: feria.iva_pct,
    commission_tier_1_pct: feria.commission_tier_1_pct,
    commission_tier_2_pct: feria.commission_tier_2_pct,
    commission_tier_3_pct: feria.commission_tier_3_pct,
    commission_tier_1_to_pct: feria.commission_tier_1_to_pct,
    commission_tier_2_to_pct: feria.commission_tier_2_to_pct,
    scenarios: feria.scenarios,
  });

  useEffect(() => {
    setSettings({
      target_margin_pct: feria.target_margin_pct,
      iva_pct: feria.iva_pct,
      commission_tier_1_pct: feria.commission_tier_1_pct,
      commission_tier_2_pct: feria.commission_tier_2_pct,
      commission_tier_3_pct: feria.commission_tier_3_pct,
      commission_tier_1_to_pct: feria.commission_tier_1_to_pct,
      commission_tier_2_to_pct: feria.commission_tier_2_to_pct,
      scenarios: feria.scenarios,
    });
  }, [feria]);

  // Project-derived feria for in-memory calcs
  const draftFeria: Feria = { ...feria, ...settings };

  const be = useMemo(() => calcBreakEven(draftFeria), [draftFeria]);
  const ventasActualesIva = useMemo(() => sales.reduce((a, s) => a + Number(s.total_amount), 0), [sales]);
  const ventasActualesSinIva = ventasActualesIva / (1 + (feria.iva_pct || 0) / 100);
  const gapIva = be.breakEvenWithIva - ventasActualesIva;

  // advisor name lookup
  const advisorIds = useMemo(() => {
    const ids = new Set<string>();
    sales.forEach((s: any) => { if (s.recorded_by) ids.add(s.recorded_by); });
    return Array.from(ids);
  }, [sales]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_for_feria", feria.id, advisorIds.join(",")],
    queryFn: async () => {
      if (advisorIds.length === 0) return [] as any[];
      const { data } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", advisorIds);
      return data || [];
    },
  });

  const advisorLookup = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach((p: any) => m.set(p.user_id, p.display_name || p.email || "Asesor"));
    return m;
  }, [profiles]);

  const proposals = useMemo(
    () => proposeCommissions(sales, advisorLookup, draftFeria, be),
    [sales, advisorLookup, draftFeria, be]
  );

  const totalCommission = proposals.reduce((a, p) => a + p.commission_amount, 0);

  const setScenario = (key: keyof Feria["scenarios"], field: keyof ScenarioInput, value: string) => {
    setSettings((p) => ({
      ...p,
      scenarios: {
        ...p.scenarios,
        [key]: { ...p.scenarios[key], [field]: parseFloat(value) || 0 },
      },
    }));
  };

  const saveSettings = async () => {
    await update.mutateAsync({ id: feria.id, ...settings });
  };

  const commissionByAdvisor = useMemo(() => {
    const m = new Map<string, typeof commissions[number]>();
    commissions.forEach((c) => m.set(c.advisor_id || "__unassigned__", c));
    return m;
  }, [commissions]);

  return (
    <div className="space-y-4">
      {/* Settings */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Supuestos de proyección</h3>
          <Button size="sm" onClick={saveSettings} disabled={update.isPending}>
            <Save className="h-4 w-4 mr-1" /> Guardar supuestos
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div>
            <Label className="text-xs">Margen objetivo (%)</Label>
            <Input type="number" value={settings.target_margin_pct}
              onChange={(e) => setSettings({ ...settings, target_margin_pct: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label className="text-xs">IVA (%)</Label>
            <Input type="number" value={settings.iva_pct}
              onChange={(e) => setSettings({ ...settings, iva_pct: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-muted/30">
          <div className="text-xs font-semibold mb-2">Comisiones escalonadas (sobre ventas sin IVA, por encima del equilibrio)</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <div>
              <Label className="text-[10px]">Tramo 1 %</Label>
              <Input type="number" className="h-8" value={settings.commission_tier_1_pct}
                onChange={(e) => setSettings({ ...settings, commission_tier_1_pct: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-[10px]">Hasta BE × (1+%)</Label>
              <Input type="number" className="h-8" value={settings.commission_tier_1_to_pct}
                onChange={(e) => setSettings({ ...settings, commission_tier_1_to_pct: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-[10px]">Tramo 2 %</Label>
              <Input type="number" className="h-8" value={settings.commission_tier_2_pct}
                onChange={(e) => setSettings({ ...settings, commission_tier_2_pct: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-[10px]">Hasta BE × (1+%)</Label>
              <Input type="number" className="h-8" value={settings.commission_tier_2_to_pct}
                onChange={(e) => setSettings({ ...settings, commission_tier_2_to_pct: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-[10px]">Tramo 3 % (resto)</Label>
              <Input type="number" className="h-8" value={settings.commission_tier_3_pct}
                onChange={(e) => setSettings({ ...settings, commission_tier_3_pct: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
        </div>
      </Card>

      {/* Break-even */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Punto de equilibrio</h3>
        {be.costsUsed === 0 ? (
          <p className="text-sm text-muted-foreground">Define costos (reales o presupuestados) para calcular el equilibrio.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="border rounded p-3">
              <div className="text-xs text-muted-foreground">Costos {be.costsSource}</div>
              <div className="font-bold">{fmt(be.costsUsed)}</div>
            </div>
            <div className="border rounded p-3 bg-primary/5">
              <div className="text-xs text-muted-foreground">Equilibrio (con IVA)</div>
              <div className="font-bold">{fmt(be.breakEvenWithIva)}</div>
              <div className="text-[10px] text-muted-foreground">+{be.targetMarginPct}% margen</div>
            </div>
            <div className="border rounded p-3">
              <div className="text-xs text-muted-foreground">Equilibrio (sin IVA)</div>
              <div className="font-bold">{fmt(be.breakEvenWithoutIva)}</div>
            </div>
            <div className={`border rounded p-3 ${gapIva <= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
              <div className="text-xs text-muted-foreground">Ventas actuales</div>
              <div className="font-bold">{fmt(ventasActualesIva)}</div>
              <div className="text-[10px]">
                {gapIva <= 0 ? `Superado en ${fmt(Math.abs(gapIva))}` : `Falta ${fmt(gapIva)}`}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Scenarios */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Escenarios de ventas</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {(Object.keys(SCENARIO_LABEL) as Array<keyof Feria["scenarios"]>).map((key) => {
            const sc = settings.scenarios[key];
            const res = calcScenario(sc, draftFeria, be);
            return (
              <div key={key} className={`border rounded-lg p-3 ${SCENARIO_COLOR[key]}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm">{SCENARIO_LABEL[key]}</div>
                  {res.superaEquilibrio ? (
                    <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Supera</Badge>
                  ) : (
                    <Badge variant="outline">No alcanza</Badge>
                  )}
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <Label className="text-[10px]">Visitantes esperados</Label>
                    <Input type="number" className="h-8" value={sc.visitantes_esperados}
                      onChange={(e) => setScenario(key, "visitantes_esperados", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px]">Conversión (%)</Label>
                    <Input type="number" className="h-8" value={sc.tasa_conversion_pct}
                      onChange={(e) => setScenario(key, "tasa_conversion_pct", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[10px]">Ticket promedio (con IVA)</Label>
                    <Input type="number" className="h-8" value={sc.ticket_promedio}
                      onChange={(e) => setScenario(key, "ticket_promedio", e.target.value)} />
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs border-t pt-2">
                  <div className="flex justify-between"><span>Unidades</span><span className="font-medium">{Math.round(res.unidades).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Ingreso con IVA</span><span className="font-medium">{fmt(res.ingresoConIva)}</span></div>
                  <div className="flex justify-between"><span>Ingreso sin IVA</span><span className="font-medium">{fmt(res.ingresoSinIva)}</span></div>
                  <div className="flex justify-between"><span>Utilidad</span><span className={`font-semibold ${res.utilidad >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(res.utilidad)}</span></div>
                  <div className="flex justify-between"><span>% vs equilibrio</span><span className="font-medium">{Math.round(res.pctVsEquilibrio)}%</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Commissions proposal */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Propuesta de comisiones</h3>
            <p className="text-xs text-muted-foreground">Basada en ventas reales sin IVA por asesor, escalonada después del punto de equilibrio.</p>
          </div>
          <Button size="sm" disabled={proposals.length === 0 || approveAll.isPending}
            onClick={() => approveAll.mutate({ feriaId: feria.id, proposals })}>
            <CheckCircle2 className="h-4 w-4 mr-1" />Aprobar todas
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
          <div className="border rounded p-2"><div className="text-muted-foreground">Ventas totales (con IVA)</div><div className="font-bold">{fmt(ventasActualesIva)}</div></div>
          <div className="border rounded p-2"><div className="text-muted-foreground">Ventas sin IVA</div><div className="font-bold">{fmt(ventasActualesSinIva)}</div></div>
          <div className="border rounded p-2"><div className="text-muted-foreground">Excedente sobre BE (sin IVA)</div><div className="font-bold">{fmt(Math.max(0, ventasActualesSinIva - be.breakEvenWithoutIva))}</div></div>
          <div className="border rounded p-2 bg-primary/5"><div className="text-muted-foreground">Comisión total propuesta</div><div className="font-bold">{fmt(totalCommission)}</div></div>
        </div>

        {proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay ventas registradas aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">Asesor</th>
                  <th className="text-right">Ventas con IVA</th>
                  <th className="text-right">Ventas sin IVA</th>
                  <th className="text-right">Excedente</th>
                  <th className="text-right">% aplicado</th>
                  <th className="text-right">Comisión</th>
                  <th className="text-right">Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((p) => {
                  const key = p.advisor_id || "__unassigned__";
                  const saved = commissionByAdvisor.get(key);
                  return (
                    <tr key={key} className="border-b">
                      <td className="py-2">{p.advisor_name}</td>
                      <td className="text-right">{fmt(p.sales_with_iva)}</td>
                      <td className="text-right">{fmt(p.sales_without_iva)}</td>
                      <td className="text-right">{fmt(p.excedente)}</td>
                      <td className="text-right">{p.applied_pct.toFixed(1)}%</td>
                      <td className="text-right font-semibold">{fmt(p.commission_amount)}</td>
                      <td className="text-right">
                        {saved?.status === "aprobada" && <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Aprobada</Badge>}
                        {saved?.status === "rechazada" && <Badge variant="outline" className="text-destructive border-destructive/40">Rechazada</Badge>}
                        {!saved && <Badge variant="outline">Propuesta</Badge>}
                      </td>
                      <td className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" title="Aprobar"
                            onClick={() => approveOne.mutate({ feriaId: feria.id, proposal: p })}>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Rechazar"
                            onClick={() => reject.mutate({ feriaId: feria.id, proposal: p })}>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

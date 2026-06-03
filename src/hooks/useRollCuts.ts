import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RollTipo = "calor" | "frio";
export type RollStatus = "disponible" | "en_uso" | "consumido";

export interface RollCut {
  id: string;
  code: string;
  tipo: RollTipo;
  medida_cm: number;
  peso_inicial_g: number;
  peso_final_g: number | null;
  status: RollStatus;
  cortado_por: string;
  cortado_at: string;
  montado_por: string | null;
  montado_at: string | null;
  notas_inicio: string | null;
  finalizado_por: string | null;
  finalizado_at: string | null;
  notas_final: string | null;
  created_at: string;
  updated_at: string;
}

function pad2(n: number) { return n.toString().padStart(2, "0"); }

async function generateUniqueCode(tipo: RollTipo, medida_cm: number, existingCodes: Set<string>): Promise<string> {
  const prefix = tipo === "calor" ? "RC" : "RF";
  const d = new Date();
  const datePart = `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}`;
  const medidaPart = String(Math.round(medida_cm));
  const base = `${prefix}-${medidaPart}-${datePart}`;

  // Check DB for existing codes starting with base
  const { data } = await supabase
    .from("roll_cuts")
    .select("code")
    .like("code", `${base}%`);
  const taken = new Set<string>([...(data?.map((r) => r.code) || []), ...existingCodes]);

  if (!taken.has(base)) return base;
  for (let i = 0; i < 200; i++) {
    const suffix = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : "");
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export function useRollCuts() {
  const [rolls, setRolls] = useState<RollCut[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRolls = useCallback(async () => {
    const { data, error } = await supabase
      .from("roll_cuts" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Error cargando rollos: " + error.message);
      setLoading(false);
      return;
    }
    setRolls((data as any as RollCut[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRolls();
    const channel = supabase
      .channel("roll_cuts_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "roll_cuts" }, () => fetchRolls())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRolls]);

  const createCuts = async (params: {
    tipo: RollTipo;
    medida_cm: number;
    cortado_por: string;
    pesos: number[]; // gramos por cada rollo pequeño
  }) => {
    const generated = new Set<string>();
    const rows: any[] = [];
    for (const peso of params.pesos) {
      const code = await generateUniqueCode(params.tipo, params.medida_cm, generated);
      generated.add(code);
      rows.push({
        code,
        tipo: params.tipo,
        medida_cm: params.medida_cm,
        peso_inicial_g: peso,
        cortado_por: params.cortado_por,
        status: "disponible",
      });
    }
    const { error } = await supabase.from("roll_cuts" as any).insert(rows);
    if (error) { toast.error("Error guardando rollos: " + error.message); return false; }
    toast.success(`${rows.length} rollo(s) registrado(s)`);
    fetchRolls();
    return true;
  };

  const startUsage = async (id: string, montado_por: string, notas_inicio?: string) => {
    const { error } = await supabase
      .from("roll_cuts" as any)
      .update({ status: "en_uso", montado_por, montado_at: new Date().toISOString(), notas_inicio: notas_inicio || null })
      .eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Rollo en uso");
    fetchRolls();
    return true;
  };

  const finishUsage = async (id: string, finalizado_por: string, peso_final_g: number, notas_final?: string) => {
    const { error } = await supabase
      .from("roll_cuts" as any)
      .update({
        status: "consumido",
        finalizado_por,
        finalizado_at: new Date().toISOString(),
        peso_final_g,
        notas_final: notas_final || null,
      })
      .eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Rollo consumido");
    fetchRolls();
    return true;
  };

  const deleteRoll = async (id: string) => {
    const { error } = await supabase.from("roll_cuts" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Rollo eliminado");
    fetchRolls();
    return true;
  };

  return { rolls, loading, createCuts, startUsage, finishUsage, deleteRoll, refresh: fetchRolls };
}
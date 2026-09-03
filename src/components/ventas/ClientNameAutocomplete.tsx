import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { History } from "lucide-react";

export type KnownClient = {
  nombre: string;
  nit: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  ultima?: string | null;
};

/** Clientes a los que ya se les ha vendido (deduplicados por nombre). */
export function useKnownClients() {
  return useQuery({
    queryKey: ["known-clients"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("client_name, client_nit, client_phone, client_email, client_address, client_city, created_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      const map = new Map<string, KnownClient>();
      for (const o of (data ?? []) as any[]) {
        const nombre = (o.client_name ?? "").trim();
        if (!nombre) continue;
        const key = nombre.toLowerCase();
        const prev = map.get(key);
        if (!prev) {
          map.set(key, {
            nombre,
            nit: o.client_nit ?? "",
            telefono: o.client_phone ?? "",
            email: o.client_email ?? "",
            direccion: o.client_address ?? "",
            ciudad: o.client_city ?? "",
            ultima: o.created_at ?? null,
          });
        } else {
          // completar campos faltantes con registros más antiguos
          prev.nit ||= o.client_nit ?? "";
          prev.telefono ||= o.client_phone ?? "";
          prev.email ||= o.client_email ?? "";
          prev.direccion ||= o.client_address ?? "";
          prev.ciudad ||= o.client_city ?? "";
        }
      }
      return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
  });
}

type Props = {
  label?: string;
  name: string;
  required?: boolean;
  value?: string;
  onValueChange?: (v: string) => void;
  onSelect: (c: KnownClient) => void;
};

export default function ClientNameAutocomplete({
  label = "Nombre del cliente",
  name,
  required,
  value,
  onValueChange,
  onSelect,
}: Props) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState("");
  const text = controlled ? (value as string) : inner;
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const { data: clients = [] } = useKnownClients();

  const setText = (v: string) => {
    if (controlled) onValueChange?.(v);
    else setInner(v);
  };

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (q.length < 2) return [];
    return clients
      .filter((c) => c.nombre.toLowerCase().includes(q) || (c.nit ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [clients, text]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="space-y-1.5 relative" ref={boxRef}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={name}
        name={name}
        required={required}
        autoComplete="off"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-md border bg-popover shadow-md max-h-64 overflow-auto">
          <p className="px-2 py-1 text-[10px] uppercase text-muted-foreground flex items-center gap-1">
            <History className="h-3 w-3" /> Clientes anteriores
          </p>
          {matches.map((c) => (
            <button
              key={c.nombre}
              type="button"
              className="w-full text-left px-2 py-1.5 hover:bg-accent text-sm"
              onClick={() => {
                setText(c.nombre);
                onSelect(c);
                setOpen(false);
              }}
            >
              <span className="font-medium">{c.nombre}</span>
              <span className="block text-[11px] text-muted-foreground">
                {[c.nit, c.telefono, c.ciudad].filter(Boolean).join(" · ") || "Sin datos adicionales"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

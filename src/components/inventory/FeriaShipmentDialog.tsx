import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PackagePlus } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { useCreateFeriaShipment } from "@/hooks/useFeriaShipments";
import DebouncedSearchInput from "@/components/inventory/DebouncedSearchInput";

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function FeriaShipmentDialog({ feriaId, feriaName }: { feriaId: string; feriaName?: string }) {
  const { stockItems } = useInventory();
  const create = useCreateFeriaShipment();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<"" | "magical" | "sweatspot">("");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  const items = useMemo(() => {
    const q = norm(search.trim());
    return stockItems
      .filter((i) => i.category === "producto_terminado" && (i.brand === "magical" || i.brand === "sweatspot"))
      .filter((i) => !brandFilter || i.brand === brandFilter)
      .filter((i) => !q || norm(`${i.name} ${i.color ?? ""} ${i.product_type ?? ""} ${i.brand}`).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [stockItems, search, brandFilter]);

  const label = (i: (typeof stockItems)[number]) =>
    [i.name, i.product_type, i.color].filter(Boolean).join(" · ");

  const selectedCount = Object.values(selected).filter((q) => q > 0).length;
  const totalUnits = Object.values(selected).reduce((a, b) => a + (b || 0), 0);

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (checked) next[id] = next[id] || 1;
      else delete next[id];
      return next;
    });

  const submit = async () => {
    const payload = Object.entries(selected)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const it = stockItems.find((s) => s.id === id)!;
        return {
          stock_item_id: it.id,
          item_name: label(it),
          brand: it.brand,
          logo: it.logo ?? null,
          quantity: qty,
        };
      });
    await create.mutateAsync({ feria_id: feriaId, direction: "salida", notes: notes || null, items: payload });
    setSelected({});
    setNotes("");
    setSearch("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><PackagePlus className="h-4 w-4 mr-1" /> Nueva salida</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nueva salida{feriaName ? ` — ${feriaName}` : ""}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[220px]">
            <DebouncedSearchInput value={search} onChange={setSearch} placeholder="Buscar referencia…" />
          </div>
          {(["", "magical", "sweatspot"] as const).map((b) => (
            <Button
              key={b || "all"}
              size="sm"
              variant={brandFilter === b ? "default" : "outline"}
              onClick={() => setBrandFilter(b)}
            >
              {b === "" ? "Todas" : b === "magical" ? "Magical" : "Sweatspot"}
            </Button>
          ))}
        </div>

        <div className="max-h-[46vh] overflow-auto rounded-md border divide-y">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin referencias</p>
          ) : (
            items.map((i) => {
              const checked = selected[i.id] !== undefined;
              return (
                <div key={i.id} className="flex items-center gap-3 px-3 py-2">
                  <Checkbox checked={checked} onCheckedChange={(c) => toggle(i.id, Boolean(c))} id={`it-${i.id}`} />
                  <Label htmlFor={`it-${i.id}`} className="flex-1 text-xs cursor-pointer">
                    {label(i)}
                    <span className="ml-2 text-muted-foreground capitalize">{i.brand}</span>
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {i.logo ? "Marcado" : "Sin marcar"}
                    </Badge>
                  </Label>
                  <span className="text-[11px] text-muted-foreground w-24 text-right">
                    Disp: {i.available}
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={i.available}
                    disabled={!checked}
                    className="w-24 h-8"
                    value={checked ? selected[i.id] : ""}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(Number(e.target.value) || 0, i.available));
                      setSelected((prev) => ({ ...prev, [i.id]: v }));
                    }}
                  />
                </div>
              );
            })
          )}
        </div>

        <Textarea
          placeholder="Notas de la salida (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {selectedCount} referencias · {totalUnits} unidades
          </p>
          <Button onClick={submit} disabled={create.isPending || totalUnits === 0}>
            {create.isPending ? "Confirmando…" : "Confirmar salida y descontar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History } from "lucide-react";
import { useInventoryMovements } from "@/hooks/useInventoryMovements";

const KIND_LABEL: Record<string, { label: string; cls: string }> = {
  entrada: { label: "Entrada", cls: "border-emerald-500/60 text-emerald-700 dark:text-emerald-400" },
  salida: { label: "Salida", cls: "border-orange-500/60 text-orange-700 dark:text-orange-400" },
  reserva: { label: "Reserva", cls: "border-amber-500/60 text-amber-700 dark:text-amber-400" },
  liberar_reserva: { label: "Liberar", cls: "border-blue-500/60 text-blue-700 dark:text-blue-400" },
};

const CAT_LABEL: Record<string, string> = {
  materia_prima: "Materia prima",
  cuerpos_referencias: "Cuerpos",
  producto_terminado: "Producto terminado",
};

export default function MovementHistoryTable() {
  const { movements, isLoading } = useInventoryMovements();
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("todas");
  const [catFilter, setCatFilter] = useState("todas");
  const [kindFilter, setKindFilter] = useState("todos");

  const brands = useMemo(
    () => Array.from(new Set(movements.map((m) => m.brand))).sort(),
    [movements],
  );

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (brandFilter !== "todas" && m.brand !== brandFilter) return false;
      if (catFilter !== "todas" && m.category !== catFilter) return false;
      const kind = m.movement_kind || (m.direction === "retorno" ? "entrada" : "salida");
      if (kindFilter !== "todos" && kind !== kindFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !m.item_name.toLowerCase().includes(q) &&
          !(m.requested_by_name || "").toLowerCase().includes(q) &&
          !(m.purpose || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [movements, brandFilter, catFilter, kindFilter, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-primary" /> Historial de movimientos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input placeholder="Buscar ítem, solicitante, motivo..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="salida">Salidas</SelectItem>
              <SelectItem value="reserva">Reservas</SelectItem>
              <SelectItem value="liberar_reserva">Liberaciones</SelectItem>
            </SelectContent>
          </Select>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las marcas</SelectItem>
              {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {Object.entries(CAT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Ítem</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead>Solicita</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Cargando...</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Sin movimientos</TableCell></TableRow>
              )}
              {filtered.map((m) => {
                const k = m.movement_kind || (m.direction === "retorno" ? "entrada" : "salida");
                const meta = KIND_LABEL[k] || KIND_LABEL.salida;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(m.recorded_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={meta.cls}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-xs">{m.brand}</TableCell>
                    <TableCell className="text-xs">{CAT_LABEL[m.category] || m.category}</TableCell>
                    <TableCell className="font-medium text-sm">{m.item_name}</TableCell>
                    <TableCell className="text-right font-semibold">{m.quantity}</TableCell>
                    <TableCell className="text-xs">{m.requested_by_name || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[260px] truncate" title={m.purpose || m.reason || ""}>
                      {m.purpose || m.reason || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
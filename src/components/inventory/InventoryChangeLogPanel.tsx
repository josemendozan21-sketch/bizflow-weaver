import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Download, Lock, Loader2 } from "lucide-react";
import { useInventoryAuditLog, type InventoryAuditEntry } from "@/hooks/useInventoryAuditLog";
import { matchesQuery } from "@/lib/search";

const ACTION_LABEL: Record<string, { label: string; cls: string }> = {
  creacion: { label: "Creación", cls: "border-emerald-500/60 text-emerald-700 dark:text-emerald-400" },
  edicion: { label: "Edición", cls: "border-blue-500/60 text-blue-700 dark:text-blue-400" },
  eliminacion: { label: "Eliminación", cls: "border-red-500/60 text-red-700 dark:text-red-400" },
};

const FIELD_LABEL: Record<string, string> = {
  available: "Cantidad disponible",
  in_process: "En proceso",
  name: "Nombre",
  referencia: "Referencia",
  brand: "Marca",
  category: "Categoría",
  product_type: "Tipo",
  min_stock: "Stock mínimo",
  unit: "Unidad",
  color: "Color",
};

const CATEGORY_LABEL: Record<string, string> = {
  materia_prima: "Materia prima",
  cuerpos_referencias: "Cuerpos",
  producto_terminado: "Producto terminado",
  importados: "Importados",
};

const BRAND_LABEL: Record<string, string> = {
  magical_warmers: "Magical Warmers",
  magical: "Magical Warmers",
  sweatspot: "Sweatspot",
  ambas: "Ambas",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });

const label = (map: Record<string, string>, v?: string | null) =>
  (v && (map[v] ?? map[v.toLowerCase()])) || v || "—";

export default function InventoryChangeLogPanel() {
  const { data: entries = [], isLoading } = useInventoryAuditLog();
  const [search, setSearch] = useState("");
  const [user, setUser] = useState("todos");
  const [action, setAction] = useState("todas");
  const [brand, setBrand] = useState("todas");
  const [category, setCategory] = useState("todas");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const users = useMemo(
    () => Array.from(new Set(entries.map((e) => e.changed_by_email).filter(Boolean) as string[])).sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (user !== "todos" && e.changed_by_email !== user) return false;
      if (action !== "todas" && e.action !== action) return false;
      if (brand !== "todas" && (e.brand || "").toLowerCase() !== brand) return false;
      if (category !== "todas" && e.category !== category) return false;
      if (from && e.changed_at < new Date(`${from}T00:00:00`).toISOString()) return false;
      if (to && e.changed_at > new Date(`${to}T23:59:59`).toISOString()) return false;
      if (search && !matchesQuery(`${e.item_name ?? ""} ${e.changed_by_email ?? ""}`, search)) return false;
      return true;
    });
  }, [entries, user, action, brand, category, from, to, search]);

  const exportExcel = () => {
    const rows = filtered.map((e: InventoryAuditEntry) => ({
      "Fecha y hora": fmtDate(e.changed_at),
      Usuario: e.changed_by_email || "Sistema",
      Acción: ACTION_LABEL[e.action]?.label ?? e.action,
      Producto: e.item_name || "—",
      Marca: label(BRAND_LABEL, e.brand),
      Categoría: label(CATEGORY_LABEL, e.category),
      Tipo: e.product_type || "—",
      Campo: label(FIELD_LABEL, e.field),
      "Valor anterior": e.old_value ?? "—",
      "Valor nuevo": e.new_value ?? "—",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Historial de cambios");
    XLSX.writeFile(wb, `historial_cambios_inventario_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" /> Historial de cambios
            <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
          </CardTitle>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Registro de solo lectura: no puede modificarse ni eliminarse.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportExcel} disabled={filtered.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Descargar Excel
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Buscar producto o usuario</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ej: Gafas, inventarios1..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Usuario</Label>
            <Select value={user} onValueChange={setUser}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {users.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Acción</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="creacion">Creación</SelectItem>
                <SelectItem value="edicion">Edición</SelectItem>
                <SelectItem value="eliminacion">Eliminación</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Marca</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="magical_warmers">Magical Warmers</SelectItem>
                <SelectItem value="magical">Magical (cuerpos)</SelectItem>
                <SelectItem value="sweatspot">Sweatspot</SelectItem>
                <SelectItem value="ambas">Ambas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando historial...
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay cambios registrados con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha y hora</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Marca / Categoría</TableHead>
                  <TableHead>Campo</TableHead>
                  <TableHead>Cambio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-xs">{fmtDate(e.changed_at)}</TableCell>
                    <TableCell className="text-xs">{e.changed_by_email || "Sistema"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${ACTION_LABEL[e.action]?.cls ?? ""}`}>
                        {ACTION_LABEL[e.action]?.label ?? e.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {e.item_name || "—"}
                      {e.product_type ? <span className="ml-1 text-xs text-muted-foreground">({e.product_type})</span> : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {label(BRAND_LABEL, e.brand)} · {label(CATEGORY_LABEL, e.category)}
                    </TableCell>
                    <TableCell className="text-xs">{label(FIELD_LABEL, e.field)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      <span className="text-muted-foreground line-through">{e.old_value ?? "—"}</span>
                      <span className="mx-1">→</span>
                      <span className="font-semibold">{e.new_value ?? "—"}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

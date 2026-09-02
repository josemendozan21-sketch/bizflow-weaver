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
import { matchesQuery } from "@/lib/search";

/** Entrada normalizada de historial, común a inventario / producción / estampación */
export interface ChangeLogRow {
  id: string;
  changed_at: string;
  changed_by_email: string | null;
  action: string;
  /** Nombre del producto, pedido o elemento afectado */
  entity: string;
  /** Texto adicional junto al nombre (tipo de producto, etapa, etc.) */
  entity_note?: string | null;
  /** Segunda columna descriptiva: marca · categoría / área */
  context?: string | null;
  /** Número de pedido, si aplica */
  order_code?: string | null;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
}

export interface ChangeLogFilterConfig {
  label: string;
  /** Valores: clave -> etiqueta */
  options: Record<string, string>;
  /** Devuelve la clave del registro para comparar con la opción escogida */
  get: (row: ChangeLogRow) => string | null | undefined;
}

export const ACTION_LABEL: Record<string, { label: string; cls: string }> = {
  creacion: { label: "Creación", cls: "border-emerald-500/60 text-emerald-700 dark:text-emerald-400" },
  edicion: { label: "Edición", cls: "border-blue-500/60 text-blue-700 dark:text-blue-400" },
  eliminacion: { label: "Eliminación", cls: "border-red-500/60 text-red-700 dark:text-red-400" },
};

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });

interface Props {
  title?: string;
  rows: ChangeLogRow[];
  isLoading?: boolean;
  fieldLabels?: Record<string, string>;
  /** Etiquetas de columnas específicas del área */
  entityHeader?: string;
  contextHeader?: string;
  /** Filtros adicionales (marca, categoría, área...) */
  filters?: ChangeLogFilterConfig[];
  showOrderCode?: boolean;
  exportFileName?: string;
  searchPlaceholder?: string;
}

export default function ChangeLogPanel({
  title = "Historial de cambios",
  rows,
  isLoading = false,
  fieldLabels = {},
  entityHeader = "Elemento",
  contextHeader = "Detalle",
  filters = [],
  showOrderCode = false,
  exportFileName = "historial_cambios",
  searchPlaceholder = "Buscar...",
}: Props) {
  const [search, setSearch] = useState("");
  const [user, setUser] = useState("todos");
  const [action, setAction] = useState("todas");
  const [extra, setExtra] = useState<Record<number, string>>({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const users = useMemo(
    () => Array.from(new Set(rows.map((r) => r.changed_by_email).filter(Boolean) as string[])).sort(),
    [rows],
  );

  const fieldLabel = (f: string | null) => (f && (fieldLabels[f] ?? f)) || "—";

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (user !== "todos" && r.changed_by_email !== user) return false;
      if (action !== "todas" && r.action !== action) return false;
      for (let i = 0; i < filters.length; i++) {
        const sel = extra[i] ?? "todas";
        if (sel !== "todas" && (filters[i].get(r) || "").toLowerCase() !== sel.toLowerCase()) return false;
      }
      if (from && r.changed_at < new Date(`${from}T00:00:00`).toISOString()) return false;
      if (to && r.changed_at > new Date(`${to}T23:59:59`).toISOString()) return false;
      if (search && !matchesQuery([r.entity, r.changed_by_email, r.context, r.order_code], search)) return false;
      return true;
    });
  }, [rows, user, action, extra, filters, from, to, search]);

  const exportExcel = () => {
    const data = filtered.map((r) => ({
      "Fecha y hora": fmtDateTime(r.changed_at),
      Usuario: r.changed_by_email || "Sistema",
      Acción: ACTION_LABEL[r.action]?.label ?? r.action,
      ...(showOrderCode ? { "N° pedido": r.order_code || "—" } : {}),
      [entityHeader]: r.entity || "—",
      [contextHeader]: r.context || "—",
      Campo: fieldLabel(r.field),
      "Valor anterior": r.old_value ?? "—",
      "Valor nuevo": r.new_value ?? "—",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Historial");
    XLSX.writeFile(wb, `${exportFileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" /> {title}
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
            <Label className="text-xs">Buscar</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} />
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
          {filters.map((f, i) => (
            <div className="space-y-1" key={f.label}>
              <Label className="text-xs">{f.label}</Label>
              <Select value={extra[i] ?? "todas"} onValueChange={(v) => setExtra((p) => ({ ...p, [i]: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {Object.entries(f.options).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
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
                  {showOrderCode && <TableHead>N° pedido</TableHead>}
                  <TableHead>{entityHeader}</TableHead>
                  <TableHead>{contextHeader}</TableHead>
                  <TableHead>Campo</TableHead>
                  <TableHead>Cambio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{fmtDateTime(r.changed_at)}</TableCell>
                    <TableCell className="text-xs">{r.changed_by_email || "Sistema"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${ACTION_LABEL[r.action]?.cls ?? ""}`}>
                        {ACTION_LABEL[r.action]?.label ?? r.action}
                      </Badge>
                    </TableCell>
                    {showOrderCode && (
                      <TableCell className="whitespace-nowrap font-mono text-xs">{r.order_code || "—"}</TableCell>
                    )}
                    <TableCell className="text-sm font-medium">
                      {r.entity || "—"}
                      {r.entity_note ? <span className="ml-1 text-xs text-muted-foreground">({r.entity_note})</span> : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.context || "—"}</TableCell>
                    <TableCell className="text-xs">{fieldLabel(r.field)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      <span className="text-muted-foreground line-through">{r.old_value ?? "—"}</span>
                      <span className="mx-1">→</span>
                      <span className="font-semibold">{r.new_value ?? "—"}</span>
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

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History } from "lucide-react";
import { useProductionOrders } from "@/hooks/useProductionOrders";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "border-amber-500/60 text-amber-700 dark:text-amber-400" },
  en_proceso: { label: "En proceso", cls: "border-blue-500/60 text-blue-700 dark:text-blue-400" },
  finalizado: { label: "Finalizado", cls: "border-emerald-500/60 text-emerald-700 dark:text-emerald-400" },
};

export default function ProductionMovementHistory() {
  const { bodyTasks, isBodyTasksLoading } = useProductionOrders("magical");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState("todos");

  const filtered = useMemo(() => {
    return bodyTasks.filter((task) => {
      if (statusFilter !== "todos" && task.status !== statusFilter) return false;
      if (typeFilter !== "todos" && task.tipo_plastico !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !task.referencia.toLowerCase().includes(q) &&
          !(task.fabricated_by || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [bodyTasks, search, statusFilter, typeFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-primary" /> Historial de producción — Cuerpos
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Solo muestra tareas creadas y trabajadas dentro de Producción. No incluye entradas ni salidas manuales de Inventarios.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="Buscar referencia o fabricante..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_proceso">En proceso</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="frio">Frío</SelectItem>
              <SelectItem value="calor">Térmico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creada</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead>Fabricó</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Finalizada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isBodyTasksLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Cargando...</TableCell></TableRow>
              )}
              {!isBodyTasksLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Sin registros de producción</TableCell></TableRow>
              )}
              {filtered.map((task) => {
                const meta = STATUS_LABEL[task.status] || STATUS_LABEL.pendiente;
                return (
                  <TableRow key={task.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(task.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{task.referencia}</TableCell>
                    <TableCell className="text-xs">{task.tipo_plastico === "calor" ? "Térmico" : "Frío"}</TableCell>
                    <TableCell className="text-right font-semibold">{task.unidades}</TableCell>
                    <TableCell className="text-xs">{task.fabricated_by || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {task.completed_at
                        ? new Date(task.completed_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
                        : "—"}
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
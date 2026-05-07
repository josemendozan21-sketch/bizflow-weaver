import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import RegisterMovementDialog from "./RegisterMovementDialog";
import { useInventoryMovements, type MovementArea } from "@/hooks/useInventoryMovements";

const AREA_LABELS: Record<MovementArea, string> = {
  produccion: "Producción",
  estampacion: "Estampación",
  logistica: "Logística",
  asesor_comercial: "Asesor",
  feria: "Feria",
};

const InventoryMovementsPanel = () => {
  const { movements, isLoading } = useInventoryMovements();
  const [areaFilter, setAreaFilter] = useState<string>("todas");
  const [dirFilter, setDirFilter] = useState<string>("todas");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (areaFilter !== "todas" && m.area !== areaFilter) return false;
      if (dirFilter !== "todas" && m.direction !== dirFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!m.item_name.toLowerCase().includes(q) && !m.brand.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [movements, areaFilter, dirFilter, search]);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          Movimientos entre áreas
        </CardTitle>
        <RegisterMovementDialog />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            placeholder="Buscar ítem o marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={dirFilter} onValueChange={setDirFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos los tipos</SelectItem>
              <SelectItem value="entrega">Solo entregas</SelectItem>
              <SelectItem value="retorno">Solo retornos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las áreas</SelectItem>
              {(Object.keys(AREA_LABELS) as MovementArea[]).map((a) => (
                <SelectItem key={a} value={a}>{AREA_LABELS[a]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Ítem</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Registrado por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Cargando...</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Sin movimientos</TableCell></TableRow>
              )}
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(m.recorded_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                  </TableCell>
                  <TableCell>
                    {m.direction === "entrega" ? (
                      <Badge variant="outline" className="gap-1 border-orange-500/50 text-orange-700 dark:text-orange-400">
                        <ArrowUpFromLine className="h-3 w-3" /> Entrega
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-700 dark:text-emerald-400">
                        <ArrowDownToLine className="h-3 w-3" /> Retorno
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="secondary">{AREA_LABELS[m.area]}</Badge></TableCell>
                  <TableCell>
                    <div className="font-medium">{m.item_name}</div>
                    <div className="text-xs text-muted-foreground">{m.brand}</div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{m.quantity}</TableCell>
                  <TableCell className="text-xs max-w-[240px] truncate" title={m.reason || ""}>{m.reason || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.recorded_by_name || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryMovementsPanel;
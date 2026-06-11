import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserPlus, Search } from "lucide-react";
import { useCustomers, useCustomerDashboard, SPORT_OPTIONS } from "@/hooks/useCustomers";
import { CreateCustomerDialog } from "@/components/clientes/CreateCustomerDialog";
import { CustomerProfileDialog } from "@/components/clientes/CustomerProfileDialog";

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string>("");
  const [sport, setSport] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: customers = [] } = useCustomers({
    search: search.trim() || undefined,
    city: city || undefined,
    sport: sport || undefined,
    status: status || undefined,
  });
  const { data: dash } = useCustomerDashboard();

  const cities = useMemo(() => Array.from(new Set(customers.map((c) => c.city).filter(Boolean))) as string[], [customers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Clientes</h1>
          <p className="text-xs text-muted-foreground">Base de datos de clientes y su historial de compras</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><UserPlus className="h-4 w-4 mr-1" /> Nuevo cliente</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Card className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Total clientes</p><p className="text-xl font-bold">{dash?.totalCust ?? 0}</p></Card>
        <Card className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Nuevos este mes</p><p className="text-xl font-bold">{dash?.newThisMonth ?? 0}</p></Card>
        <Card className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Activos (30d)</p><p className="text-xl font-bold text-primary">{dash?.active30 ?? 0}</p></Card>
        <Card className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Inactivos (90d+)</p><p className="text-xl font-bold text-muted-foreground">{dash?.inactive90 ?? 0}</p></Card>
        <Card className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Valor prom. / cliente</p><p className="text-xl font-bold">{fmt(dash?.avgPerCustomer ?? 0)}</p></Card>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, cédula, teléfono o email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
          <Select value={city} onValueChange={(v) => setCity(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Ciudad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ciudades</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sport} onValueChange={(v) => setSport(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Deporte" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los deportes</SelectItem>
              {SPORT_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead className="text-right">Compras</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Última</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Sin clientes.</TableCell></TableRow>
            ) : customers.map((c) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-accent" onClick={() => setOpenId(c.id)}>
                <TableCell className="font-medium">{c.full_name}</TableCell>
                <TableCell className="text-xs">{c.document ?? "—"}</TableCell>
                <TableCell className="text-xs">{c.phone ?? "—"}</TableCell>
                <TableCell className="text-xs">{c.city ?? "—"}</TableCell>
                <TableCell className="text-right">{c.purchase_count}</TableCell>
                <TableCell className="text-right font-medium">{fmt(Number(c.total_spent))}</TableCell>
                <TableCell className="text-xs">{c.last_purchase_at ? new Date(c.last_purchase_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell><Badge variant={c.status === "activo" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {dash && dash.top20.length > 0 && (
        <Card className="p-3">
          <h2 className="font-semibold text-sm mb-2">Top 20 clientes por compras</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead className="text-right">Compras</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dash.top20.map((c: any, i: number) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-accent" onClick={() => setOpenId(c.id)}>
                  <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell className="text-xs">{c.city ?? "—"}</TableCell>
                  <TableCell className="text-right">{c.purchase_count}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(Number(c.total_spent))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <CreateCustomerDialog open={showCreate} onOpenChange={setShowCreate} onCreated={(c) => setOpenId(c.id)} />
      <CustomerProfileDialog customerId={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}
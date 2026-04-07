import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProductionStore } from "@/stores/productionStore";
import { Package, Truck, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { StampingTask, FillingTask } from "@/types/production";

interface DispatchOrder {
  id: string;
  clientName: string;
  brand: "magical" | "sweatspot";
  quantity: number;
  product: string;
  readyDate: string;
}

const Logistica = () => {
  const { stampingTasks, fillingTasks } = useProductionStore();
  const [dispatched, setDispatched] = useState<
    Array<DispatchOrder & { dispatchedAt: string }>
  >([]);

  // Sweatspot orders ready: stamping completed + readyForSealing
  const sweatspotReady: DispatchOrder[] = stampingTasks
    .filter(
      (t) =>
        t.brand === "sweatspot" &&
        t.status === "completado" &&
        (t as any).readyForSealing &&
        !dispatched.some((d) => d.id === `sw-${t.id}`)
    )
    .map((t) => ({
      id: `sw-${t.id}`,
      clientName: t.clientName,
      brand: "sweatspot" as const,
      quantity: t.quantity,
      product: `Termo ${(t as any).thermoSize}`,
      readyDate: t.createdAt,
    }));

  // Magical orders ready: filling completed
  const magicalReady: DispatchOrder[] = fillingTasks
    .filter(
      (t) =>
        t.status === "completado" &&
        !dispatched.some((d) => d.id === `mg-${t.id}`)
    )
    .map((t) => ({
      id: `mg-${t.id}`,
      clientName: t.clientName,
      brand: "magical" as const,
      quantity: t.quantity,
      product: t.product,
      readyDate: t.createdAt,
    }));

  const readyOrders = [...sweatspotReady, ...magicalReady];

  const handleDispatch = (order: DispatchOrder) => {
    setDispatched((prev) => [
      ...prev,
      { ...order, dispatchedAt: new Date().toISOString().slice(0, 10) },
    ]);
  };

  const brandLabel = (brand: string) =>
    brand === "magical" ? "Magical Warmers" : "Sweatspot";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Logística</h1>
        <p className="text-muted-foreground">
          Gestión de despachos y seguimiento de envíos
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-md bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Listos para despacho</p>
              <p className="text-2xl font-bold text-foreground">{readyOrders.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-md bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Despachados</p>
              <p className="text-2xl font-bold text-foreground">{dispatched.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-md bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unidades totales listas</p>
              <p className="text-2xl font-bold text-foreground">
                {readyOrders.reduce((sum, o) => sum + o.quantity, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ready" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ready" className="gap-1.5">
            <Truck className="h-4 w-4" />
            Listos para despacho
            {readyOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {readyOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dispatched" className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Despachados
            {dispatched.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {dispatched.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ready">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pedidos listos para despacho</CardTitle>
            </CardHeader>
            <CardContent>
              {readyOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mb-3 opacity-40" />
                  <p className="font-medium">No hay pedidos listos para despacho</p>
                  <p className="text-sm">
                    Los pedidos aparecerán aquí cuando la producción se complete.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead>Fecha listo</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readyOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.clientName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.brand === "magical" ? "default" : "secondary"
                            }
                          >
                            {brandLabel(order.brand)}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.product}</TableCell>
                        <TableCell className="text-right font-medium">
                          {order.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell>{order.readyDate}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleDispatch(order)}
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            Despachar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatched">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pedidos despachados</CardTitle>
            </CardHeader>
            <CardContent>
              {dispatched.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mb-3 opacity-40" />
                  <p className="font-medium">No hay pedidos despachados aún</p>
                  <p className="text-sm">
                    Los pedidos despachados aparecerán en este historial.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead>Fecha despacho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatched.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.clientName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.brand === "magical" ? "default" : "secondary"
                            }
                          >
                            {brandLabel(order.brand)}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.product}</TableCell>
                        <TableCell className="text-right font-medium">
                          {order.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell>{order.dispatchedAt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Logistica;

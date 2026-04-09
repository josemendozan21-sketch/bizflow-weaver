import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, DollarSign, Save } from "lucide-react";
import { toast } from "sonner";

interface ProductCost {
  id: string;
  product_name: string;
  brand: string;
  raw_material_cost: number;
  production_cost: number;
  total_cost: number | null;
}

const Costos = () => {
  const { role } = useAuth();
  const [costs, setCosts] = useState<ProductCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProduct, setNewProduct] = useState({ product_name: "", brand: "magical", raw_material_cost: 0, production_cost: 0 });

  useEffect(() => { fetchCosts(); }, []);

  if (role !== "admin") return <Navigate to="/" replace />;

  const fetchCosts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("product_costs").select("*").order("brand").order("product_name");
    if (error) { toast.error("Error al cargar costos"); }
    setCosts((data as ProductCost[]) || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newProduct.product_name.trim()) { toast.error("Nombre del producto requerido"); return; }
    const { error } = await supabase.from("product_costs").insert({
      product_name: newProduct.product_name,
      brand: newProduct.brand,
      raw_material_cost: newProduct.raw_material_cost,
      production_cost: newProduct.production_cost,
    });
    if (error) { toast.error("Error al agregar producto"); return; }
    toast.success("Producto agregado");
    setNewProduct({ product_name: "", brand: "magical", raw_material_cost: 0, production_cost: 0 });
    fetchCosts();
  };

  const handleUpdate = async (item: ProductCost) => {
    const { error } = await supabase.from("product_costs").update({
      raw_material_cost: item.raw_material_cost,
      production_cost: item.production_cost,
    }).eq("id", item.id);
    if (error) { toast.error("Error al actualizar"); return; }
    toast.success("Costo actualizado");
    fetchCosts();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("product_costs").delete().eq("id", id);
    if (error) { toast.error("Error al eliminar"); return; }
    toast.success("Producto eliminado");
    fetchCosts();
  };

  const updateCostField = (id: string, field: string, value: number) => {
    setCosts((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };

  const fmt = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="h-6 w-6" /> Costos de productos
        </h1>
        <p className="text-muted-foreground">Defina los costos de materia prima y producción por producto</p>
      </div>

      {/* Add new product */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agregar producto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_140px_130px_130px_auto] gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Producto</label>
              <Input value={newProduct.product_name} onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })} placeholder="Nombre del producto" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Marca</label>
              <Select value={newProduct.brand} onValueChange={(v) => setNewProduct({ ...newProduct, brand: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="magical">Magical</SelectItem>
                  <SelectItem value="sweatspot">Sweatspot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Materia prima</label>
              <Input type="number" min={0} value={newProduct.raw_material_cost} onChange={(e) => setNewProduct({ ...newProduct, raw_material_cost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Producción</label>
              <Input type="number" min={0} value={newProduct.production_cost} onChange={(e) => setNewProduct({ ...newProduct, production_cost: parseFloat(e.target.value) || 0 })} />
            </div>
            <Button onClick={handleAdd} className="gap-1"><Plus className="h-4 w-4" /> Agregar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Costs table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos registrados ({costs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Cargando...</p>
          ) : costs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay productos registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-right">Materia prima</TableHead>
                  <TableHead className="text-right">Producción</TableHead>
                  <TableHead className="text-right">Costo total</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.product_name}</TableCell>
                    <TableCell>
                      <Badge variant={c.brand === "magical" ? "default" : "secondary"}>
                        {c.brand === "magical" ? "Magical" : "Sweatspot"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input type="number" min={0} className="w-28 ml-auto text-right" value={c.raw_material_cost} onChange={(e) => updateCostField(c.id, "raw_material_cost", parseFloat(e.target.value) || 0)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input type="number" min={0} className="w-28 ml-auto text-right" value={c.production_cost} onChange={(e) => updateCostField(c.id, "production_cost", parseFloat(e.target.value) || 0)} />
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {fmt(c.raw_material_cost + c.production_cost)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdate(c)} title="Guardar">
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)} title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Costos;

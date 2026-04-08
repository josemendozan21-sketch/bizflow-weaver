import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Check, X, FlaskConical, AlertTriangle } from "lucide-react";
import { useInventoryStore, type MaterialConfig } from "@/stores/inventoryStore";

const PRODUCT_TYPES = ["Frío", "Térmico"] as const;

const MaterialConfigSection = () => {
  const { materialConfigs, addMaterialConfig, updateMaterialConfig, deleteMaterialConfig } = useInventoryStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    productName: "", productType: "Frío", gramsPerUnit: "",
    finishedUnits: "0", bodyUnits: "0", minBodyUnits: "0", minFinishedUnits: "0",
  });

  const resetForm = () => {
    setForm({ productName: "", productType: "Frío", gramsPerUnit: "", finishedUnits: "0", bodyUnits: "0", minBodyUnits: "0", minFinishedUnits: "0" });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!form.productName || !form.productType || !form.gramsPerUnit) return;
    addMaterialConfig({
      productName: form.productName,
      productType: form.productType,
      gramsPerUnit: Number(form.gramsPerUnit),
      finishedUnits: Number(form.finishedUnits) || 0,
      bodyUnits: Number(form.bodyUnits) || 0,
      minBodyUnits: Number(form.minBodyUnits) || 0,
      minFinishedUnits: Number(form.minFinishedUnits) || 0,
    });
    resetForm();
  };

  const handleEdit = (config: MaterialConfig) => {
    setEditingId(config.id);
    setForm({
      productName: config.productName,
      productType: config.productType,
      gramsPerUnit: String(config.gramsPerUnit),
      finishedUnits: String(config.finishedUnits),
      bodyUnits: String(config.bodyUnits),
      minBodyUnits: String(config.minBodyUnits),
      minFinishedUnits: String(config.minFinishedUnits),
    });
  };

  const handleUpdate = () => {
    if (!editingId || !form.productName || !form.productType || !form.gramsPerUnit) return;
    updateMaterialConfig(editingId, {
      productName: form.productName,
      productType: form.productType,
      gramsPerUnit: Number(form.gramsPerUnit),
      finishedUnits: Number(form.finishedUnits) || 0,
      bodyUnits: Number(form.bodyUnits) || 0,
      minBodyUnits: Number(form.minBodyUnits) || 0,
      minFinishedUnits: Number(form.minFinishedUnits) || 0,
    });
    resetForm();
  };

  const isLow = (current: number, min: number) => min > 0 && current <= min;

  const renderFormCells = (onSave: () => void) => (
    <>
      <TableCell>
        <Input placeholder="Ej: Lumbar" value={form.productName}
          onChange={(e) => setForm({ ...form, productName: e.target.value })} className="h-8" />
      </TableCell>
      <TableCell>
        <Select value={form.productType} onValueChange={(v) => setForm({ ...form, productType: v })}>
          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRODUCT_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <Input type="number" min={0} placeholder="720" value={form.gramsPerUnit}
          onChange={(e) => setForm({ ...form, gramsPerUnit: e.target.value })} className="h-8 w-20 ml-auto text-right" />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-1 items-center justify-end">
          <Input type="number" min={0} value={form.bodyUnits}
            onChange={(e) => setForm({ ...form, bodyUnits: e.target.value })} className="h-8 w-16 text-right" />
          <span className="text-xs text-muted-foreground">mín:</span>
          <Input type="number" min={0} value={form.minBodyUnits}
            onChange={(e) => setForm({ ...form, minBodyUnits: e.target.value })} className="h-8 w-16 text-right" />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-1 items-center justify-end">
          <Input type="number" min={0} value={form.finishedUnits}
            onChange={(e) => setForm({ ...form, finishedUnits: e.target.value })} className="h-8 w-16 text-right" />
          <span className="text-xs text-muted-foreground">mín:</span>
          <Input type="number" min={0} value={form.minFinishedUnits}
            onChange={(e) => setForm({ ...form, minFinishedUnits: e.target.value })} className="h-8 w-16 text-right" />
        </div>
      </TableCell>
      <TableCell className="text-right space-x-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onSave}>
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={resetForm}>
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Configuración de productos — Magical Warmers</CardTitle>
        </div>
        {!isAdding && (
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />Agregar producto
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del producto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Consumo / ud (g)</TableHead>
              <TableHead className="text-right">Cuerpos (uds)</TableHead>
              <TableHead className="text-right">Terminado (uds)</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materialConfigs.map((config) =>
              editingId === config.id ? (
                <TableRow key={config.id}>{renderFormCells(handleUpdate)}</TableRow>
              ) : (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.productName}</TableCell>
                  <TableCell>
                    <Badge variant={config.productType === "Frío" ? "default" : "secondary"}>
                      {config.productType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold">{config.gramsPerUnit}</span>
                    <span className="text-muted-foreground ml-1">g</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isLow(config.bodyUnits, config.minBodyUnits) && (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                      <span className={`font-semibold ${isLow(config.bodyUnits, config.minBodyUnits) ? "text-orange-600" : ""}`}>
                        {config.bodyUnits}
                      </span>
                      <span className="text-muted-foreground ml-1">/ {config.minBodyUnits}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isLow(config.finishedUnits, config.minFinishedUnits) && (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                      <span className={`font-semibold ${isLow(config.finishedUnits, config.minFinishedUnits) ? "text-orange-600" : ""}`}>
                        {config.finishedUnits}
                      </span>
                      <span className="text-muted-foreground ml-1">/ {config.minFinishedUnits}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(config)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteMaterialConfig(config.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            )}
            {isAdding && <TableRow>{renderFormCells(handleAdd)}</TableRow>}
            {materialConfigs.length === 0 && !isAdding && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay productos configurados. Haz clic en "Agregar producto" para comenzar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MaterialConfigSection;

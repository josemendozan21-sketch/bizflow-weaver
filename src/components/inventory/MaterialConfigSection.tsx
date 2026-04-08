import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Check, X, FlaskConical } from "lucide-react";
import { useInventoryStore, type MaterialConfig } from "@/stores/inventoryStore";

const PRODUCT_TYPES = ["Frío", "Térmico"] as const;

const MaterialConfigSection = () => {
  const { materialConfigs, addMaterialConfig, updateMaterialConfig, deleteMaterialConfig } = useInventoryStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ productName: "", productType: "Frío", gramsPerUnit: "" });

  const resetForm = () => {
    setForm({ productName: "", productType: "Frío", gramsPerUnit: "" });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!form.productName || !form.productType || !form.gramsPerUnit) return;
    addMaterialConfig({
      productName: form.productName,
      productType: form.productType,
      gramsPerUnit: Number(form.gramsPerUnit),
    });
    resetForm();
  };

  const handleEdit = (config: MaterialConfig) => {
    setEditingId(config.id);
    setForm({
      productName: config.productName,
      productType: config.productType,
      gramsPerUnit: String(config.gramsPerUnit),
    });
  };

  const handleUpdate = () => {
    if (!editingId || !form.productName || !form.productType || !form.gramsPerUnit) return;
    updateMaterialConfig(editingId, {
      productName: form.productName,
      productType: form.productType,
      gramsPerUnit: Number(form.gramsPerUnit),
    });
    resetForm();
  };

  const renderFormRow = (onSave: () => void, namePlaceholder = "Ej: Lumbar") => (
    <>
      <TableCell>
        <Input
          placeholder={namePlaceholder}
          value={form.productName}
          onChange={(e) => setForm({ ...form, productName: e.target.value })}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Select value={form.productType} onValueChange={(v) => setForm({ ...form, productType: v })}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          min={1}
          placeholder="720"
          value={form.gramsPerUnit}
          onChange={(e) => setForm({ ...form, gramsPerUnit: e.target.value })}
          className="h-8 w-24 ml-auto text-right"
        />
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
            <Plus className="h-4 w-4 mr-1" />
            Agregar producto
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del producto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Consumo por unidad</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materialConfigs.map((config) =>
              editingId === config.id ? (
                <TableRow key={config.id}>{renderFormRow(handleUpdate)}</TableRow>
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
            {isAdding && <TableRow>{renderFormRow(handleAdd)}</TableRow>}
            {materialConfigs.length === 0 && !isAdding && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
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

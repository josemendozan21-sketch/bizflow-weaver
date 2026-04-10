

## Plan: Corregir descuento automático de inventario al crear pedidos

### Problema raíz identificado

Hay **3 bugs** que impiden el descuento correcto de inventario:

**Bug 1 — Diferencia de acentos en la referencia:**
El formulario genera `referencia = "Lumbar (Frío)"` (con tilde) desde `materialConfigs`, pero la tabla `body_stock` almacena `"Lumbar (Frio)"` (sin tilde). La comparación con `.includes()` falla porque `"frío" ≠ "frio"`, así que **nunca encuentra coincidencia** y siempre reporta `has_stock: false`.

Evidencia: Todas las production_orders en la DB tienen `has_stock: false` y `needs_cuerpos: true`, incluso para productos con stock disponible (ej: Lumbar Frio tiene 43 unidades).

**Bug 2 — `discountStock` usa estado local que puede estar vacío:**
La función `discountStock` (para descontar gel) busca en el array `stockItems` del hook, que depende de la suscripción realtime. Si los datos no han cargado aún, el array está vacío y no descuenta nada. A diferencia de `reserveBodyStock` (ya corregido para consultar directo a DB), `discountStock` nunca fue actualizado.

**Bug 3 — Datos de gel duplicados entre Zustand y DB:**
El panel de consumo de gel (`gelCalc`) lee del Zustand store (`zustandStockItems`) que tiene datos hardcodeados (15,000g), mientras la DB muestra `"Mezcla Gel"` con `available: 0`. Los dos sistemas están desincronizados.

### Cambios propuestos

#### 1. Normalizar acentos en la comparación de referencias
**Archivo:** `src/hooks/useInventory.ts` — función `reserveBodyStock`

Agregar una función de normalización que elimine acentos antes de comparar:
```typescript
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
```
Aplicarla en todas las comparaciones de referencia.

#### 2. Hacer que `discountStock` consulte directo a la DB
**Archivo:** `src/hooks/useInventory.ts` — función `discountStock`

Igual que se hizo con `reserveBodyStock`, hacer una consulta fresca a `stock_items` en vez de depender del estado local:
```typescript
const { data: freshItems } = await supabase
  .from("stock_items").select("*")
  .ilike("name", `%${itemName}%`);
```

#### 3. Hacer que `gelCalc` en el formulario lea de la DB
**Archivo:** `src/pages/Ventas.tsx` — `MagicalMayorForm`

Reemplazar la lectura del Zustand store para gel por los datos del hook `useInventory` (que ya trae `stockItems` desde Supabase), aplicando la misma normalización.

#### 4. Sincronizar los nombres de referencia
**Archivo:** `src/hooks/useInventory.ts`

Asegurar que la búsqueda de body_stock use normalización en todas las comparaciones (nombre de producto, tipo), para que `"Frío" == "Frio"`, `"Térmico" == "Termico"`, `"Círculo" == "Circulo"`.

### Archivos a modificar
- `src/hooks/useInventory.ts` — Normalización de acentos + `discountStock` con consulta fresca
- `src/pages/Ventas.tsx` — Leer gel desde hook DB en vez de Zustand

### Resultado esperado
Al crear un pedido de "Lumbar Frío, 1000 unidades":
1. Se encuentra correctamente el stock de cuerpos "Lumbar (Frio)" → se descuentan las 43 disponibles, se genera orden de producción por las 957 faltantes
2. Se descuenta el gel de la tabla `stock_items` en la DB
3. La production_order se crea con `has_stock` y `needs_cuerpos` correctos
4. Todo queda persistido y sincronizado entre Ventas, Producción e Inventarios


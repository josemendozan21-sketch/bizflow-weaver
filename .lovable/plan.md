
## Objetivo

Permitir que al **crear una feria** desde el diálogo "Nueva feria", el admin pueda seleccionar de una lista desplegable los productos de **Magical Warmers** y **Sweatspot** que necesita llevar, indicando la cantidad de cada uno. Estos productos quedarán automáticamente asignados al inventario de la feria.

## Cambios

### 1. `src/components/ferias/CreateFeriaDialog.tsx`

Agregar una nueva sección **"Productos a llevar"** debajo de "Materiales necesarios", con:

- Dos bloques colapsables: **Magical Warmers** y **Sweatspot**.
- Cada bloque muestra la lista de productos terminados disponibles (leídos del inventario vía `useInventory()`, filtrando `category === "producto_terminado"` por marca).
  - Magical: `nombre (Frío|Térmico)` — misma lógica que `FeriaInventoryTab`.
  - Sweatspot: `nombre - color` — misma lógica que `FeriaInventoryTab`.
- Para cada producto: un **checkbox** para seleccionarlo y un input numérico (cantidad) que aparece al marcarlo.
- Buscador (input) por marca para filtrar la lista cuando hay muchas referencias.
- También un input opcional de **precio unitario** por producto (para no tener que entrarlo después en el inventario).

Estado interno nuevo:
```ts
selectedProducts: Array<{ brand: "magical" | "sweatspot"; product_name: string; quantity: number; unit_price: number }>
```

### 2. Hook `useCreateFeria` en `src/hooks/useFerias.ts`

Extender la mutación para aceptar opcionalmente un array `initial_inventory` y, después de insertar la feria, hacer un `insert` masivo en `feria_inventory` con esos productos (`quantity_assigned`, `quantity_dispatched: 0`, `dispatch_status: "pendiente"`).

```ts
useCreateFeria.mutateAsync({
  ...feriaFields,
  initial_inventory: selectedProducts, // opcional
});
```

Si el insert de inventario falla, mostrar toast pero no eliminar la feria (la feria queda creada y se puede completar luego desde la pestaña Inventario).

### 3. Sin cambios de DB

Se reutiliza la tabla existente `feria_inventory`. No se requieren migraciones.

## Flujo del usuario

1. Admin abre "Nueva feria" desde `/ferias`.
2. Llena datos básicos, costos, materiales (igual que hoy).
3. En la nueva sección "Productos a llevar":
   - Expande "Magical Warmers", marca los productos deseados y digita cantidades/precios.
   - Hace lo mismo con "Sweatspot".
4. Al pulsar "Crear feria": se crea la feria **y** se cargan automáticamente los productos seleccionados en el inventario de la feria.
5. La pestaña **Inventario** de la feria ya muestra todo listo, y el admin/asesor puede pulsar "Enviar a logística" cuando quiera despachar.

## Notas técnicas

- Sin cambios en RLS (el admin ya puede insertar en `feria_inventory`).
- El diálogo de creación ya es scrollable (`max-h-[90vh] overflow-y-auto`), así que la sección extra no rompe el layout móvil.
- La lógica de etiquetado de productos (Frío/Térmico, color) se extraerá a un pequeño helper compartido para evitar duplicar entre `CreateFeriaDialog` y `FeriaInventoryTab`.

# Agregar nuevos moldes a Magical Warmers

Se añadirán 7 referencias nuevas siguiendo exactamente el mismo patrón de los moldes existentes (ej. Hueso, Gato).

## Moldes a agregar
1. Tiroides
2. Pie
3. Mano
4. Gota
5. Cerebro
6. Maxilofacial
7. Gorro quimioterapia

Cada uno se creará en sus dos variantes: **Frío** y **Térmico** (14 referencias en total).

## Cambios

### 1. Base de datos (`stock_items`)
Insertar para cada molde 4 filas (combinación de `product_type` × `category`):

| brand | name | product_type | category | available | min_stock |
|---|---|---|---|---|---|
| magical | {molde} | Frío | cuerpos_referencias | 0 | 10 |
| magical | {molde} | Térmico | cuerpos_referencias | 0 | 10 |
| magical | {molde} | Frío | producto_terminado | 0 | 5 |
| magical | {molde} | Térmico | producto_terminado | 0 | 5 |

Total: **28 filas nuevas** (7 moldes × 4 combinaciones). Mismos defaults que Hueso/Gato actuales.

### 2. Store local de inventario (`src/stores/inventoryStore.ts`)
Añadir 14 entradas nuevas en `INITIAL_CONFIGS` (Frío + Térmico para cada molde) con `gramsPerUnit: 0` (puede ajustarse después en la sección "Materiales" de Inventarios). Esto los hace seleccionables en el formulario de Ventas Magical, en producción (cuerpos), y en estampación.

### 3. Verificación automática
Ya **no** hay que tocar `Ventas.tsx` ni los componentes de producción: el formulario lee dinámicamente los nombres únicos desde `materialConfigs` (`productNames` en `MagicalMayorForm`), y producción/estampación leen desde `stock_items`. Al añadir las filas y las configs, los moldes aparecerán automáticamente.

## Detalles técnicos

- IDs en el store local: `34`/`34b` para Tiroides, `35`/`35b` Pie, `36`/`36b` Mano, `37`/`37b` Gota, `38`/`38b` Cerebro, `39`/`39b` Maxilofacial, `40`/`40b` Gorro quimioterapia.
- Las inserciones a BD se harán con la herramienta de inserción de datos (no migración) ya que solo es data, no schema.
- Si más adelante se conoce el peso exacto en gramos por unidad, podrá editarse desde **Inventarios → Materiales**.

## Archivos modificados
- `src/stores/inventoryStore.ts` (agregar 14 entradas en `INITIAL_CONFIGS`)
- BD: `INSERT` de 28 filas en `public.stock_items`

## Pregunta opcional
Si quieres que algún molde tenga un peso específico en gramos por unidad (gel) distinto de 0, dímelo antes de implementar. Si no, los dejo en 0 y los ajustas luego en Inventarios.

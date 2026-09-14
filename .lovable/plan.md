# Punto de la 92: catálogo limpio con Excel e historial de cambios

## Qué encontramos hoy (verificado en los datos)

El punto tiene 353 productos. Revisión real:

- 6 productos repetidos con el mismo nombre en marcas distintas: "Electro Carbs 22g", "Electro Carbs 500g", "Gel Escarabajos Electrolitos", "Gel Escarabajos Fruc/Café" e "Iso 55/1600 60g" aparecen a la vez en "Sweatspot" y "Sweatspot Nutrición"; "Short Dama" aparece en Morelife a $79.000 y en Tribaudi a $124.900.
- 2 productos sin marca.
- La marca "sweatspot" en minúscula existe aparte de "Sweatspot" (1 producto).

La limpieza la hará el propio punto usando el nuevo Excel; nosotros entregamos la herramienta y el control.

## 1. Plantilla de Excel para actualizar el catálogo

Botón "Descargar plantilla" en la pestaña Inventario del Punto de la 92. El archivo baja **con los 353 productos actuales ya cargados**, para que corrijan sobre lo que existe en vez de escribir desde cero.

Columnas:

| Columna | Qué es |
|---|---|
| Producto | Nombre exacto |
| Marca | Marca (lista desplegable con las marcas válidas) |
| Categoría | Categoría del producto |
| Precio de venta | En pesos, sin puntos ni símbolos |
| Existencias | Unidades reales en el punto |
| Unidad | und, par, etc. |
| Activo | SÍ / NO (NO oculta el producto sin borrar su historial) |

Hoja adicional "Instrucciones" con las reglas: no cambiar los títulos, una fila por producto, marcas permitidas, y qué pasa con cada columna.

## 2. Subida del archivo con vista previa

Botón "Subir Excel" junto a la plantilla. Antes de guardar nada se muestra un resumen de lo que va a pasar:

- Productos que se **actualizan** (con el antes → después de cada dato que cambia)
- Productos **nuevos** que se van a crear
- Productos **desactivados**
- Filas con **error** (precio no numérico, marca no válida, nombre vacío) — se listan y no se aplican

Un producto se reconoce por **nombre + marca**. Si esa combinación ya existe, se actualiza; si no, se crea uno nuevo. Así, corregir un duplicado es tan simple como poner la marca correcta en la fila buena y marcar la otra como "NO" en Activo.

Nada se guarda hasta que la persona confirma en pantalla.

## 3. Pestaña "Historial de cambios"

Nueva pestaña en el Punto de la 92, igual a la que ya existe en Inventarios:

- Tabla cronológica: quién, cuándo, qué producto, qué campo, valor anterior → valor nuevo.
- Filtros por fecha, persona, marca y tipo de acción (creación / edición / desactivación).
- Descarga a Excel del historial filtrado.
- Es de solo lectura: nadie puede editarla ni borrarla, venga el cambio del Excel, del formulario o del punto de venta.

## Detalle técnico

- **Migración**: tabla `public.pos_product_audit_log` (`id`, `location_id`, `product_id`, `action`, `product_name`, `brand`, `category`, `field`, `old_value`, `new_value`, `changed_by`, `changed_by_email`, `source` ['excel'|'manual'], `changed_at`), índices por `changed_at`, `location_id`, `product_id`. GRANT `SELECT` a `authenticated`, `ALL` a `service_role`; sin INSERT/UPDATE/DELETE para usuarios. RLS activa con lectura para `admin`, `contabilidad`, `inventarios` y los asignados al punto (`is_pos_for_location`). Escritura solo vía trigger `SECURITY DEFINER` `AFTER INSERT/UPDATE/DELETE` sobre `pos_products`, una fila por campo cambiado (`name`, `brand`, `category`, `sale_price`, `available`, `unit`, `active`, `min_stock`).
- **Frontend**: `src/lib/posCatalogTemplate.ts` (generar plantilla y parsear archivo con `xlsx`, ya instalado); `src/components/puntos-venta/PosCatalogBulkUpdate.tsx` siguiendo el patrón de `FeriaBulkSalesUpload.tsx` (descargar / subir / preview / confirmar); montado dentro de `PuntoInventario.tsx` detrás de `canEdit`.
- **Historial**: hook `usePosProductAuditLog.ts` + `PosProductChangeLogPanel.tsx` reutilizando `@/components/shared/ChangeLogPanel`; nueva pestaña en `src/pages/PuntosVenta.tsx`.
- Upsert por lotes con `useUpsertPosProduct` existente; el match nombre+marca se hace normalizando mayúsculas y espacios.
- No se toca la lógica de ventas, entradas ni los movimientos de inventario existentes.

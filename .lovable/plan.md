## Objetivo
Actualizar el catálogo del punto de venta **Sweatspot 92** (única sede POS) con nuevos productos y ajustes de precio.

## Productos nuevos a crear
| Marca | Producto | Precio venta | Costo |
|---|---|---|---|
| Sweatspot Nutrición | Gomas Energy | 15.000 | 0 (no indicado) |
| Sweatspot Nutrición | Beta Fuel - Strawberry & Lima | 17.500 | 0 (no indicado) |
| Sweatspot Nutrición | SIS Disco Hydro Electrolyte - Pineapple & Mango | 72.000 | 52.000 |
| Sweatspot | Chaleco Rojo M/L | 140.000 | 50.000 |
| IT Socks | Gorra IT Socks | 58.000 | 38.000 |

Todos se crean con existencia inicial 0, unidad "unidades" y activos, para que aparezcan tanto en Inventario como en la pantalla de Vender.

## Ajustes sobre productos existentes
- **Beta Fuel Nootropics** (hoy $15.000) → $17.500.
- **Beta Fuel Nootropics - Lemon & Lime** (hoy $15.000) → $17.500. Existen ambos registros; se actualizan los dos salvo que indiques lo contrario.
- **MEDIAS MORELIFE** ya existe en la marca Morelife con precio $0 → se actualiza a precio de venta $35.500 y costo $26.296 (no se crea duplicado).

## Detalles técnicos
Cambios solo de datos en la tabla `pos_products` (columnas `name`, `brand`, `sale_price`, `avg_cost`, `location_id`, `available`, `unit`, `active`). No se modifica código ni esquema.

## Pendiente por confirmar
Eliana también mencionó "quitar los ítems de Sweat Spot Nutrition que están con precios más bajos" — eso no está incluido aquí. Hay varios ítems con precios bajos o en $0 (ELECTRO CARBS 22G duplicados, geles en $0, etc.). Si quieres, en un segundo paso te paso la lista exacta para desactivarlos.

# Etiquetar referencias con tipo (Frío/Térmico) en los selectores de inventario

## Problema

En Inventarios → Bandeja de pedidos → "Entregar a Logística", el desplegable "Selecciona producto en inventario" muestra solo el nombre y la cantidad ("Pocket · disp. 22", "Pocket · disp. 57"). Como cada referencia existe en versión Frío y Térmico (y en Sweatspot además por color y con/sin logo), aparecen entradas duplicadas y la única forma de distinguirlas hoy es adivinar por el número de disponibles.

## Qué se va a hacer

1. **Etiqueta unificada de referencia**
   Reutilizar el componente/utilidad de catálogo que ya existe (`ReferenceLabel` / `referenceCatalog`) para armar una etiqueta consistente en todos los selectores:
   `Pocket · ❄️ Frío · disp. 22` / `Pocket · 🔥 Térmico · disp. 57`
   Para Sweatspot se añaden los atributos que ya distinguen sus variantes: color, CON/SIN LOGO y categoría.

2. **Selector de "Entregar a Logística"**
   - Mostrar la etiqueta completa en cada opción (nombre, tipo, color, logo, disponible).
   - Resaltar el tipo con el mismo badge ❄️/🔥 que ya usa la vista de inventario del asesor, para que sea coherente en toda la app.
   - Marcar visualmente las opciones sin stock (disp. 0) para que no se escojan por error.
   - **Preselección automática**: la línea del pedido ya trae el tipo en su texto (ej. "Pocket (Térmico)"). Cuando exista una única coincidencia por marca + referencia + tipo, el desplegable queda preseleccionado; si hay varias (p. ej. distintos colores), se deja sin seleccionar pero filtradas/ordenadas primero las que coinciden con el tipo del pedido.
   - Añadir buscador dentro del desplegable cuando la lista sea larga.

3. **Consistencia en el resto de selectores**
   Aplicar la misma etiqueta en los otros puntos donde hoy solo se ve el nombre:
   - `RegisterMovementDialog` (registrar movimiento)
   - `QuickMovementForm` (movimiento rápido)
   - `InventoryTraceabilityPanel` (ya muestra tipo; se homogeneiza el formato)

4. **Relación con el backend**
   No cambia el esquema. El tipo se sigue leyendo de `stock_items.product_type` (y color / logo / categoría Sweatspot de sus columnas), que es la fuente única del catálogo; el descuento de inventario sigue funcionando exactamente igual al confirmar.

## Detalles técnicos

- Nuevo helper de formato (p. ej. `formatStockOptionLabel`) en `src/lib/referenceCatalog.ts`, usado por todos los selectores para evitar divergencias.
- En `WholesaleOrdersInbox.tsx`: la opción pasa a renderizar nombre + `TypeBadge` + color/logo + disponibles; se agrega lógica de coincidencia que normaliza acentos y extrae el tipo del texto de la línea del pedido para preseleccionar.
- Sin cambios en mutaciones, RPC ni triggers.

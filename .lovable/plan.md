# Unificar el catálogo de referencias (Magical y Sweatspot)

## Qué está pasando

Hoy conviven dos fuentes de datos para las mismas referencias:

- `stock_items` (categoría "Cuerpos"): guarda el nombre limpio ("Antifaz") y el tipo en un campo aparte ("Frío" / "Térmico"). Es lo que usa la pantalla de Ventas cuando el asesor sube un pedido.
- `body_stock`: guarda el nombre con el sufijo pegado ("Antifaz (Frío)"). Es lo que muestra la pestaña Inventarios del asesor (la captura enviada), por eso se ve "Antifaz (Frío)" y además una columna "Tipo" repitiendo lo mismo.

Resultado: nombres distintos para el mismo producto según el área, y listas que no coinciden entre Inventarios y Ventas.

## Solución: un único componente/fuente de referencias

Crear un módulo compartido de catálogo de referencias que todas las áreas consuman, en lugar de que cada pantalla arme su propia lista.

1. **Fuente única**: `stock_items` es la referencia canónica (nombre + tipo + marca + marcado/sin marcar + disponible). `body_stock` queda solo como espejo interno de producción, nunca como origen de lo que se muestra o se elige.
2. **Catálogo compartido** (`useReferenceCatalog`): entrega la lista canónica ya normalizada y deduplicada, con filtros por marca, categoría y tipo, más el nombre siempre limpio (sin sufijo) y el tipo como dato separado.
3. **Componentes reutilizables**:
   - Etiqueta de referencia: muestra nombre + badge de tipo (Frío/Térmico) + marcado/sin marcar, igual en todas las áreas.
   - Selector de referencia: dropdown único (nombre) + campo de tipo, con búsqueda insensible a tildes/mayúsculas; se usa en Ventas, Inventarios y solicitudes.

## Dónde se aplica

- Pestaña Inventarios del asesor: pasa a leer el catálogo unificado; la columna Referencia mostrará "Antifaz" y el tipo solo en su columna, con los mismos disponibles que ve Inventarios.
- Formularios de venta de Magical (mayor y detal) y Sweatspot: usan el mismo selector y la misma lista.
- Paneles de Inventarios (categorizado, rol inventarios, solicitudes, movimientos, trazabilidad) y vistas de Producción/Estampación donde hoy se imprime la referencia con sufijo.
- Exportaciones a Excel: misma nomenclatura (columnas Referencia y Tipo separadas).

## Detalles técnicos

- Nuevo `src/lib/referenceCatalog.ts`: normalización (quitar sufijo, unificar Frio/Frío/Calor→Térmico), clave canónica `marca|nombre|tipo|logo`, y merge de duplicados sumando/priorizando `stock_items`.
- Nuevo `src/hooks/useReferenceCatalog.ts` construido sobre `useInventory` (mantiene realtime).
- Nuevos `src/components/inventory/ReferenceLabel.tsx` y `ReferenceSelect.tsx`.
- Refactor de `AsesorInventoryView.tsx` (deja de usar `bodyStock`), `Ventas.tsx`, y los paneles listados arriba para consumir el catálogo.
- Sin cambios de esquema ni de lógica de descuento de inventario; los triggers espejo `stock_items` ↔ `body_stock` siguen igual.
- Verificación: chequeo de tipos y revisión en el navegador de Inventarios (asesor) vs. formulario de Ventas para confirmar que las listas coinciden.

## Fuera de alcance (proponer aparte)

Existe una desviación histórica de cantidades entre `stock_items` y `body_stock` (26 referencias con diferencias). Este plan unifica nombres y listas; la reconciliación de cantidades requiere decidir cuál conteo es el físicamente correcto.

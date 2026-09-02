# Diferenciar Frío / Térmico en la vista de inventario del asesor

## Problema

En la pestaña Inventarios del asesor (Magical Warmers > Producto Terminado) las referencias aparecen duplicadas — "Pocket 22" y "Pocket 57", "Senos", "Shoulder", "Tiroides" — sin ninguna señal de cuál es Frío y cuál Térmico. La tabla solo muestra Producto, Disponible, Unidad y Estado, así que las dos variantes son indistinguibles.

## Cambios

1. **Nueva columna Tipo** en la tabla de Producto Terminado de Magical, con el mismo distintivo visual que ya se usa en Cuerpos: ❄️ Frío / 🔥 Térmico, y "—" cuando la referencia no tiene tipo.
2. **Nombre + tipo en una sola etiqueta** reutilizando el componente compartido de referencia, para que el asesor lo lea igual en Cuerpos, Producto Terminado y Ventas.
3. **Filtro de tipo visible y funcional** en la pestaña Producto Terminado: botones/segmentos Todos · ❄️ Frío · 🔥 Térmico junto al buscador, con el conteo de resultados a la vista.
4. **Buscador que también reconoce el tipo**: escribir "pocket frío" filtra correctamente.
5. En Cuerpos se mantiene la columna Tipo, pero se muestra con el mismo badge de color en vez de texto plano, para que ambas pestañas se vean consistentes.

## Detalles técnicos

- Único archivo tocado: `src/components/inventory/AsesorInventoryView.tsx`.
- El tipo ya viene resuelto en el catálogo unificado (`ReferenceItem.tipo`, derivado de `product_type` o del sufijo del nombre), así que no hace falta cambio de datos ni de esquema.
- El filtro de tipo ya existe en `FiltersBar`; se ajusta el filtrado de Producto Terminado para que use `tipo` y para que la búsqueda incluya el tipo en el texto normalizado.
- Se usa `ReferenceLabel` para nombre + badge de tipo.
- Verificación: chequeo de tipos y revisión en el navegador de la pestaña Inventarios del asesor (Magical: Cuerpos y Producto Terminado).

## Fuera de alcance

Los duplicados de Sweatspot ya se diferencian por Color/Logo/Origen; no se toca esa tabla.
